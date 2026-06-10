# Upeo API Endpoints

Complete reference for all implemented endpoints. Money is always **integer minor units (cents)** at the API boundary.

## Authentication

### Request OTP

```
POST /auth/request-otp
Content-Type: application/json

{
  "phone": "254712345678"
}

Response (201 Created):
{
  "devOtp": "123456"     // only in dev mode (NODE_ENV != production)
}
```

Sends an OTP code to the phone number. In development, the OTP is returned in the response. In production, it's sent via SMS.

---

### Verify OTP & Get JWT

```
POST /auth/verify-otp
Content-Type: application/json

{
  "phone": "254712345678",
  "code": "123456"
}

Response (201 Created):
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Exchanges a verified OTP code for a JWT token. Use this token in the `Authorization: Bearer <token>` header for authenticated requests.

---

### Complete KYC Verification

```
POST /auth/complete-kyc
Authorization: Bearer <JWT_TOKEN>

Response (201 Created):
{
  "status": "verified"
}
```

Marks the authenticated user's KYC (Know Your Customer) as verified. Required before investing. In production, this would integrate with ID verification and liveness checks.

---

## Wallet

### Get Balance

```
GET /wallet/balance
Authorization: Bearer <JWT_TOKEN>

Response (200 OK):
{
  "cents": 50000
}
```

Returns the user's available wallet balance in cents. Amounts in escrow (from active investments) are not included.

---

### Initiate Deposit (M-Pesa STK Push)

```
POST /wallet/deposit
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "amountCents": 50000,
  "phone": "254712345678"
}

Response (201 Created):
{
  "checkoutRequestId": "ws_CO_abc123",
  "message": "STK push initiated; awaiting M-Pesa prompt response"
}
```

Starts an M-Pesa STK push deposit flow. The user receives a prompt on their phone. When they enter their M-Pesa PIN, Safaricom calls `/mpesa/stk-callback` to complete the transaction.

**Note:** `amountCents` is in integer cents (e.g., 50000 = KES 500).

---

### Initiate Withdrawal (B2C)

```
POST /wallet/withdraw
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "amountCents": 30000,
  "phone": "254712345678"
}

Response (201 Created):
{
  "conversationId": "b2c_conv_xyz789",
  "message": "Withdrawal initiated; funds will arrive in minutes"
}
```

Initiates a B2C (Business to Customer) withdrawal to the user's M-Pesa account. Funds arrive within minutes.

---

## Investing

### Invest in a Project

```
POST /invest/:projectId
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "amountCents": 100000
}

Response (201 Created):
{
  "entryId": 42
}
```

Invest in a project (solo or pooled). The amount is debited from the user's wallet and held in escrow until the project reaches its target (pooled) or matures (solo).

**Guards:**

- `AuthGuard` — JWT required
- `KycGuard` — user must have completed KYC verification first

**Errors:**

- `403 Forbidden` — KYC not verified
- `400 Bad Request` — insufficient wallet balance or project not approved

---

### Cooling-Off Refund (48-hour window)

```
POST /invest/cancel/:entryId
Authorization: Bearer <JWT_TOKEN>

Response (201 Created):
{
  "refunded": true
}
```

Refunds an investment within 48 hours of creation (CMA regulatory requirement). After 48 hours, the investment is locked and cannot be cancelled.

**Guards:**

- `AuthGuard` — JWT required

**Errors:**

- `400 Bad Request` — cooling-off period expired or entry already refunded

---

## Projects & Marketplace

### List All Projects

```
GET /projects

