# AgriVest Backend — Quick Start Reference

## 5-Minute Setup

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Edit .env and add: DATABASE_URL, JWT_SECRET

# 3. Test (verify everything works)
npm test
npm run test:e2e -w @agrivest/api

# 4. Build
npm run build

# 5. Run
npm run dev:api
# Open browser: http://localhost:3000
```

## Test with cURL

```bash
# 1. Request OTP
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "254712345678"}'
# → {"devOtp": "123456"}

# 2. Verify & get JWT
TOKEN=$(curl -s -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "254712345678", "code": "123456"}' | jq -r '.token')

# 3. Complete KYC
curl -X POST http://localhost:3000/auth/complete-kyc \
  -H "Authorization: Bearer $TOKEN"

# 4. Check balance
curl -X GET http://localhost:3000/wallet/balance \
  -H "Authorization: Bearer $TOKEN"

# 5. List projects
curl -X GET http://localhost:3000/projects | jq
```

## API Endpoints (All 18)

### Authentication (3)
- `POST /auth/request-otp` — Get OTP
- `POST /auth/verify-otp` — Exchange for JWT
- `POST /auth/complete-kyc` — Verify KYC

### Wallet (3)
- `GET /wallet/balance` — Check balance
- `POST /wallet/deposit` — STK push
- `POST /wallet/withdraw` — B2C transfer

### Investment (2)
- `POST /invest/:projectId` — Invest
- `POST /invest/cancel/:entryId` — Cooling-off refund

### Marketplace (4)
- `GET /projects` — List all
- `GET /projects/:id` — Get one
- `POST /projects` — Submit project
- `POST /projects/:id/updates` — Post update

### Admin (1)
- `POST /admin/projects/:id/approve` — Approve project

### M-Pesa Webhooks (3, called by Safaricom)
- `POST /mpesa/stk-callback` — Deposit callback
- `POST /mpesa/b2c-result` — Withdrawal success
- `POST /mpesa/b2c-timeout` — Withdrawal timeout

### Other (2)
- `GET /health` (if implemented) — Health check
- All amounts in **integer cents** (50000 = KES 500)

## Environment

```env
DATABASE_URL=postgresql://user:pass@host/agrivest
JWT_SECRET=$(openssl rand -hex 32)
NODE_ENV=development  # or production
PORT=3000

# Optional (M-Pesa)
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=174379
MPESA_PASSKEY=...
PUBLIC_URL=https://...
```

## Commands

```bash
npm install                    # Install deps
npm test                       # All tests (31 total)
npm run test:e2e -w @agrivest/api  # API tests only
npm run build                  # Build all packages
npm run dev:api                # Run API (watch mode)
npm run demo -w @agrivest/ledger   # See ledger walkthrough
npm run typecheck              # TypeScript check
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't connect to DB | Check `DATABASE_URL` in `.env`; test with `psql "$DATABASE_URL" -c "\dt"` |
| Port 3000 in use | `PORT=3001 npm run dev:api` |
| No devOtp returned | Set `NODE_ENV=development` in `.env` |
| Tests fail | Ensure database exists; run `psql "$DATABASE_URL" -c "CREATE DATABASE agrivest"` |

## Deploy

**Free tier:** Neon (DB) + Render/Railway/Fly.io (API)

```bash
npm run build
# Upload to platform, set env vars, run:
# node packages/api/dist/main.js
```

## More Info

- Full API docs: `API-ENDPOINTS.md`
- Design & architecture: `agrivest-design.md`
- Ledger deep-dive: `packages/ledger/README.md`
- UX prototype: `AgriVestPrototype.jsx`

---

**Status:** ✅ All 31 tests pass | TypeScript ✅ | Build ✅
