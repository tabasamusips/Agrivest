import { Queryable, withTx, isUniqueViolation } from "./db.js";
import { accountType, isDebitNormal, Posting } from "./types.js";
import { splitProRata } from "./prorata.js";
import { assertInt } from "./money.js";
import {
  IdempotencyError, InsufficientFundsError, CoolingOffError, LedgerError, ReconcileError,
} from "./errors.js";

const COOLING_OFF_MS = 48 * 60 * 60 * 1000;

/** Lock an account for the rest of the transaction (serialises read-then-write). */
async function lockAccount(db: Queryable, account: string) {
  await db.query("SELECT pg_advisory_xact_lock(hashtext($1)::bigint)", [account]);
}

/** Raw signed balance from the rollup. */
async function rawBalance(db: Queryable, account: string): Promise<number> {
  const r = await db.query("SELECT raw FROM account_balance WHERE account = $1", [account]);
  return r.rows.length ? Number(r.rows[0].raw) : 0;
}

/** Balance in the account's natural direction (positive = healthy). */
async function balance(db: Queryable, account: string): Promise<number> {
  const raw = await rawBalance(db, account);
  const v = isDebitNormal(accountType(account)) ? raw : -raw;
  return v === 0 ? 0 : v;
}

/** Low-level append. Assumes it runs inside a transaction. */
async function insertEntry(
  db: Queryable,
  e: { kind: string; postings: Posting[]; ref?: string; reverses?: number; meta?: unknown }
): Promise<number> {
  if (e.postings.length < 2) throw new LedgerError("an entry needs at least two postings");
  for (const p of e.postings) {
    if (!Number.isInteger(p.amount)) throw new LedgerError(`amount must be integer: ${p.amount}`);
    accountType(p.account); // throws on unknown account
  }
  let row;
  try {
    row = await db.query(
      "INSERT INTO journal_entry(kind, ref, reverses, meta) VALUES ($1,$2,$3,$4) RETURNING id",
      [e.kind, e.ref ?? null, e.reverses ?? null, e.meta ? JSON.stringify(e.meta) : null]
    );
  } catch (err) {
    if (isUniqueViolation(err) && e.ref) throw new IdempotencyError(e.ref);
    throw err;
  }
  const id = Number(row.rows[0].id);
  for (const p of e.postings) {
    await db.query("INSERT INTO posting(entry_id, account, amount) VALUES ($1,$2,$3)",
      [id, p.account, p.amount]);
  }
  return id; // the balance-to-zero trigger fires at COMMIT
}

/**
 * Postgres-backed Agri Vest money operations. Same semantics as the in-memory
 * service; every method is one transaction, and the read-then-write guards take
 * a per-account advisory lock so concurrent requests can't double-spend.
 */
export class PgUpeo {
  constructor(private db: Queryable, private coolingOffMs = COOLING_OFF_MS) {}

  available(user: string) { return balance(this.db, `wallet:${user}`); }
  balanceOf(account: string) { return balance(this.db, account); }

  deposit(user: string, amount: number, mpesaRef: string) {
    this.requirePositive(amount);
    return withTx(this.db, () => insertEntry(this.db, {
      kind: "deposit", ref: mpesaRef, meta: { user },
      postings: [
        { account: "mpesa_clearing", amount: +amount },
        { account: `wallet:${user}`, amount: -amount },
      ],
    }));
  }

  invest(user: string, project: string, amount: number) {
    this.requirePositive(amount);
    return withTx(this.db, async () => {
      await lockAccount(this.db, `wallet:${user}`);
      if (await balance(this.db, `wallet:${user}`) < amount) {
        throw new InsufficientFundsError(`wallet:${user} cannot invest ${amount}`);
      }
      const id = await insertEntry(this.db, {
        kind: "invest", meta: { user, project },
        postings: [
          { account: `wallet:${user}`, amount: +amount },
          { account: `escrow:${project}`, amount: -amount },
        ],
      });
      await this.db.query(
        "INSERT INTO investment(entry_id, investor, project, amount, ts) VALUES ($1,$2,$3,$4, now())",
        [id, user, project, amount]
      );
      return id;
    });
  }

  refundCoolingOff(entryId: number, now = Date.now()) {
    return withTx(this.db, async () => {
      const r = await this.db.query("SELECT * FROM investment WHERE entry_id = $1 FOR UPDATE", [entryId]);
      if (!r.rows.length) throw new LedgerError(`no investment for entry ${entryId}`);
      const inv = r.rows[0];
      if (inv.status !== "active") throw new CoolingOffError("investment is not active");
      if (now > new Date(inv.ts).getTime() + this.coolingOffMs) {
        throw new CoolingOffError("48-hour cooling-off window has passed");
      }
      // mirror-image reversal
      const orig = await this.db.query("SELECT account, amount FROM posting WHERE entry_id = $1", [entryId]);
      await insertEntry(this.db, {
        kind: "reverse:invest", reverses: entryId, meta: { reversalOf: entryId },
        postings: orig.rows.map((p: any) => ({ account: p.account, amount: -Number(p.amount) })),
      });
      // investment table is NOT under the append-only trigger; status may change
      await this.db.query("UPDATE investment SET status = 'refunded' WHERE entry_id = $1", [entryId]);
    });
  }