Response (200 OK):
[
  {
    "id": "kiambu-poultry",
    "title": "Kiambu Broiler Poultry",
    "venture": "poultry",
    "location": "Kiambu",
    "description": "Modern broiler farming operation",
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

Returns all projects with live funding data. Funding amounts are read directly from the ledger, so they're always up-to-date.

**Auth:** None required (public endpoint)

---

### Get Single Project

```
GET /projects/:id

Response (200 OK):
{
  "id": "kiambu-poultry",
  "title": "Kiambu Broiler Poultry",
  "venture": "poultry",
  "location": "Kiambu",
  "description": "Modern broiler farming operation",
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
  "returnModel": "fixed",
  "sponsorId": "254712345678",
  "createdAt": "2024-05-20T10:30:00Z"
}
```

Returns detailed information about a single project.

**Auth:** None required (public endpoint)

---

### Submit a Project (Sponsor Onboarding)

```
POST /projects
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

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

Response (201 Created):
{
  "id": "kiambu-poultry",
  "status": "pending_approval"
}
```

A sponsor submits a venture for underwriting. The project enters "pending_approval" status until an admin approves it with a risk grade and terms.

**Guards:**

- `AuthGuard` — JWT required (authenticated user becomes the sponsor)

---

### Post a Project Update

```
POST /projects/:id/updates
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "body": "Month 1: Successfully planted 5 acres, germination rate 95%.",
  "hasPhoto": true
}

Response (201 Created):
{
  "id": "update_123",
  "projectId": "kiambu-poultry",
  "body": "Month 1: Successfully planted 5 acres, germination rate 95%.",
  "hasPhoto": true,
  "createdAt": "2024-05-22T14:30:00Z"
}
```

Sponsor posts a progress update on a project. Updates can include photos (uploaded separately or via external storage).

**Guards:**

- `AuthGuard` — JWT required (user must be the project sponsor)

---

## Admin / Underwriting

### Approve a Project (Set Grade & Terms)

```
POST /admin/projects/:id/approve
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "grade": "B",
  "expectedPct": 18,
  "downsidePct": 4
}

Response (201 Created):
{
  "id": "kiambu-poultry",
  "status": "approved",
  "grade": "B",
  "expectedPct": 18,
  "downsidePct": 4
}
```

Admin approves a project and sets the risk grade and return terms:

- **grade** — Risk grade (A, B, C, etc.)
- **expectedPct** — Expected annualized return (18 = 18%)
- **downsidePct** — Downside scenario return (4 = 4%)

After approval, the project status changes to "approved" and appears on the marketplace for public investment.

**Guards:**

- `AuthGuard` — JWT required
- **NOTE:** In production, should be protected by an admin role guard (currently any authenticated user can approve)

---

## M-Pesa Webhooks

### STK Deposit Callback

```
POST /mpesa/stk-callback
Content-Type: application/json

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

Response (201 Created):
{
  "ResultCode": 0,
  "ResultDesc": "Accepted"
}
```

Called by Safaricom when an STK push deposit is completed. The ledger uses the M-Pesa receipt number as an idempotency key, so retries never double-credit a wallet.

**Important:**

- This endpoint is **public and unauthenticated** (Daraja calls it)
- Always returns `{ResultCode: 0}` so Safaricom stops retrying, even on errors
- Errors are logged internally but never cause a failure response

---

### B2C Withdrawal Success Callback

```
POST /mpesa/b2c-result
Content-Type: application/json

{
  "Result": {
    "ConversationID": "b2c_conv_xyz789",
    "OriginatorConversationID": "...",
    "ResultCode": 0,
    "ResultDesc": "The service request has been processed successfully.",
    "TransactionID": "LEI81C1",
    "Amount": 300,
    "ReceiverParty": 254712345678
  }
}

Response (201 Created):
{
  "ResultCode": 0,
  "ResultDesc": "Accepted"
}
```

Called by Safaricom when a B2C withdrawal succeeds. Updates the withdrawal status in the ledger.

**Auth:** None (Daraja webhook)

---

### B2C Withdrawal Timeout

```
POST /mpesa/b2c-timeout
Content-Type: application/json

{
  "Result": {
    "ConversationID": "b2c_conv_xyz789",
    "OriginatorConversationID": "...",
    "ResultCode": 500,
    "ResultDesc": "The transaction could not be processed, please contact the system administrator."
  }
}

Response (201 Created):
{
  "ResultCode": 0,
  "ResultDesc": "Accepted"
}
```

Called by Safaricom if a B2C withdrawal times out. The ledger compensates the user's wallet.

**Auth:** None (Daraja webhook)

---

## Error Responses

All endpoints may return:

```json
{
  "statusCode": 400,
  "message": "Validation failed: amountCents must be a positive integer",
  "error": "Bad Request"
}
```

Common status codes:

- **400 Bad Request** — Invalid input or business logic violation (e.g., insufficient balance)
- **401 Unauthorized** — Missing or invalid JWT token
- **403 Forbidden** — Authenticated but not authorized (e.g., KYC not verified)
- **404 Not Found** — Resource not found
- **500 Internal Server Error** — Server error (logged)

---

## Testing with cURL

### 1. Request OTP

```bash
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "254712345678"}'
```

### 2. Verify OTP (replace with actual devOtp from above)

```bash
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "254712345678", "code": "123456"}'
```

### 3. Complete KYC

```bash
TOKEN="<JWT_TOKEN_FROM_STEP_2>"
curl -X POST http://localhost:3000/auth/complete-kyc \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Check Wallet Balance

```bash
TOKEN="<JWT_TOKEN>"
curl -X GET http://localhost:3000/wallet/balance \
  -H "Authorization: Bearer $TOKEN"
```

### 5. List Projects

```bash
curl -X GET http://localhost:3000/projects
```

### 6. Submit a Project

```bash
TOKEN="<JWT_TOKEN>"
curl -X POST http://localhost:3000/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-project",
    "title": "My Farm Project",
    "venture": "farming",
    "location": "Nairobi",
    "returnModel": "fixed",
    "cycleMonths": 6,
    "minCents": 50000,
    "targetCents": 500000
  }'
```

### 7. Approve a Project (Admin)

```bash
TOKEN="<JWT_TOKEN>"
curl -X POST http://localhost:3000/admin/projects/my-project/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "grade": "B",
    "expectedPct": 15,
    "downsidePct": 3
  }'
