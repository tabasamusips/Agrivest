# Agri Vest

A mobile-first **agricultural investment platform** for Kenya & East Africa —
Ndovu's accessibility applied to real agri ventures (farming, livestock, fish,
beekeeping, horticulture…), with honestly-graded risk and transparent
harvest-cycle returns. Investors participate **solo** or **pooled** from
KES 500.

This repo is the **backend**: a correctness-first ledger, the M-Pesa money
rails, and a NestJS API. The UX prototype and the product/architecture design
live as separate documents (see *Related artifacts* below).

---

## What's in here (and what works today)

| Layer | Status | Where |
|---|---|---|
| Double-entry, append-only **ledger** (invest, escrow, payout, cooling-off) | ✅ built + tested | `packages/ledger/src` |
| **Postgres** persistence with DB-enforced invariants | ✅ built + tested (PGlite) | `packages/ledger/schema.sql`, `src/pg.ts` |
| **M-Pesa Daraja** adapter (STK push deposits, B2C payouts, idempotent callbacks) | ✅ built + tested | `packages/ledger/src/mpesa` |
| **NestJS API** (auth, wallet, invest, M-Pesa webhooks) | ✅ built + **end-to-end tested** (PGlite-backed) | `packages/api/src` |
| **Marketplace** (sponsors, projects, live funding read from the ledger) | ✅ built + tested | `packages/marketplace` |
| **KYC guard + verify flow** on invest routes | ✅ built + e2e-tested | `packages/api/src/auth` |
| Sponsor onboarding UI, notifications (SMS/push) | ⛔ not started | — |

**31 automated tests pass** (ledger 22 · marketplace 3 · API e2e 6) (`npm test`). The ledger correctness is the part
you can fully trust; the API is code-complete and boots, but wiring it to a real
Postgres + Safaricom sandbox is the first thing to verify on your device.
---

## Project structure
```
agrivest/
├─ package.json              # npm workspaces root
├─ .env.example              # copy to .env and fill in
├─ packages/
│  ├─ ledger/                # @agrivest/ledger  (the money engine — CommonJS)
│  │  ├─ schema.sql          # Postgres DDL + invariant triggers
│  │  ├─ src/
│  │  │  ├─ money.ts         # integer-cents money type
│  │  │  ├─ types.ts         # chart of accounts + journal shapes
│  │  │  ├─ ledger.ts        # in-memory double-entry engine
│  │  │  ├─ service.ts       # AgriVest ops (in-memory)
│  │  │  ├─ prorata.ts       # exact largest-remainder split
│  │  │  ├─ reconcile.ts     # invariant checks
│  │  │  ├─ db.ts            # portable Queryable (pg + PGlite), migrate, withTx
│  │  │  ├─ pg.ts            # PgAgriVest — Postgres-backed ops + advisory locks
│  │  │  └─ mpesa/           # Daraja client, helpers, PaymentsService
│  │  ├─ test/               # 22 tests (engine, Postgres, M-Pesa)
│  │  ├─ demo.ts             # narrated lifecycle: npm run demo
│  │  ├─ README.md           # ledger deep-dive
│  │  └─ PERSISTENCE.md      # Postgres layer deep-dive
│  ├─ marketplace/           # @agrivest/marketplace  (sponsors, projects, funding)
│  │  ├─ schema.sql          # sponsor / project / project_update tables
│  │  ├─ src/marketplace.ts  # MarketplaceService (funding read live from ledger)
│  │  └─ test/
│  └─ api/                   # @agrivest/api  (NestJS — depends on ledger + marketplace)
│     └─ src/
│        ├─ main.ts          # bootstrap
│        ├─ app.module.ts
│        ├─ ledger/          # pg Pool provider + per-request client helper
│        ├─ auth/            # phone OTP -> JWT, AuthGuard
│        ├─ wallet/          # balance, deposit (STK), withdraw (B2C)
│        ├─ invest/          # pooled/solo invest, cooling-off cancel
│        ├─ mpesa/           # public Daraja webhooks
│        └─ projects/        # marketplace catalogue (stub)
```

---

## Quick start

