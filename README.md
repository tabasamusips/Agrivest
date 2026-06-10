# Agri Vest

A mobile-first **agricultural investment platform** for Kenya & East Africa —
Ndovu's accessibility applied to real agri ventures (farming, livestock, fish,
beekeeping, horticulture…), with honestly-graded risk and transparent
harvest-cycle returns. Investors participate **solo** or **pooled** from
KES 500.

This repo is the **backend**: a correctness-first ledger, the M-Pesa money
rails, and a NestJS API. The UX prototype and the product/architecture design
live as separate documents (see _Related artifacts_ below).

---

## What's in here (and what works today)

| Layer                                                                            | Status                                           | Where                                     |
| -------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------- |
| Double-entry, append-only **ledger** (invest, escrow, payout, cooling-off)       | ✅ built + tested                                | `packages/ledger/src`                     |
| **Postgres** persistence with DB-enforced invariants                             | ✅ built + tested (PGlite)                       | `packages/ledger/schema.sql`, `src/pg.ts` |
| **M-Pesa Daraja** adapter (STK push deposits, B2C payouts, idempotent callbacks) | ✅ built + tested                                | `packages/ledger/src/mpesa`               |
| **NestJS API** (auth, wallet, invest, M-Pesa webhooks)                           | ✅ built + **end-to-end tested** (PGlite-backed) | `packages/api/src`                        |
| **Marketplace** (sponsors, projects, live funding read from the ledger)          | ✅ built + tested                                | `packages/marketplace`                    |
| **KYC guard + verify flow** on invest routes                                     | ✅ built + e2e-tested                            | `packages/api/src/auth`                   |
| Sponsor onboarding UI, notifications (SMS/push)                                  | ⛔ not started                                   | —                                         |

**31 automated tests pass** (ledger 22 · marketplace 3 · API e2e 6) (`npm test`). The ledger correctness is the part
you can fully trust; the API is code-complete and boots, but wiring it to a real
Postgres + Safaricom sandbox is the first thing to verify on your device.

---

## Project structure

```
upeo/
├─ package.json              # npm workspaces root
├─ .env.example              # copy to .env and fill in
├─ packages/
│  ├─ ledger/                # @upeo/ledger  (the money engine — CommonJS)
│  │  ├─ schema.sql          # Postgres DDL + invariant triggers
│  │  ├─ src/
│  │  │  ├─ money.ts         # integer-cents money type
│  │  │  ├─ types.ts         # chart of accounts + journal shapes
│  │  │  ├─ ledger.ts        # in-memory double-entry engine
│  │  │  ├─ service.ts       # Upeo ops (in-memory)
│  │  │  ├─ prorata.ts       # exact largest-remainder split
│  │  │  ├─ reconcile.ts     # invariant checks
│  │  │  ├─ db.ts            # portable Queryable (pg + PGlite), migrate, withTx
│  │  │  ├─ pg.ts            # PgUpeo — Postgres-backed ops + advisory locks
│  │  │  └─ mpesa/           # Daraja client, helpers, PaymentsService
│  │  ├─ test/               # 22 tests (engine, Postgres, M-Pesa)
│  │  ├─ demo.ts             # narrated lifecycle: npm run demo
│  │  ├─ README.md           # ledger deep-dive
│  │  └─ PERSISTENCE.md      # Postgres layer deep-dive
│  ├─ marketplace/           # @upeo/marketplace  (sponsors, projects, funding)
│  │  ├─ schema.sql          # sponsor / project / project_update tables
│  │  ├─ src/marketplace.ts  # MarketplaceService (funding read live from ledger)
│  │  └─ test/
│  └─ api/                   # @upeo/api  (NestJS — depends on ledger + marketplace)
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

## Getting Started

### Prerequisites

- **Node.js 20+** (check with `node --version`)
- **npm 10+** (comes with Node)
- **PostgreSQL database** (or serverless: [Neon](https://neon.tech), [Supabase](https://supabase.com))

### Step-by-Step Setup

#### 1. Clone & Install

```bash
# Install all dependencies (npm workspaces)
npm install
```

#### 2. Verify Everything Works (Tests)

```bash
# Run all tests (31 total: 22 ledger + 3 marketplace + 6 API e2e)
npm test

