# 🚀 Upeo Backend — Start Here!

Welcome! This file shows you how to get started with the Upeo backend in **3 minutes**.

---

## Choose Your Platform

### 🐧 macOS / Linux

```bash
# 1. Make scripts executable (one-time)
chmod +x run.sh setup-db.sh

# 2. Run setup (installs everything)
./run.sh setup

# 3. Edit .env file (add your database URL)
nano .env

# 4. Create database
./setup-db.sh

# 5. Run tests (verify it works)
./run.sh test

# 6. Start the API
./run.sh dev
```

**That's it!** API is now running at http://localhost:3000

---

### 🪟 Windows

```cmd
REM 1. Run setup (installs everything)
run.bat setup

REM 2. Edit .env file (add your database URL)
notepad .env

REM 3. Create database
setup-db.bat

REM 4. Run tests (verify it works)
run.bat test

REM 5. Start the API
run.bat dev
```

**That's it!** API is now running at http://localhost:3000

---

## What These Commands Do

| Command | Purpose | Time |
|---------|---------|------|
| `./run.sh setup` | Install npm packages + create `.env` | 1 min |
| `./setup-db.sh` | Create database schema | <1 min |
| `./run.sh test` | Run all 31 tests | 1 min |
| `./run.sh dev` | Start API with auto-reload | instant |

---

## Quick Test (After Starting)

```bash
# In another terminal:

# 1. Request OTP
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "254712345678"}'

# Response:
# {"devOtp": "123456"}

# 2. Use that code to verify & get JWT
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "254712345678", "code": "123456"}'

# Response:
# {"token": "eyJhbGciOiJIUzI1NiIs..."}

# 3. Check wallet balance
TOKEN="<paste-token-from-above>"
curl -X GET http://localhost:3000/wallet/balance \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {"cents": 0}
```

---

## All Available Commands

### Main Commands (`./run.sh` or `run.bat`)

```bash
./run.sh setup      # One-time: install everything
./run.sh dev        # Development mode (with auto-reload)
./run.sh prod       # Production mode
./run.sh build      # Build TypeScript
./run.sh test       # Run all tests
./run.sh typecheck  # TypeScript type check
./run.sh demo       # Show ledger walkthrough
./run.sh help       # Show help
```

### Database Commands (`./setup-db.sh` or `setup-db.bat`)

```bash
./setup-db.sh           # Create schema
./setup-db.sh --backup  # Backup first
./setup-db.sh --drop    # Fresh start (dangerous!)
./setup-db.sh -h        # Show help
```

---

## Before You Start: Requirements

- **Node.js 20+** — [Download](https://nodejs.org)
- **PostgreSQL** — Free options: [Neon](https://neon.tech), [Supabase](https://supabase.com)
- **psql** — PostgreSQL command-line tool (included with PostgreSQL)

**Verify you have them:**

```bash
# Should show v20.x or higher:
node --version

# Should show 10.x or higher:
npm --version

# Should show PostgreSQL version:
psql --version
```

---

## Stuck? Troubleshooting

| Problem | Solution |
|---------|----------|
| `node: command not found` | Install Node.js from https://nodejs.org |
| `psql: command not found` | Install PostgreSQL client tools |
| `Can't connect to database` | Check `DATABASE_URL` in `.env` |
| `Port 3000 already in use` | Use different port: `PORT=3001 ./run.sh dev` |
| Tests fail | Make sure database exists and is accessible |
| `devOtp not returned` | Set `NODE_ENV=development` in `.env` |

More help: See `SCRIPTS.md`

---

## Project Structure

```
upeo/
├─ run.sh              Main script (macOS/Linux)
├─ run.bat             Main script (Windows)
├─ setup-db.sh         Database setup (macOS/Linux)
├─ setup-db.bat        Database setup (Windows)
├─ .env.example        Environment template
├─ packages/
│  ├─ ledger/          Double-entry ledger core
│  ├─ marketplace/     Projects & sponsorship
│  └─ api/             NestJS HTTP API
├─ README.md           Full documentation
├─ QUICK_START.md      Quick reference
├─ API-ENDPOINTS.md    All 18 endpoints
└─ SCRIPTS.md          Script documentation
```

---

## Documentation

- **README.md** — Full setup guide + API reference
- **QUICK_START.md** — Quick reference card
- **API-ENDPOINTS.md** — All 18 endpoints with examples
- **SCRIPTS.md** — Complete script documentation
- **upeo-design.md** — Product & architecture design

---

## Backend Status

✅ **31 Tests Pass** (22 ledger + 3 marketplace + 6 API e2e)  
✅ **All 18 Endpoints** Implemented & working  
✅ **Full TypeScript** No type errors  
✅ **Production-Ready** With proper error handling & logging  

---

## What's Implemented

✅ Double-entry ledger (money core)  
✅ Postgres persistence with DB invariants  
✅ M-Pesa integration (STK deposits, B2C withdrawals)  
✅ Phone OTP authentication → JWT  
✅ Wallet operations (balance, deposit, withdraw)  
✅ Investment engine (solo/pooled, cooling-off)  
✅ Marketplace (sponsors, projects, updates)  
✅ Admin underwriting (project approval, grading)  
✅ KYC verification guard on invest routes  
✅ Pro-rata exact payouts  
✅ 48h cooling-off refunds  

---

## Next Steps

1. **Follow the setup above** (3 commands)
2. **Test the API** (use cURL examples)
3. **Read the docs** (README.md for details)
4. **Customize & deploy** (your project, your rules)

---

## Questions?

- Full docs: See `README.md`
- API endpoints: See `API-ENDPOINTS.md`
- Script help: Run `./run.sh help` or `run.bat help`
- Ledger architecture: See `packages/ledger/README.md`

---

**Let's build the future of agricultural finance! 🌾**

