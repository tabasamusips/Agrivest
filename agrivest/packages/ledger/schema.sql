-- ============================================================
--  Agri Vest ledger — Postgres schema
--  Double-entry, append-only, with invariants enforced IN THE DB
--  so the books are trustworthy regardless of the application.
-- ============================================================

CREATE TABLE IF NOT EXISTS journal_entry (
  id        BIGSERIAL PRIMARY KEY,
  ts        TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind      TEXT NOT NULL,
  ref       TEXT UNIQUE,                          -- idempotency (M-Pesa receipt / op key)
  reverses  BIGINT REFERENCES journal_entry(id),
  meta      JSONB
);

CREATE TABLE IF NOT EXISTS posting (
  id        BIGSERIAL PRIMARY KEY,
  entry_id  BIGINT NOT NULL REFERENCES journal_entry(id),
  account   TEXT   NOT NULL,
  amount    BIGINT NOT NULL                       -- signed minor units (+debit / -credit)
);
CREATE INDEX IF NOT EXISTS posting_account_idx ON posting(account);
CREATE INDEX IF NOT EXISTS posting_entry_idx   ON posting(entry_id);

-- Fast balance reads: transactionally-maintained signed running sum per account.
CREATE TABLE IF NOT EXISTS account_balance (
  account TEXT PRIMARY KEY,
  raw     BIGINT NOT NULL DEFAULT 0
);

-- Investments registry: powers the 48h cooling-off window and payout weights.
CREATE TABLE IF NOT EXISTS investment (
  entry_id BIGINT PRIMARY KEY REFERENCES journal_entry(id),
  investor TEXT NOT NULL,
  project  TEXT NOT NULL,
  amount   BIGINT NOT NULL,
  ts       TIMESTAMPTZ NOT NULL,
  status   TEXT NOT NULL DEFAULT 'active'         -- active | refunded
);
CREATE INDEX IF NOT EXISTS investment_project_idx ON investment(project, status);

-- ---- Invariant 1: maintain the balance rollup on every posting ----
CREATE OR REPLACE FUNCTION posting_rollup() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO account_balance(account, raw) VALUES (NEW.account, NEW.amount)
  ON CONFLICT (account) DO UPDATE SET raw = account_balance.raw + EXCLUDED.raw;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posting_rollup_t ON posting;
CREATE TRIGGER posting_rollup_t AFTER INSERT ON posting
  FOR EACH ROW EXECUTE FUNCTION posting_rollup();

-- ---- Invariant 2: every entry must balance to zero (checked at COMMIT) ----
CREATE OR REPLACE FUNCTION entry_balances() RETURNS TRIGGER AS $$
DECLARE s BIGINT;
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO s FROM posting WHERE entry_id = NEW.entry_id;
  IF s <> 0 THEN
    RAISE EXCEPTION 'unbalanced entry %: postings sum to %', NEW.entry_id, s;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS entry_balances_t ON posting;
CREATE CONSTRAINT TRIGGER entry_balances_t AFTER INSERT ON posting
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION entry_balances();

-- ---- Invariant 3: append-only — forbid UPDATE/DELETE on ledger tables ----
CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ledger is append-only: % on % is forbidden', TG_OP, TG_TABLE_NAME;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS no_mutate_entry ON journal_entry;
CREATE TRIGGER no_mutate_entry BEFORE UPDATE OR DELETE ON journal_entry
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
DROP TRIGGER IF EXISTS no_mutate_posting ON posting;
CREATE TRIGGER no_mutate_posting BEFORE UPDATE OR DELETE ON posting
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- ---- M-Pesa payment intents (deposits via STK push, payouts via B2C) ----
CREATE TABLE IF NOT EXISTS payment_intent (
  id          TEXT PRIMARY KEY,          -- CheckoutRequestID (STK) or OriginatorConversationID (B2C)
  kind        TEXT NOT NULL,             -- deposit | withdrawal
  account_ref TEXT NOT NULL,             -- userId
  amount      BIGINT NOT NULL,           -- minor units (cents)
  phone       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | completed | failed
  receipt     TEXT,                      -- M-Pesa receipt once confirmed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