# Run API end-to-end tests only
npm run test:e2e -w @upeo/api

# See a narrated walkthrough of the ledger lifecycle
npm run demo -w @upeo/ledger
```

#### 3. Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and fill in:
# - DATABASE_URL: your Postgres connection string
# - JWT_SECRET: any string ≥32 characters (e.g., openssl rand -hex 32)
# - Optional (for M-Pesa): MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, etc.
# - PORT: defaults to 3000
# - NODE_ENV: 'development' (returns devOtp) or 'production' (sends SMS)

nano .env  # or your editor
```

#### 4. Create Database Schema

```bash
# Run the three schema files in your database
# Replace $DATABASE_URL with your actual connection string (from .env)

psql "$DATABASE_URL" -f packages/ledger/schema.sql
psql "$DATABASE_URL" -f packages/marketplace/schema.sql
psql "$DATABASE_URL" -f packages/api/sql/auth.sql

# Verify the schema was created:
# psql "$DATABASE_URL" -c "\dt"  # should show journal_entry, posting, kyc, sponsor, project, etc.
```

#### 5. Build the API

```bash
npm run build

# Output:
# - packages/ledger/dist/
# - packages/marketplace/dist/
# - packages/api/dist/
```

#### 6. Run the API

**Development mode** (auto-reload on file changes):

```bash
npm run dev:api
# API runs on http://localhost:3000
# devOtp is returned in /auth/request-otp response
```

**Production mode** (after building):

```bash
node packages/api/dist/main.js
# API runs on http://localhost:3000
# NODE_ENV=production: OTP is NOT returned (sent via SMS instead)
```

#### 7. Test the API

Once the API is running, use the example cURL commands below or see `API-ENDPOINTS.md` for complete details.

```bash
# 1. Request an OTP
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "254712345678"}'
# Response: {"devOtp": "123456"}  (dev mode only)

# 2. Verify OTP (use devOtp from above)
TOKEN=$(curl -s -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "254712345678", "code": "123456"}' | jq -r '.token')
echo "JWT: $TOKEN"

# 3. Complete KYC verification
curl -X POST http://localhost:3000/auth/complete-kyc \
  -H "Authorization: Bearer $TOKEN"

# 4. Check wallet balance
curl -X GET http://localhost:3000/wallet/balance \
  -H "Authorization: Bearer $TOKEN"
# Response: {"cents": 0}

# 5. List projects (public endpoint)
curl -X GET http://localhost:3000/projects | jq
```

---

## Complete API Endpoint Reference

All money amounts are in **integer cents** (e.g., 50000 = KES 500).

### Authentication Endpoints

| Method | Endpoint             | Auth | Description                                           |
| ------ | -------------------- | ---- | ----------------------------------------------------- |
| `POST` | `/auth/request-otp`  | –    | Send OTP to phone; dev mode returns `devOtp`          |
| `POST` | `/auth/verify-otp`   | –    | Exchange OTP code for JWT token                       |
| `POST` | `/auth/complete-kyc` | JWT  | Mark user as KYC-verified (required before investing) |

**Request OTP:**

```json
POST /auth/request-otp
{
  "phone": "254712345678"
}
Response: { "devOtp": "123456" }  // dev mode only
```

**Verify OTP & Get JWT:**

```json
POST /auth/verify-otp
{
  "phone": "254712345678",
  "code": "123456"
}
Response: { "token": "eyJhbGciOiJIUzI1NiIs..." }
```

**Complete KYC:**

```json
POST /auth/complete-kyc
Authorization: Bearer <JWT_TOKEN>

Response: { "status": "verified" }
```

---

### Wallet Endpoints

| Method | Endpoint           | Auth | Description                           |
| ------ | ------------------ | ---- | ------------------------------------- |
| `GET`  | `/wallet/balance`  | JWT  | Get available wallet balance in cents |
| `POST` | `/wallet/deposit`  | JWT  | Start M-Pesa STK push deposit         |
| `POST` | `/wallet/withdraw` | JWT  | Initiate B2C withdrawal to phone      |

**Get Balance:**

```json
GET /wallet/balance
Authorization: Bearer <JWT_TOKEN>

Response: { "cents": 50000 }
```

**Initiate Deposit (M-Pesa STK):**

