# Agri Vest — Ledger Core

The money engine for the Agri Vest platform: a **double-entry, append-only
ledger** plus the agri-specific operations (deposit, invest, milestone
disburse, sponsor return, pro-rata payout, cooling-off refund, withdraw) and
the reconciliation checks an operator runs to trust the books.

Framework-free TypeScript so it drops into a NestJS service unchanged. It is
the real thing the M-Pesa flow and the sponsor escrow in the UX prototype were
standing in for.

## Run it
```bash
npm install
npm test          # 11 tests — engine invariants + full lifecycle
npx tsx demo.ts   # narrated pooled-investment walkthrough
```

## Non-negotiable invariants (all tested)
1. **Money is integer minor units (cents).** Floats never touch a balance.
2. **Every entry balances** — postings sum to exactly zero (debits = credits),
   so the whole ledger always nets to zero.
3. **Balances are derived, never stored** as a mutable field — a balance is the
   sum of an account's postings.
4. **Append-only.** Entries and their postings are frozen; corrections happen
   only via reversing entries.
5. **Idempotent.** A given external `ref` (e.g. an M-Pesa receipt) posts at most
   once — replayed callbacks can't double-credit.
6. **No overdraft** of any custody account (wallet / escrow / returns).
7. **Pro-rata payouts are exact** — the largest-remainder split distributes a
   pool across pooled investors with no cent created or lost.
8. **48-hour cooling-off** — the CMA-mandated penalty-free exit, one-shot.

## Chart of accounts (custodial model)
| Account | Type | Meaning |
|---|---|---|
| `mpesa_clearing` | ASSET | cash held at the custodian / in settlement |
| `wallet:{userId}` | LIABILITY | funds the platform owes an investor |
| `escrow:{projectId}` | LIABILITY | committed funds held for a project's raise |
| `returns:{projectId}` | LIABILITY | sponsor repayments owed to that project's investors |
| `platform_fees` | INCOME | platform revenue (origination / carry) |

Each operation is one balanced journal entry. A posting amount is **signed**:
`+` = debit, `−` = credit. Example — *invest* moves a wallet liability into an
escrow liability: `debit wallet:user, credit escrow:project`.

## How the lifecycle conserves money
Deposit (cash in) → invest (wallet→escrow) → disburse (escrow→sponsor, cash
out) → return (cash in→returns pool) → carry fee (returns→income) → payout
(returns→wallets). At the end, **Assets = Liabilities + Income**, the ledger
nets to zero, and cash on hand matches the custodian statement. The demo prints
this at every step.

## Mapping to the design doc
- §4.4 *Ledger & fund custody* — this module is that ledger; segregated custody
  is modelled as separate `escrow:*` liability accounts released only on
  disburse.
- §2.5 *Secondary liquidity* — `refundCoolingOff` implements the 48h window;
  there is deliberately no other early-exit path.
- §2.2 *Return models* — fixed/revenue-share/harvest all reduce to the same
  primitives (`recordReturn` + `payoutProRata`); equity would add a
  distributions schedule on top.

## Postgres schema (production target)
```sql
CREATE TABLE journal_entry (
  id        BIGSERIAL PRIMARY KEY,
  ts        TIMESTAMPTZ NOT NULL DEFAULT now(),
  kind      TEXT NOT NULL,
  ref       TEXT UNIQUE,                       -- idempotency (M-Pesa receipt, op key)
  reverses  BIGINT REFERENCES journal_entry(id),
  meta      JSONB
);
CREATE TABLE posting (
  id        BIGSERIAL PRIMARY KEY,
  entry_id  BIGINT NOT NULL REFERENCES journal_entry(id),
  account   TEXT  NOT NULL,
  amount    BIGINT NOT NULL                    -- signed minor units (+debit / -credit)
);
CREATE INDEX ON posting (account);

-- entries must balance: deferred constraint trigger asserts SUM(amount)=0 per entry.
-- append-only: REVOKE UPDATE, DELETE on both tables; corrections are reversing entries.
-- balances: SUM(amount) over posting, or a transactionally-updated account_balance rollup.
```

## NestJS / concurrency notes
- Wrap each operation in **one SERIALIZABLE transaction** (or `SELECT ... FOR
  UPDATE` on the wallet's balance row). The invest/withdraw guards do a
  read-then-write, so without isolation two concurrent requests could both pass
  the "enough funds?" check and overdraw. Isolation closes that race.
- `ref UNIQUE` makes M-Pesa callback retries safe at the database level; the
  in-memory `IdempotencyError` here mirrors that.
- The custodian/M-Pesa reconciliation job calls `assertInvariants` +
  `reconcileExternal(statementTotal)` on a schedule and alerts on any drift —
  this is what the CMA monthly reporting leans on.

## Not included (next layers)
KYC/AML, auth, the M-Pesa Daraja adapter (STK push / B2C), notifications, and
the HTTP API. Those wrap this core; they don't change it.
