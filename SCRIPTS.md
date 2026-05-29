# AgriVest Backend — Run Scripts

Complete scripts to set up, configure, and run the AgriVest backend.

## Overview

| Script         | Platform     | Purpose                                  |
| -------------- | ------------ | ---------------------------------------- |
| `run.sh`       | macOS, Linux | Main run script with dev/prod/test modes |
| `setup-db.sh`  | macOS, Linux | Database schema setup                    |
| `run.bat`      | Windows      | Main run script (Windows)                |
| `setup-db.bat` | Windows      | Database schema setup (Windows)          |

---

## Quick Start

### macOS / Linux

```bash
# 1. Make scripts executable (one time)
chmod +x run.sh setup-db.sh

# 2. Install & configure
./run.sh setup

# 3. Edit .env with your DATABASE_URL

# 4. Create database schema
./setup-db.sh

# 5. Run tests (verify everything works)
./run.sh test

# 6. Start the API
./run.sh dev
```

### Windows

```cmd
REM 1. Install & configure
run.bat setup

REM 2. Edit .env with your DATABASE_URL

REM 3. Create database schema
setup-db.bat

REM 4. Run tests
run.bat test

REM 5. Start the API
run.bat dev
```

---

## Main Run Script (`run.sh` / `run.bat`)

### Commands

```bash
# Setup (install + configure)
./run.sh setup

# Development mode (auto-reload on file changes)
./run.sh dev

# Production mode (requires build)
./run.sh prod

# Build all packages
./run.sh build

# Run tests (31 tests total)
./run.sh test

# Type check (TypeScript)
./run.sh typecheck

# Narrated ledger demo
./run.sh demo

# Show help
./run.sh help
```

### Setup Command

```bash
./run.sh setup
```

**Does:**

1. Checks for Node.js 20+
2. Installs npm dependencies
3. Creates `.env` file from `.env.example`
4. Shows instructions for next steps

**Output:**

```
╔════════════════════════════════════════════════════════╗
║ Setting up AgriVest Backend                            ║
╚════════════════════════════════════════════════════════╝

✓ Node.js v20.x.x found
✓ npm 10.x.x found

ℹ Installing npm dependencies...
✓ Dependencies installed

⚠ .env file not found
Creating .env from .env.example...
⚠ Please edit .env and fill in:
  - DATABASE_URL
  - JWT_SECRET
  - Optional: M-Pesa credentials

Setup complete!

Next steps:
  1. Edit .env and add DATABASE_URL + JWT_SECRET
  2. Create database schema:
     psql "$DATABASE_URL" -f packages/ledger/schema.sql
     psql "$DATABASE_URL" -f packages/marketplace/schema.sql
     psql "$DATABASE_URL" -f packages/api/sql/auth.sql
  3. Run the API: ./run.sh dev
```

### Development Mode

```bash
./run.sh dev
```

**Does:**

1. Checks `.env` is configured
2. Starts API with auto-reload (tsx watch)
3. Watches file changes and restarts automatically

**Output:**

```
╔════════════════════════════════════════════════════════╗
║ AgriVest API — Development Mode                        ║
╚════════════════════════════════════════════════════════╝

ℹ Starting API server with auto-reload (tsx watch)...
ℹ API will be available at http://localhost:3000

[12:34:56] Starting compilation...
[12:34:58] Compilation successful

Agri Vest API on :3000
```

Edit a file, save, and the API reloads automatically.

### Production Mode

```bash
./run.sh prod
```

**Does:**

1. Checks if `.env` is configured
2. Builds if not already built
3. Starts the API server (compiled Node.js)

**Output:**

```
╔════════════════════════════════════════════════════════╗
║ AgriVest API — Production Mode                         ║
╚════════════════════════════════════════════════════════╝

✓ Starting API server...
ℹ API will be available at http://localhost:3000

Agri Vest API on :3000
```

Set `NODE_ENV=production` to disable dev features (like returning OTP codes).