```json
POST /wallet/deposit
Authorization: Bearer <JWT_TOKEN>
{
  "amountCents": 50000,
  "phone": "254712345678"
}
Response: {
  "checkoutRequestId": "ws_CO_abc123",
  "message": "STK push initiated; awaiting M-Pesa prompt response"
}
```

**Initiate Withdrawal (B2C to M-Pesa):**

```json
POST /wallet/withdraw
Authorization: Bearer <JWT_TOKEN>
{
  "amountCents": 30000,
  "phone": "254712345678"
}
Response: {
  "conversationId": "b2c_conv_xyz789",
  "message": "Withdrawal initiated; funds will arrive in minutes"
}
```

---

### Investment Endpoints

| Method | Endpoint                  | Auth      | Description                                |
| ------ | ------------------------- | --------- | ------------------------------------------ |
| `POST` | `/invest/:projectId`      | JWT + KYC | Invest in a project (solo or pooled)       |
| `POST` | `/invest/cancel/:entryId` | JWT       | Cancel investment (48h cooling-off window) |

**Invest in Project:**

```json
POST /invest/kiambu-poultry
Authorization: Bearer <JWT_TOKEN>
{
  "amountCents": 100000
}
Response: { "entryId": 42 }
```

**Cancel Investment (Cooling-Off):**

```json
POST /invest/cancel/42
Authorization: Bearer <JWT_TOKEN>

Response: { "refunded": true }
```

---

### Marketplace Endpoints

| Method | Endpoint                | Auth | Description                                 |
| ------ | ----------------------- | ---- | ------------------------------------------- |
| `GET`  | `/projects`             | –    | List all projects with live funding data    |
| `GET`  | `/projects/:id`         | –    | Get a single project                        |
| `POST` | `/projects`             | JWT  | Submit a project for underwriting (sponsor) |
| `POST` | `/projects/:id/updates` | JWT  | Post a project update (with optional photo) |

**List All Projects:**

```json
GET /projects

Response: [
  {
    "id": "kiambu-poultry",
    "title": "Kiambu Broiler Poultry",
    "venture": "poultry",
    "location": "Kiambu",
    "description": "Modern broiler farming",
    "minCents": 50000,
    "targetCents": 1000000,
    "raised": 500000,
    "funded_pct": 50,
    "investors": 12,
    "status": "funding",
    "grade": "B",
    "expectedPct": 18,
    "downsidePct": 4,
    "cycleMonths": 4,
    "returnModel": "fixed"
  }
]
```

**Get Single Project:**

```json
GET /projects/kiambu-poultry

Response: {
  "id": "kiambu-poultry",
  "title": "Kiambu Broiler Poultry",
  ...all fields...
  "sponsorId": "254712345678",
  "createdAt": "2024-05-20T10:30:00Z"
}
```

**Submit Project (Sponsor Onboarding):**

```json
POST /projects
Authorization: Bearer <JWT_TOKEN>
{
  "id": "kiambu-poultry",
  "title": "Kiambu Broiler Poultry",
  "venture": "poultry",
  "location": "Kiambu",
  "description": "Modern broiler farming operation",
  "returnModel": "fixed",
  "cycleMonths": 4,
  "minCents": 50000,
  "targetCents": 1000000
}
Response: { "id": "kiambu-poultry", "status": "pending_approval" }
```

**Post Project Update:**

```json
POST /projects/kiambu-poultry/updates
Authorization: Bearer <JWT_TOKEN>
{
  "body": "Month 1: Successfully planted 5 acres, germination rate 95%.",
  "hasPhoto": true
}
Response: {
  "id": "update_123",
  "projectId": "kiambu-poultry",
  "body": "Month 1: Successfully planted...",
  "hasPhoto": true,
  "createdAt": "2024-05-22T14:30:00Z"
}
```

---

### Admin / Underwriting Endpoints

| Method | Endpoint                      | Auth  | Description                                |
| ------ | ----------------------------- | ----- | ------------------------------------------ |
| `POST` | `/admin/projects/:id/approve` | JWT\* | Approve project & set grade + return terms |

⚠️ **Currently:** Any authenticated user can approve. In production, add role-based access control.

**Approve Project:**

