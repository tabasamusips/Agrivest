# Agri Vest Ledger — Postgres persistence

The same ledger semantics as the in-memory core, now durable, with the
invariants enforced **inside the database** so the books hold regardless of
application bugs.

## What's here
- `schema.sql` — tables + triggers (the source of truth for the DB).
- `src/db.ts` — a portable `Queryable` interface, `migrate`, `withTx`, and a
  unique-violation detector. The same service code runs on **PGlite** (tests)
  and **node-postgres** (production).
- `src/pg.ts` — `PgAgriVest`: every operation is one transaction; read-then-write
  guards take a per-account advisory lock. Plus `assertInvariantsPg` /
  `reconcileExternalPg`.
- `test/pg.test.ts` — the full suite, run against real (WASM) Postgres.

## Invariants enforced by the DB itself
| Invariant | Mechanism |
|---|---|
| Every entry balances (Σ = 0) | `entry_balances` **deferred constraint trigger**, checked at COMMIT |
| Append-only | `forbid_mutation` BEFORE UPDATE/DELETE trigger on `journal_entry` + `posting` |
| Idempotency | `UNIQUE(ref)` on `journal_entry` → mapped to `IdempotencyError` |
| Fast, correct balances | `account_balance` rollup maintained by AFTER-INSERT trigger |
| No double-spend | `pg_advisory_xact_lock(account)` around each balance guard |

Verified in tests: an unbalanced entry is rejected at commit, a raw `UPDATE` on
postings is refused, a replayed M-Pesa ref doesn't double-credit, over-investing
throws, cooling-off is one-shot, and the full pooled lifecycle reconciles to the
cent with zero drift against the custodian statement.

## Wiring to production node-postgres
```ts
import { Pool } from "pg";
import { PgAgriVest } from "./src/pg.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// One pooled client per request so the transaction + advisory locks share a
// single connection:
async function handleInvest(userId: string, projectId: string, amount: number) {
  const client = await pool.connect();
  try {
    const av = new PgAgriVest(client);          // client satisfies Queryable
    return await av.invest(userId, projectId, amount);
  } finally {
    client.release();
  }
}
```
The `pg` Client exposes `.query(sql, params) -> { rows }`, exactly what
`Queryable` needs. Migrate once at deploy with `migrate(client)` (or run
`schema.sql` through your migration tool).

## Concurrency note (important)
The guards do a read-then-write (`check balance` → `insert`). Without isolation,
two concurrent withdrawals could both pass the check and overdraw. We close that
with a **per-account advisory transaction lock** (`pg_advisory_xact_lock`), which
serialises operations touching the same wallet/escrow and auto-releases at
commit/rollback. SERIALIZABLE isolation is a valid alternative; advisory locks
avoid serialization-failure retries on the hot path.

PGlite is single-connection, so the test suite proves correctness and the guard
*logic*, but a true parallel double-spend race must be exercised against a
multi-connection Postgres in CI. The lock code is identical either way.

## Still to come
M-Pesa Daraja adapter (STK push deposits, B2C payouts — pass the receipt as the
idempotency `ref`), KYC/AML, auth, and the NestJS HTTP layer. They wrap this; the
ledger doesn't change.