### Build Command

```bash
./run.sh build
```

**Does:**

1. Compiles all TypeScript packages
2. Outputs to `dist/` directories

**Output:**

```
╔════════════════════════════════════════════════════════╗
║ Building AgriVest                                      ║
╚════════════════════════════════════════════════════════╝

ℹ Building all packages...
✓ Build complete!

Output:
  - packages/ledger/dist/
  - packages/marketplace/dist/
  - packages/api/dist/
```

### Test Command

```bash
./run.sh test
```

**Does:**

1. Runs ledger tests (22 tests)
2. Runs marketplace tests (3 tests)
3. Runs API e2e tests (6 tests)

**Output:**

```
╔════════════════════════════════════════════════════════╗
║ Running Tests                                          ║
╚════════════════════════════════════════════════════════╝

ℹ Running all tests...

✓ rejects an unbalanced entry
✓ balances read in natural direction; ledger stays zero-sum
✓ deposit flow: STK push -> callback -> wallet credited
... (19 more ledger tests)

ℹ tests 22
ℹ pass 22
ℹ duration_ms 25429.99

ℹ Running API end-to-end tests...

✓ auth: request + verify OTP yields a JWT
✓ wallet starts empty
✓ investing is blocked until KYC, then allowed
... (3 more API tests)

ℹ tests 6
ℹ pass 6

✓ All tests passed!
```

### Type Check Command

```bash
./run.sh typecheck
```

**Does:**

1. Runs TypeScript compiler in check mode
2. Reports any type errors

**Output:**

```
╔════════════════════════════════════════════════════════╗
║ Type Checking                                          ║
╚════════════════════════════════════════════════════════╝

ℹ Running TypeScript type check...
✓ Type check passed!
```

### Demo Command

```bash
./run.sh demo
```

**Does:**

1. Runs the narrated ledger lifecycle demonstration
2. Shows a full flow: deposit → invest → payout

**Output:**

```
Ledger Lifecycle Demo

1. Create project targets
2. Deposit: user funds wallet
   Wallet: 50,000 cents (KES 500)
3. Invest: user invests in project
   Escrow: 50,000 cents
   Wallet: 0 cents
...
```

---

## Database Setup Script (`setup-db.sh` / `setup-db.bat`)

### Command

```bash
./setup-db.sh
```

**Does:**

1. Checks `psql` is installed
2. Loads `DATABASE_URL` from `.env`
3. Tests database connection
4. Creates ledger schema
5. Creates marketplace schema
6. Creates auth schema
7. Verifies tables exist

**Output:**

```
╔════════════════════════════════════════════════════════╗
║ AgriVest Backend — Database Setup                      ║
╚════════════════════════════════════════════════════════╝

✓ psql found
✓ .env loaded
✓ Database connection successful

ℹ This will create the following tables:
  • Ledger: journal_entry, posting, account_balance, investment
  • Marketplace: sponsor, project, project_update
  • Auth: kyc

ℹ Running packages/ledger/schema.sql...
✓ Ledger schema created

ℹ Running packages/marketplace/schema.sql...
✓ Marketplace schema created

ℹ Running packages/api/sql/auth.sql...
✓ Auth schema created

✓ All schemas created successfully

╔════════════════════════════════════════════════════════╗
║ Verifying Schema                                       ║
╚════════════════════════════════════════════════════════╝

ℹ Tables in database:
  ✓ account_balance
  ✓ investment
  ✓ journal_entry
  ✓ kyc
  ✓ posting
  ✓ project
  ✓ project_update
  ✓ sponsor

✓ Found 8 tables

Database setup complete!

Next steps:
  1. Run tests to verify:
     ./run.sh test

  2. Start the API:
     ./run.sh dev

  3. Test an endpoint:
     curl -X POST http://localhost:3000/auth/request-otp \
       -H 'Content-Type: application/json' \
       -d '{"phone": "254712345678"}'
```

### Options