```json
POST /admin/projects/kiambu-poultry/approve
Authorization: Bearer <JWT_TOKEN>
{
  "grade": "B",
  "expectedPct": 18,
  "downsidePct": 4
}
Response: {
  "id": "kiambu-poultry",
  "status": "approved",
  "grade": "B",
  "expectedPct": 18,
  "downsidePct": 4
}
```

---

### M-Pesa Webhook Endpoints

These are called by Safaricom (Daraja) — **no authentication needed**. Always respond with `{ResultCode: 0}` so Safaricom stops retrying.

| Method | Endpoint              | Description                     |
| ------ | --------------------- | ------------------------------- |
| `POST` | `/mpesa/stk-callback` | STK deposit completion callback |
| `POST` | `/mpesa/b2c-result`   | B2C withdrawal success callback |
| `POST` | `/mpesa/b2c-timeout`  | B2C withdrawal timeout callback |

**STK Callback (from Safaricom):**

```json
POST /mpesa/stk-callback
{
  "Body": {
    "stkCallback": {
      "CheckoutRequestID": "ws_CO_abc123",
      "ResultCode": 0,
      "ResultDesc": "ok",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 500 },
          { "Name": "MpesaReceiptNumber", "Value": "QE2E001" },
          { "Name": "PhoneNumber", "Value": 254712345678 }
        ]
      }
    }
  }
}
Response: { "ResultCode": 0, "ResultDesc": "Accepted" }
```

**B2C Result Callback (from Safaricom):**

```json
POST /mpesa/b2c-result
{
  "Result": {
    "ConversationID": "b2c_conv_xyz789",
    "ResultCode": 0,
    "TransactionID": "LEI81C1",
    "Amount": 300,
    "ReceiverParty": 254712345678
  }
}
Response: { "ResultCode": 0, "ResultDesc": "Accepted" }
```

---

## Error Responses

All endpoints may return errors. Format:

```json
{
  "statusCode": 400,
  "message": "Validation failed: amountCents must be a positive integer",
  "error": "Bad Request"
}
```

Common status codes:

- **400 Bad Request** — Invalid input or business logic error
- **401 Unauthorized** — Missing or invalid JWT token
- **403 Forbidden** — Authorized but not permitted (e.g., KYC not verified)
- **404 Not Found** — Resource not found
- **500 Internal Server Error** — Server error (logged)

---

## Environment Variables

Create a `.env` file in the repository root. Copy from `.env.example` and fill in:

```env
# REQUIRED
DATABASE_URL=postgresql://user:password@host:5432/upeo
JWT_SECRET=<any random string, minimum 32 characters>
NODE_ENV=development

# Optional (for M-Pesa integration)
MPESA_CONSUMER_KEY=your_app_key_from_daraja
MPESA_CONSUMER_SECRET=your_app_secret_from_daraja
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_test_passkey_from_daraja_portal
PUBLIC_URL=https://your-ngrok-url.ngrok.io   # (local dev) or deployed URL

# Server
PORT=3000
```

**Generate a secure JWT_SECRET:**
```bash
openssl rand -hex 32
```

---

## Troubleshooting

### "Can't connect to database"
- Verify `DATABASE_URL` in `.env` is correct
- Test with: `psql "$DATABASE_URL" -c "\dt"`
- If using Neon/Supabase, ensure your IP is whitelisted

### "Port 3000 already in use"
```bash
# Use a different port:
PORT=3001 npm run dev:api
```

### "Tests fail with PG connection error"
- Tests use in-memory PGlite by default
- If you want to test against your Postgres: the test suite will auto-detect `DATABASE_URL`

### "devOtp not returned in /auth/request-otp response"
- Check `NODE_ENV` in `.env` — if it's `production`, OTP is sent via SMS, not returned
- Set `NODE_ENV=development` for dev mode

---

## M-Pesa Daraja Setup

To enable deposits (STK push) and withdrawals (B2C), integrate with Safaricom's M-Pesa Daraja API:

