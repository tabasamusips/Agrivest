# @agrivest/api

NestJS HTTP layer over `@agrivest/ledger`. Auth (phone OTP → JWT), wallet
(deposit via M-Pesa STK push, withdraw via B2C), investing (solo/pooled +
cooling-off cancel), and the public Daraja webhooks.

## Run
```bash
cp ../../.env.example ../../.env   # fill DATABASE_URL, JWT_SECRET, MPESA_*
npm run dev -w @agrivest/api       # tsx watch
# or
npm run build -w @agrivest/api && node dist/main.js
```

## How money operations stay safe
Each money route runs through `withClient`, which checks out **one pooled `pg`
client** so the transaction and its `pg_advisory_xact_lock` share a single
connection. The ledger does the rest (balance guard, double-entry, idempotency).

## Notes
- `AuthGuard` protects wallet/invest routes; M-Pesa webhooks are intentionally
  public (Daraja calls them) and always ACK `{ResultCode:0}`.
- `projects` is a stub — replace with a real marketplace service/tables.
- In production set `NODE_ENV=production` so OTPs are not returned in responses.
