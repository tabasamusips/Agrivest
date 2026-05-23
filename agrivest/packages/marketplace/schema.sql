-- ============================================================
--  Agri Vest marketplace — sponsors, projects, updates.
--  Funding progress is NOT stored here; it is read live from the
--  ledger (escrow balance + investment count), so the catalogue and
--  the money can never disagree.
-- ============================================================

CREATE TABLE IF NOT EXISTS sponsor (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  cycles      INT  NOT NULL DEFAULT 0,
  on_time     INT  NOT NULL DEFAULT 0,
  rating      NUMERIC(2,1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project (
  id            TEXT PRIMARY KEY,            -- slug; also the ledger escrow suffix (escrow:{id})
  sponsor_id    TEXT NOT NULL REFERENCES sponsor(id),
  title         TEXT NOT NULL,
  venture       TEXT NOT NULL,               -- poultry | fish | horticulture | dairy | bees | greenhouse
  location      TEXT NOT NULL,
  return_model  TEXT NOT NULL,               -- fixed | revenue_share | harvest | equity
  grade         TEXT,                        -- A..E, set at underwriting
  expected_pct  NUMERIC,                     -- projected return
  downside_pct  NUMERIC,                     -- honest downside scenario
  cycle_months  INT NOT NULL,
  min_cents     BIGINT NOT NULL,
  target_cents  BIGINT NOT NULL CHECK (target_cents <= 10000000000), -- KES 100M issuer cap
  blurb         TEXT,
  status        TEXT NOT NULL DEFAULT 'underwriting', -- underwriting|funding|active|harvest|closed|failed
  opened_at     TIMESTAMPTZ,
  closes_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_status_idx ON project(status);

CREATE TABLE IF NOT EXISTS project_update (
  id          BIGSERIAL PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES project(id),
  ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
  body        TEXT NOT NULL,
  has_photo   BOOLEAN NOT NULL DEFAULT false   -- photo-backed evidence (required before milestone release)
);
CREATE INDEX IF NOT EXISTS project_update_idx ON project_update(project_id, ts DESC);
