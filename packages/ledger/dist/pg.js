"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PgAgriVest = void 0;
exports.assertInvariantsPg = assertInvariantsPg;
exports.reconcileExternalPg = reconcileExternalPg;
const db_js_1 = require("./db.js");
const types_js_1 = require("./types.js");
const prorata_js_1 = require("./prorata.js");
const money_js_1 = require("./money.js");
const errors_js_1 = require("./errors.js");
const COOLING_OFF_MS = 48 * 60 * 60 * 1000;
/** Lock an account for the rest of the transaction (serialises read-then-write). */
async function lockAccount(db, account) {
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1)::bigint)", [account]);
}
/** Raw signed balance from the rollup. */
async function rawBalance(db, account) {
    const r = await db.query("SELECT raw FROM account_balance WHERE account = $1", [account]);
    return r.rows.length ? Number(r.rows[0].raw) : 0;
}
/** Balance in the account's natural direction (positive = healthy). */
async function balance(db, account) {
    const raw = await rawBalance(db, account);
    const v = (0, types_js_1.isDebitNormal)((0, types_js_1.accountType)(account)) ? raw : -raw;
    return v === 0 ? 0 : v;
}
/** Low-level append. Assumes it runs inside a transaction. */
async function insertEntry(db, e) {
    if (e.postings.length < 2)
        throw new errors_js_1.LedgerError("an entry needs at least two postings");
    for (const p of e.postings) {
        if (!Number.isInteger(p.amount))
            throw new errors_js_1.LedgerError(`amount must be integer: ${p.amount}`);
        (0, types_js_1.accountType)(p.account); // throws on unknown account
    }
    let row;
    try {
        row = await db.query("INSERT INTO journal_entry(kind, ref, reverses, meta) VALUES ($1,$2,$3,$4) RETURNING id", [e.kind, e.ref ?? null, e.reverses ?? null, e.meta ? JSON.stringify(e.meta) : null]);
    }
    catch (err) {
        if ((0, db_js_1.isUniqueViolation)(err) && e.ref)
            throw new errors_js_1.IdempotencyError(e.ref);
        throw err;
    }
    const id = Number(row.rows[0].id);
    for (const p of e.postings) {
        await db.query("INSERT INTO posting(entry_id, account, amount) VALUES ($1,$2,$3)", [id, p.account, p.amount]);
    }
    return id; // the balance-to-zero trigger fires at COMMIT
}
/**
 * Postgres-backed Agri Vest money operations. Same semantics as the in-memory
 * service; every method is one transaction, and the read-then-write guards take
 * a per-account advisory lock so concurrent requests can't double-spend.
 */
