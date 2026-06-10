# Agri Vest — Deliverables Index

Everything built for the Agri Vest agricultural investment platform, in the
order it was created. Start with whichever matches what you need.

## 1. Design & planning
- **`upeo-design-prompt.md`** — the reusable brief that generated the design.
- **`upeo-design.md`** — full product + architecture design: personas, ROI
  and risk mechanics, solo vs. pooled, UX, full-stack architecture, the Kenyan
  CMA regulatory posture, MVP scope, and open questions.

## 2. UX prototype
- **`UpeoComplete.jsx`** — the finished single-file app: every flow plus a
  *working in-memory double-entry ledger* (deposit→wallet, invest→escrow,
  cooling-off refund, sponsor return→pro-rata payout) and a live "Ledger engine"
  view. Self-contained; open in the artifact viewer or any React project.
- **`UpeoPrototype.jsx`** — the earlier interactive prototype.
  Onboarding/KYC → discover → project detail (with honest expected/downside +
  "what if it fails") → pooled invest → M-Pesa → portfolio, plus a sponsor
  dashboard and EN↔SW toggle. Open it in the artifact viewer, or drop into any
  React/Vite project.

## 3. Backend monorepo — `upeo/`
Correctness-first backend. **31 automated tests pass.** See `upeo/README.md`
for the full continuation guide (setup, env, free-tier deploy, M-Pesa sandbox).

| Package | What | Tests |
|---|---|---|
| `packages/ledger` | Double-entry append-only ledger + Postgres layer + M-Pesa Daraja adapter | 22 |
| `packages/marketplace` | Sponsors, projects, funding read live from the ledger | 3 |
| `packages/api` | NestJS API: auth (OTP→JWT), wallet, invest, M-Pesa webhooks, KYC | **6 (e2e)** |

```bash
cd upeo
npm install
npm test                 # 25 passing
npm run demo -w @upeo/ledger
```

## What's solid vs. what's next
- **Solid (tested):** the money engine, Postgres invariants, M-Pesa
  deposit/withdraw idempotency, marketplace funding cross-check.
- **Code-complete, not integration-tested here:** the NestJS API (boots and
  maps all routes, but needs verifying against your own Postgres + Safaricom
  sandbox).
- **Next:** sponsor onboarding UI, notifications, live Daraja + multi-connection
  concurrency test, and wiring the prototype to the API.

> Not legal/financial advice. Running this as a real platform in Kenya requires
> CMA licensing (Investment-Based Crowdfunding Regulations, 2022), a custodian,
> and the capital thresholds in the design doc.
