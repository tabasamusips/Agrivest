import { JournalEntry, Posting } from "./types.js";
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
export declare class Ledger {
    private entries;
    private running;
    private seenRefs;
    private seq;
    post(input: {
        kind: string;
        postings: Posting[];
        ref?: string;
        reverses?: string;
        ts?: number;
        meta?: Record<string, unknown>;
    }): JournalEntry;
    /** Reverse a prior entry by posting its mirror image. Append-only. */
    reverse(entryId: string, ts?: number): JournalEntry;
    /** Raw signed sum (debit-positive). */
    raw(account: string): number;
    /** Balance in the account's natural direction (positive = healthy). */
    balance(account: string): number;
    accounts(): string[];
    getEntries(): JournalEntry[];
    /** Should be exactly 0 at all times. */
    totalRaw(): number;
}