class PgAgriVest {
    db;
    coolingOffMs;
    constructor(db, coolingOffMs = COOLING_OFF_MS) {
        this.db = db;
        this.coolingOffMs = coolingOffMs;
    }
    available(user) { return balance(this.db, `wallet:${user}`); }
    balanceOf(account) { return balance(this.db, account); }
    deposit(user, amount, mpesaRef) {
        this.requirePositive(amount);
        return (0, db_js_1.withTx)(this.db, () => insertEntry(this.db, {
            kind: "deposit", ref: mpesaRef, meta: { user },
            postings: [
                { account: "mpesa_clearing", amount: +amount },
                { account: `wallet:${user}`, amount: -amount },
            ],
        }));
    }
    invest(user, project, amount) {
        this.requirePositive(amount);
        return (0, db_js_1.withTx)(this.db, async () => {
            await lockAccount(this.db, `wallet:${user}`);
            if (await balance(this.db, `wallet:${user}`) < amount) {
                throw new errors_js_1.InsufficientFundsError(`wallet:${user} cannot invest ${amount}`);
            }
            const id = await insertEntry(this.db, {
                kind: "invest", meta: { user, project },
                postings: [
                    { account: `wallet:${user}`, amount: +amount },
                    { account: `escrow:${project}`, amount: -amount },
                ],
            });
            await this.db.query("INSERT INTO investment(entry_id, investor, project, amount, ts) VALUES ($1,$2,$3,$4, now())", [id, user, project, amount]);
            return id;
        });
    }
    refundCoolingOff(entryId, now = Date.now()) {
        return (0, db_js_1.withTx)(this.db, async () => {
            const r = await this.db.query("SELECT * FROM investment WHERE entry_id = $1 FOR UPDATE", [entryId]);
            if (!r.rows.length)
                throw new errors_js_1.LedgerError(`no investment for entry ${entryId}`);
            const inv = r.rows[0];
            if (inv.status !== "active")
                throw new errors_js_1.CoolingOffError("investment is not active");
            if (now > new Date(inv.ts).getTime() + this.coolingOffMs) {
                throw new errors_js_1.CoolingOffError("48-hour cooling-off window has passed");
            }
            // mirror-image reversal
            const orig = await this.db.query("SELECT account, amount FROM posting WHERE entry_id = $1", [entryId]);
            await insertEntry(this.db, {
                kind: "reverse:invest", reverses: entryId, meta: { reversalOf: entryId },
                postings: orig.rows.map((p) => ({ account: p.account, amount: -Number(p.amount) })),
            });
            // investment table is NOT under the append-only trigger; status may change
            await this.db.query("UPDATE investment SET status = 'refunded' WHERE entry_id = $1", [entryId]);
        });
    }
    disburse(project, amount, payoutRef) {
        this.requirePositive(amount);
        return (0, db_js_1.withTx)(this.db, async () => {
            await lockAccount(this.db, `escrow:${project}`);
            if (await balance(this.db, `escrow:${project}`) < amount) {
                throw new errors_js_1.InsufficientFundsError(`escrow:${project} cannot cover ${amount}`);
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
    recordReturn(project, amount, mpesaRef) {
        this.requirePositive(amount);
        return (0, db_js_1.withTx)(this.db, () => insertEntry(this.db, {
            kind: "return", ref: mpesaRef, meta: { project },
            postings: [
                { account: "mpesa_clearing", amount: +amount },
                { account: `returns:${project}`, amount: -amount },
            ],
        }));
    }
    chargeFee(fromAccount, amount, note) {
        this.requirePositive(amount);
        return (0, db_js_1.withTx)(this.db, async () => {
            await lockAccount(this.db, fromAccount);
            if (await balance(this.db, fromAccount) < amount) {
                throw new errors_js_1.InsufficientFundsError(`${fromAccount} cannot cover fee ${amount}`);
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
    payoutProRata(project) {
        return (0, db_js_1.withTx)(this.db, async () => {
            await lockAccount(this.db, `returns:${project}`);
            const pool = await balance(this.db, `returns:${project}`);
            const actives = (await this.db.query("SELECT investor, amount FROM investment WHERE project = $1 AND status = 'active' ORDER BY entry_id", [project])).rows.map((r) => ({ investor: r.investor, amount: Number(r.amount) }));
            if (!actives.length || pool <= 0)
                return [];
            const alloc = (0, prorata_js_1.splitProRata)(pool, actives.map((a) => a.amount));
            const out = [];
            for (let i = 0; i < actives.length; i++) {
                const amt = alloc[i];
                if (amt <= 0)
                    continue;
                await insertEntry(this.db, {
                    kind: "payout", meta: { project, investor: actives[i].investor },
                    postings: [
                        { account: `returns:${project}`, amount: +amt },
                        { account: `wallet:${actives[i].investor}`, amount: -amt },
                    ],
                });
                out.push({ investor: actives[i].investor, amount: amt });
            }
            return out;
        });
    }
    withdraw(user, amount, mpesaRef) {
        this.requirePositive(amount);
        return (0, db_js_1.withTx)(this.db, async () => {
            await lockAccount(this.db, `wallet:${user}`);
            if (await balance(this.db, `wallet:${user}`) < amount) {
                throw new errors_js_1.InsufficientFundsError(`wallet:${user} cannot cover ${amount}`);
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
    requirePositive(amount) {
        (0, money_js_1.assertInt)(amount);
        if (amount <= 0)
            throw new errors_js_1.LedgerError(`amount must be positive: ${amount}`);
    }
}
exports.PgAgriVest = PgAgriVest;
/** Reconciliation straight off the rollup table. Throws on any problem. */
async function assertInvariantsPg(db) {
    const rows = (await db.query("SELECT account, raw FROM account_balance")).rows
        .map((r) => ({ account: r.account, raw: Number(r.raw) }));
    const problems = [];
    const total = rows.reduce((s, r) => s + r.raw, 0);
    if (total !== 0)
        problems.push(`ledger not zero-sum: ${total}`);
    let assets = 0, liab = 0, inc = 0, exp = 0;
    for (const { account, raw } of rows) {
        const t = (0, types_js_1.accountType)(account);
        const normal = (0, types_js_1.isDebitNormal)(t) ? raw : -raw;
        if (t === "ASSET")
            assets += normal;
        else if (t === "LIABILITY")
            liab += normal;
        else if (t === "INCOME" || t === "EQUITY")
            inc += normal;
        else if (t === "EXPENSE")
            exp += normal;
        if (/^(wallet:|escrow:|returns:)/.test(account) && normal < 0) {
            problems.push(`negative balance on ${account}: ${normal}`);
        }
    }
    if (assets !== liab + inc - exp) {
        problems.push(`accounting equation broken: assets=${assets} != ${liab + inc - exp}`);
    }
    if (problems.length)
        throw new errors_js_1.ReconcileError(problems.join("; "));
}
async function reconcileExternalPg(db, statementCents) {
    const onLedger = await balance(db, "mpesa_clearing");
    return { onLedger, statement: statementCents, drift: onLedger - statementCents };
}
