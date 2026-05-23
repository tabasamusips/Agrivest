import { JournalEntry, Posting, accountType, isDebitNormal } from "./types.js";
import { LedgerError, IdempotencyError } from "./errors.js";

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
export class Ledger {
  private entries: JournalEntry[] = [];
  private running = new Map<string, number>(); // raw signed sum per account
  private seenRefs = new Set<string>();
  private seq = 0;

  post(input: {
    kind: string;
    postings: Posting[];
    ref?: string;
    reverses?: string;
    ts?: number;
    meta?: Record<string, unknown>;
  }): JournalEntry {
    if (input.postings.length < 2) {
      throw new LedgerError("an entry needs at least two postings");
    }
    let sum = 0;
    for (const p of input.postings) {
      if (!Number.isInteger(p.amount)) {
        throw new LedgerError(`posting amount must be an integer: ${p.amount}`);
      }
      accountType(p.account); // throws on unknown account
      sum += p.amount;
    }
    if (sum !== 0) {
      throw new LedgerError(`unbalanced entry: postings sum to ${sum}, expected 0`);
    }
    if (input.ref) {
      if (this.seenRefs.has(input.ref)) throw new IdempotencyError(input.ref);
      this.seenRefs.add(input.ref);
    }

    const entry: JournalEntry = {
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
  reverse(entryId: string, ts?: number): JournalEntry {
    const e = this.entries.find((x) => x.id === entryId);
    if (!e) throw new LedgerError(`no entry ${entryId}`);
    if (this.entries.some((x) => x.reverses === entryId)) {
      throw new LedgerError(`entry ${entryId} already reversed`);
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
  raw(account: string): number {
    const v = this.running.get(account) ?? 0;
    return v === 0 ? 0 : v; // collapse -0
  }

  /** Balance in the account's natural direction (positive = healthy). */
  balance(account: string): number {
    const r = this.raw(account);
    const v = isDebitNormal(accountType(account)) ? r : -r;
    return v === 0 ? 0 : v; // collapse -0 (a credit-normal account at zero negates to -0)
  }

  accounts(): string[] {
    return [...this.running.keys()];
  }

  getEntries(): JournalEntry[] {
    return this.entries.slice();
  }

  /** Should be exactly 0 at all times. */
  totalRaw(): number {
    let s = 0;
    for (const v of this.running.values()) s += v;
    return s;
  }
}