1. **Create a Daraja app:**
   - Go to [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
   - Create a new app in the sandbox environment
   - Note your **Consumer Key** and **Consumer Secret**

2. **Get M-Pesa credentials:**
   - **Shortcode:** `174379` (for STK push deposits — provided by Safaricom)
   - **Passkey:** found in your Daraja portal under "Sandbox" → "Lipa na M-Pesa Online"

3. **Set up callback URLs:**
   - Callbacks need a **public HTTPS URL**
   - **For local development:** Use `ngrok` to tunnel:
     ```bash
     ngrok http 3000
     # Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
     ```
   - Add to `.env`: `PUBLIC_URL=https://abc123.ngrok.io`
   - In Daraja portal, set callback URLs:
     - Validation URL: `{PUBLIC_URL}/mpesa/validate`
     - Confirmation URL: `{PUBLIC_URL}/mpesa/confirm`
     - Result URL: `{PUBLIC_URL}/mpesa/result`
     - Timeout URL: `{PUBLIC_URL}/mpesa/timeout`

4. **Fill in `.env`:**
   ```env
   MPESA_CONSUMER_KEY=<your Consumer Key>
   MPESA_CONSUMER_SECRET=<your Consumer Secret>
   MPESA_SHORTCODE=174379
   MPESA_PASSKEY=<your Passkey>
   PUBLIC_URL=https://abc123.ngrok.io
   ```

5. **Restart the API** to pick up the new env vars:
   ```bash
   npm run dev:api
   ```

6. **Test the flow:**
   - Request OTP → get JWT → complete KYC → deposit (STK push)
   - When user enters M-Pesa PIN, Safaricom calls your callback
   - Ledger is credited via the callback, idempotently

---

## Deploying in Production

### On Render, Railway, or Fly.io

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Set start command:**
   ```
   node packages/api/dist/main.js
   ```

3. **Set environment variables** in the platform dashboard:
   - `DATABASE_URL` — use Neon or Supabase (free tier)
   - `JWT_SECRET` — use `openssl rand -hex 32`
   - `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, etc.
   - `PUBLIC_URL` — the service's public URL (e.g., `https://myapp.fly.dev`)
   - `NODE_ENV` — set to `production`
   - `PORT` — the platform usually sets this automatically

4. **Create the database schema** (one time):
   ```bash
   psql "$DATABASE_URL" -f packages/ledger/schema.sql
   psql "$DATABASE_URL" -f packages/marketplace/schema.sql
   psql "$DATABASE_URL" -f packages/api/sql/auth.sql
   ```

5. **Update Daraja callback URLs** to your production URL

6. **Deploy** — the platform will build and start the app

---

## Design decisions worth keeping (don't undo these)

- **Money is integer cents; balances are derived from postings, never stored**
  as a mutable number. Every entry sums to zero.
- **Invariants are enforced in the database** (balance trigger, append-only
  trigger, `UNIQUE(ref)`), not just the app — so the books hold regardless of
  what writes to them.
- **One transaction + per-account advisory lock** per money operation, so
  concurrent requests can't double-spend. ⚠️ The parallel race is _not_ covered
  by the PGlite tests (single connection) — exercise it against a real
  multi-connection Postgres in CI.
- **48-hour cooling-off** is the only early exit (a CMA requirement).
- Honest returns: the product never promises a guaranteed return; the UI shows
  expected **and** downside.

---

## Roadmap (suggested order)

1. ~~Verify the API end-to-end~~ ✅ done (PGlite e2e). Next: run the same flow
   against your Neon DB + a _live_ Daraja sandbox (real STK push to a phone).
2. ~~Marketplace tables + service~~ ✅ done (`@upeo/marketplace`).
3. ~~KYC guard on invest routes~~ ✅ wired — now add the verify flow that sets
   `kyc.status = 'verified'` (ID + liveness, per the prototype onboarding).
4. **Sponsor onboarding UI** + richer underwriting workflow on top of the
   marketplace service.
5. **Notifications** (SMS + push) for funding milestones, payouts, cooling-off.
6. **Concurrency test** against real Postgres; load test the advisory-lock path.
7. Wire the **UX prototype** to these endpoints (auth → projects → invest → wallet).

---

## Related artifacts (separate files from this build)

- `upeo-design.md` — full product + architecture design.
- `upeo-design-prompt.md` — the reusable brief that generated it.
- `UpeoPrototype.jsx` — the interactive mobile UX prototype.

> Not legal/financial advice. Operating this as a real investment platform in
> Kenya requires CMA licensing (Investment-Based Crowdfunding Regulations, 2022),
> a custodian, and the capital thresholds noted in the design doc. Resolve those
> with a licensed advocate before taking public money.