  disburse(project: string, amount: number, payoutRef?: string) {
    this.requirePositive(amount);
    return withTx(this.db, async () => {
      await lockAccount(this.db, `escrow:${project}`);
      if (await balance(this.db, `escrow:${project}`) < amount) {
        throw new InsufficientFundsError(`escrow:${project} cannot cover ${amount}`);
      }
      return insertEntry(this.db, {
        kind: "disburse", ref: payoutRef, meta: { project },
        postings: [
          { account: `escrow:${project}`, amount: +amount },
          { account: "mpesa_clearing", amount: -amount },
        ],
      });
    });
  }

  recordReturn(project: string, amount: number, mpesaRef: string) {
    this.requirePositive(amount);
    return withTx(this.db, () => insertEntry(this.db, {
      kind: "return", ref: mpesaRef, meta: { project },
      postings: [
        { account: "mpesa_clearing", amount: +amount },
        { account: `returns:${project}`, amount: -amount },
      ],
    }));
  }

  chargeFee(fromAccount: string, amount: number, note?: string) {
    this.requirePositive(amount);
    return withTx(this.db, async () => {
      await lockAccount(this.db, fromAccount);
      if (await balance(this.db, fromAccount) < amount) {
        throw new InsufficientFundsError(`${fromAccount} cannot cover fee ${amount}`);
      }
      return insertEntry(this.db, {
        kind: "fee", meta: { note },
        postings: [
          { account: fromAccount, amount: +amount },
          { account: "platform_fees", amount: -amount },
        ],
      });
    });
  }

  payoutProRata(project: string): Promise<{ investor: string; amount: number }[]> {
    return withTx(this.db, async () => {
      await lockAccount(this.db, `returns:${project}`);
      const pool = await balance(this.db, `returns:${project}`);
      const actives = (await this.db.query(
        "SELECT investor, amount FROM investment WHERE project = $1 AND status = 'active' ORDER BY entry_id",
        [project]
      )).rows.map((r: any) => ({ investor: r.investor, amount: Number(r.amount) }));
      if (!actives.length || pool <= 0) return [];

      const alloc = splitProRata(pool, actives.map((a) => a.amount));
      const out: { investor: string; amount: number }[] = [];
      for (let i = 0; i < actives.length; i++) {
        const amt = alloc[i]!;
        if (amt <= 0) continue;
        await insertEntry(this.db, {
          kind: "payout", meta: { project, investor: actives[i]!.investor },
          postings: [
            { account: `returns:${project}`, amount: +amt },
            { account: `wallet:${actives[i]!.investor}`, amount: -amt },
          ],
        });
        out.push({ investor: actives[i]!.investor, amount: amt });
      }
      return out;
    });
  }

  withdraw(user: string, amount: number, mpesaRef: string) {
    this.requirePositive(amount);
    return withTx(this.db, async () => {
      await lockAccount(this.db, `wallet:${user}`);
      if (await balance(this.db, `wallet:${user}`) < amount) {
        throw new InsufficientFundsError(`wallet:${user} cannot cover ${amount}`);
      }
      return insertEntry(this.db, {
        kind: "withdraw", ref: mpesaRef, meta: { user },
        postings: [
          { account: `wallet:${user}`, amount: +amount },
          { account: "mpesa_clearing", amount: -amount },
        ],
      });
    });
  }

  private requirePositive(amount: number) {
    assertInt(amount);
    if (amount <= 0) throw new LedgerError(`amount must be positive: ${amount}`);
  }
}

/** Reconciliation straight off the rollup table. Throws on any problem. */
export async function assertInvariantsPg(db: Queryable): Promise<void> {
  const rows = (await db.query("SELECT account, raw FROM account_balance")).rows
    .map((r: any) => ({ account: r.account as string, raw: Number(r.raw) }));
  const problems: string[] = [];

  const total = rows.reduce((s, r) => s + r.raw, 0);
  if (total !== 0) problems.push(`ledger not zero-sum: ${total}`);

  let assets = 0, liab = 0, inc = 0, exp = 0;
  for (const { account, raw } of rows) {
    const t = accountType(account);
    const normal = isDebitNormal(t) ? raw : -raw;
    if (t === "ASSET") assets += normal;
    else if (t === "LIABILITY") liab += normal;
    else if (t === "INCOME" || t === "EQUITY") inc += normal;
    else if (t === "EXPENSE") exp += normal;
    if (/^(wallet:|escrow:|returns:)/.test(account) && normal < 0) {
      problems.push(`negative balance on ${account}: ${normal}`);
    }
  }
  if (assets !== liab + inc - exp) {
    problems.push(`accounting equation broken: assets=${assets} != ${liab + inc - exp}`);
  }
  if (problems.length) throw new ReconcileError(problems.join("; "));
}

export async function reconcileExternalPg(db: Queryable, statementCents: number) {
  const onLedger = await balance(db, "mpesa_clearing");
  return { onLedger, statement: statementCents, drift: onLedger - statementCents };
}