**Prerequisites:** Node 20+ and a Postgres database. On a free tier, the
easiest is a serverless Postgres from **[Neon](https://neon.tech)** or
**[Supabase](https://supabase.com)** — create a DB, copy the connection string.

```bash
# 1. install everything (npm workspaces)
npm install

# 2. run the test suites
npm test                       # ledger + marketplace (25)
npm run test:e2e -w @agrivest/api   # full API end-to-end (6)

# 3. see the narrated lifecycle
npm run demo -w @agrivest/ledger

# 4. configure
cp .env.example .env           # fill in DATABASE_URL + JWT_SECRET (M-Pesa later)

# 5. create the schema in your Postgres
#    psql "$DATABASE_URL" -f packages/ledger/schema.sql
#    psql "$DATABASE_URL" -f packages/marketplace/schema.sql
#    psql "$DATABASE_URL" -f packages/api/sql/auth.sql

# 6. build + run the API
npm run build
npm run dev:api                # http://localhost:3000
```

---

## API endpoints
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/request-otp` | – | send OTP (dev mode returns it as `devOtp`) |
| POST | `/auth/verify-otp` | – | exchange OTP for a JWT |
| POST | `/auth/complete-kyc` | JWT | mark KYC verified (sandbox) |
| GET  | `/wallet/balance` | JWT | wallet balance (cents) |
| POST | `/wallet/deposit` | JWT | start an M-Pesa STK push deposit |
| POST | `/wallet/withdraw` | JWT | B2C withdrawal to phone |
| POST | `/invest/:projectId` | JWT + **KYC** | invest (solo or pooled) |
| POST | `/invest/cancel/:entryId` | JWT | 48h cooling-off refund |
| GET  | `/projects` · `/projects/:id` | – | marketplace catalogue (live funding) |
| POST | `/projects` | JWT | sponsor submits a venture (→ underwriting) |
| POST | `/projects/:id/updates` | JWT | post a (photo-backed) progress update |
| POST | `/admin/projects/:id/approve` | JWT* | underwriting: set grade + terms, open funding |
| POST | `/mpesa/stk-callback` | – | Daraja deposit callback |
| POST | `/mpesa/b2c-result` · `/mpesa/b2c-timeout` | – | Daraja payout callbacks |

Money is always **integer minor units (cents)** at the API boundary.

---

## M-Pesa Daraja setup
1. Create an app at **developer.safaricom.co.ke** → get Consumer Key/Secret.
2. For deposits (STK push) use the sandbox **Lipa na M-Pesa** shortcode `174379`
   and the portal's test passkey. Fill `MPESA_*` in `.env`.
3. Callbacks need a **public HTTPS URL**. Locally, tunnel with
   `ngrok http 3000` and set `PUBLIC_URL` to the ngrok URL. In the cloud, use
   your deployed URL.
4. The **M-Pesa receipt is used as the ledger idempotency key**, so Daraja's
   automatic callback retries can never double-credit a deposit.

---

## Deploying on free tiers
- **Database:** Neon / Supabase (free Postgres). Put the URL in `DATABASE_URL`.
- **API:** Render, Railway, or Fly.io free tier. Build `npm run build`, start
  `node packages/api/dist/main.js`. Set all env vars; set `PUBLIC_URL` to the
  service's public URL so M-Pesa callbacks reach `/mpesa/*`.
- **Schema:** run `packages/ledger/schema.sql` against the DB once.

---

## Design decisions worth keeping (don't undo these)
- **Money is integer cents; balances are derived from postings, never stored**
  as a mutable number. Every entry sums to zero.
- **Invariants are enforced in the database** (balance trigger, append-only
  trigger, `UNIQUE(ref)`), not just the app — so the books hold regardless of
  what writes to them.
- **One transaction + per-account advisory lock** per money operation, so
  concurrent requests can't double-spend. ⚠️ The parallel race is *not* covered
  by the PGlite tests (single connection) — exercise it against a real
  multi-connection Postgres in CI.
- **48-hour cooling-off** is the only early exit (a CMA requirement).
- Honest returns: the product never promises a guaranteed return; the UI shows
  expected **and** downside.

---

## Roadmap (suggested order)
1. ~~Verify the API end-to-end~~ ✅ done (PGlite e2e). Next: run the same flow
   against your Neon DB + a *live* Daraja sandbox (real STK push to a phone).
2. ~~Marketplace tables + service~~ ✅ done (`@agrivest/marketplace`).
3. ~~KYC guard on invest routes~~ ✅ wired — now add the verify flow that sets
   `kyc.status = 'verified'` (ID + liveness, per the prototype onboarding).
4. **Sponsor onboarding UI** + richer underwriting workflow on top of the
   marketplace service.
5. **Notifications** (SMS + push) for funding milestones, payouts, cooling-off.
6. **Concurrency test** against real Postgres; load test the advisory-lock path.
7. Wire the **UX prototype** to these endpoints (auth → projects → invest → wallet).

---

## Related artifacts (separate files from this build)
- `agrivest-design.md` — full product + architecture design.
- `agrivest-design-prompt.md` — the reusable brief that generated it.
- `AgriVestPrototype.jsx` — the interactive mobile UX prototype.

> Not legal/financial advice. Operating this as a real investment platform in
> Kenya requires CMA licensing (Investment-Based Crowdfunding Regulations, 2022),
> a custodian, and the capital thresholds noted in the design doc. Resolve those
> with a licensed advocate before taking public money.
