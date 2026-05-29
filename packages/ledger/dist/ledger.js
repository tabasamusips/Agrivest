"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ledger = void 0;
const types_js_1 = require("./types.js");
const errors_js_1 = require("./errors.js");
/**
 * The double-entry engine. Pure, framework-free, append-only.
 *
 * Invariants it enforces on every write:
 *  - postings are integers
 *  - an entry has >= 2 postings and they sum to exactly zero
 *  - a given external `ref` posts at most once (idempotency)
 *  - nothing is ever mutated or deleted; corrections are reversing entries
 *
 * A balance is never stored as a mutable field — it is the running sum of
 * an account's postings. (Here we keep a cached running sum for speed; in
 * Postgres it's SUM(amount) or a transactionally-updated rollup row.)
 */
class Ledger {
    entries = [];
    running = new Map(); // raw signed sum per account
    seenRefs = new Set();
    seq = 0;
    post(input) {
        if (input.postings.length < 2) {
            throw new errors_js_1.LedgerError("an entry needs at least two postings");
        }
        let sum = 0;
        for (const p of input.postings) {
            if (!Number.isInteger(p.amount)) {
                throw new errors_js_1.LedgerError(`posting amount must be an integer: ${p.amount}`);
            }
            (0, types_js_1.accountType)(p.account); // throws on unknown account
            sum += p.amount;
        }
        if (sum !== 0) {
            throw new errors_js_1.LedgerError(`unbalanced entry: postings sum to ${sum}, expected 0`);
        }
        if (input.ref) {
            if (this.seenRefs.has(input.ref))
                throw new errors_js_1.IdempotencyError(input.ref);
            this.seenRefs.add(input.ref);
        }
        const entry = {
            id: `je_${++this.seq}`,
            ts: input.ts ?? Date.now(),
            kind: input.kind,
            ref: input.ref,
            reverses: input.reverses,
            postings: input.postings.map((p) => Object.freeze({ ...p })), // each posting frozen
            meta: input.meta,
        };
        Object.freeze(entry.postings);
        Object.freeze(entry);
        this.entries.push(entry);
        for (const p of entry.postings) {
            this.running.set(p.account, (this.running.get(p.account) ?? 0) + p.amount);
        }
        return entry;
    }
    /** Reverse a prior entry by posting its mirror image. Append-only. */
    reverse(entryId, ts) {
        const e = this.entries.find((x) => x.id === entryId);
        if (!e)
            throw new errors_js_1.LedgerError(`no entry ${entryId}`);
        if (this.entries.some((x) => x.reverses === entryId)) {
            throw new errors_js_1.LedgerError(`entry ${entryId} already reversed`);
        }
        return this.post({
            kind: `reverse:${e.kind}`,
            reverses: entryId,
            ts,
            postings: e.postings.map((p) => ({ account: p.account, amount: -p.amount })),
            meta: { ...e.meta, reversalOf: entryId },
        });
    }
    /** Raw signed sum (debit-positive). */
    raw(account) {
        const v = this.running.get(account) ?? 0;
        return v === 0 ? 0 : v; // collapse -0
    }
    /** Balance in the account's natural direction (positive = healthy). */
    balance(account) {
        const r = this.raw(account);
        const v = (0, types_js_1.isDebitNormal)((0, types_js_1.accountType)(account)) ? r : -r;
        return v === 0 ? 0 : v; // collapse -0 (a credit-normal account at zero negates to -0)
    }
    accounts() {
        return [...this.running.keys()];
    }
    getEntries() {
        return this.entries.slice();
    }
    /** Should be exactly 0 at all times. */
    totalRaw() {
        let s = 0;
        for (const v of this.running.values())
            s += v;
        return s;
    }
}
exports.Ledger = Ledger;