```

### 8. Invest in a Project

```bash
TOKEN="<JWT_TOKEN>"
curl -X POST http://localhost:3000/invest/my-project \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amountCents": 100000}'
```

---

## Environment Setup

Create a `.env` file in the repository root:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/upeo

# JWT
JWT_SECRET=your-secret-key-min-32-chars-long

# M-Pesa (Daraja Sandbox)
MPESA_CONSUMER_KEY=your_safaricom_app_key
MPESA_CONSUMER_SECRET=your_safaricom_app_secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your_m_pesa_test_passkey

# Public callback URL (ngrok for local development, deployed URL for production)
PUBLIC_URL=https://your-ngrok-url.ngrok.io

# Node environment
NODE_ENV=development  # set to 'production' to disable devOtp in responses
PORT=3000
```

---

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure .env
cp .env.example .env

# 3. Create database schema
psql "$DATABASE_URL" -f packages/ledger/schema.sql
psql "$DATABASE_URL" -f packages/marketplace/schema.sql
psql "$DATABASE_URL" -f packages/api/sql/auth.sql

# 4. Run tests
npm test                              # all tests
npm run test:e2e -w @upeo/api     # API e2e only

# 5. Start dev server
npm run dev -w @upeo/api          # http://localhost:3000
```

---

## Key Invariants

- **Money is never stored** — balances are derived from journal postings on-demand
- **Double-entry principle** — every transaction sums to zero
- **Append-only ledger** — postings are immutable; reversals add new entries
- **Idempotency** — M-Pesa receipts prevent double-crediting on retries
- **48-hour cooling-off** — only way to exit an investment early (CMA regulation)
- **Advisory locks** — concurrent requests can't double-spend from a single account