```bash
# With backup (creates .db-backup-YYYYMMDD-HHMMSS.sql)
./setup-db.sh --backup

# Drop all tables first (for clean slate)
./setup-db.sh --drop

# Show help
./setup-db.sh -h
```

---

## Environment Variables

Both scripts use these variables from `.env`:

```env
# Required
DATABASE_URL=postgresql://user:password@host:5432/agrivest
JWT_SECRET=<32+ character random string>

# Optional
NODE_ENV=development           # or production
PORT=3000                      # API server port
MPESA_CONSUMER_KEY=...        # M-Pesa integration
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=174379
MPESA_PASSKEY=...
PUBLIC_URL=http://localhost:3000  # or ngrok URL for M-Pesa
```

**Generate a secure JWT_SECRET:**

```bash
# macOS / Linux
openssl rand -hex 32

# Windows (PowerShell)
[Convert]::ToHexString((Get-Random -Count 32 | ForEach-Object {[byte]_}))
```

---

## Complete Setup Workflow

### First Time Setup

```bash
# 1. Clone & install
git clone <repo>
cd agrivest
./run.sh setup

# 2. Configure database
# Edit .env and add:
# DATABASE_URL=postgresql://...
# JWT_SECRET=<generated-secret>

nano .env

# 3. Create database schema
./setup-db.sh

# 4. Verify everything works
./run.sh test

# 5. Start developing
./run.sh dev
```

### Production Deployment

```bash
# 1. Install & build
./run.sh build

# 2. Set environment
export NODE_ENV=production
export DATABASE_URL=<prod-db-url>
export JWT_SECRET=<prod-secret>
# ... other env vars ...

# 3. Run
./run.sh prod
```

### Troubleshooting

#### Node.js not found

```bash
# Install from https://nodejs.org (20+)
# Then verify:
node --version
npm --version
```

#### psql not found

```bash
# macOS
brew install postgresql

# Ubuntu
sudo apt-get install postgresql-client

# Windows
# Download from https://www.postgresql.org/download/
```

#### Can't connect to database

```bash
# Test connection:
psql "$DATABASE_URL" -c "SELECT NOW();"

# Verify DATABASE_URL in .env:
grep DATABASE_URL .env
```

#### Port 3000 already in use

```bash
# Use different port:
PORT=3001 ./run.sh dev

# Or find what's using the port:
# macOS/Linux:
lsof -i :3000

# Windows (PowerShell):
netstat -ano | findstr :3000
```

---

## Script Features

✅ **Colored output** — Easy to read status messages  
✅ **Error handling** — Clear error messages  
✅ **Cross-platform** — Works on macOS, Linux, Windows  
✅ **Help text** — Built-in help with `-h` or `--help`  
✅ **Intelligent defaults** — Smart checks and auto-detection  
✅ **No external deps** — Uses only npm, Node, and bash/batch

---

## Comparison

### When to use each script

| Scenario             | Script        | Command                  |
| -------------------- | ------------- | ------------------------ |
| First time setup     | `run.sh`      | `./run.sh setup`         |
| Daily development    | `run.sh`      | `./run.sh dev`           |
| Before deploying     | `run.sh`      | `./run.sh build`         |
| Verify it works      | `run.sh`      | `./run.sh test`          |
| Deploy to production | `run.sh`      | `./run.sh prod`          |
| Reset database       | `setup-db.sh` | `./setup-db.sh --drop`   |
| Backup database      | `setup-db.sh` | `./setup-db.sh --backup` |

---

## Exit Codes

Scripts return exit codes for automation:

```bash
0   # Success
1   # Failure (check output for details)
```

Example in CI/CD:

```bash
./run.sh test && echo "All tests passed!" || echo "Tests failed"
```

---

## See Also

- `README.md` — Full project documentation
- `QUICK_START.md` — Quick reference
- `API-ENDPOINTS.md` — API endpoint details
- `.env.example` — Example environment variables
