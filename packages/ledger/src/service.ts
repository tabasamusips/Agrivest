import { Ledger } from "./ledger.js";
import { splitProRata } from "./prorata.js";
import { assertInt } from "./money.js";
import { InsufficientFundsError, CoolingOffError, LedgerError } from "./errors.js";

interface Investment {
  entryId: string;
  investor: string;
  project: string;
  amount: number;
  ts: number;
  status: "active" | "refunded";
}

const COOLING_OFF_MS = 48 * 60 * 60 * 1000; // CMA-mandated 48h cooling-off

/**
 * Agri Vest money operations expressed as balanced journal entries.
 * Each method below is the *domain* layer; in NestJS each call runs inside a
 * single SERIALIZABLE DB transaction so the read-then-write guards are safe
 * under concurrency (see README).
 */
export class AgriVest {
  readonly ledger = new Ledger();
  private investments = new Map<string, Investment>();

  constructor(private coolingOffMs = COOLING_OFF_MS) {}

  /** Investor wallet balance (what we owe them and they can act on). */
  available(user: string): number {
    return this.ledger.balance(`wallet:${user}`);
  }

  /** M-Pesa STK push settles → cash enters custody, credited to the wallet. */
  deposit(user: string, amount: number, mpesaRef: string) {
    this.requirePositive(amount);
    return this.ledger.post({
      kind: "deposit",
      ref: mpesaRef,
      postings: [
        { account: "mpesa_clearing", amount: +amount }, // asset up
        { account: `wallet:${user}`, amount: -amount },  // liability up (we owe user)
      ],
      meta: { user },
    });
  }

  /** Commit wallet funds into a project's escrow (solo or pooled). */
  invest(user: string, project: string, amount: number, ts = Date.now()) {
    this.requirePositive(amount);
    if (this.available(user) < amount) {
      throw new InsufficientFundsError(
        `wallet:${user} has ${this.available(user)}, cannot invest ${amount}`
      );
    }
    const entry = this.ledger.post({
      kind: "invest",
      ts,
      postings: [
        { account: `wallet:${user}`, amount: +amount },    // liability down
        { account: `escrow:${project}`, amount: -amount },  // liability up
      ],
      meta: { user, project },
    });
    this.investments.set(entry.id, {
      entryId: entry.id, investor: user, project, amount, ts, status: "active",
    });
    return entry;
  }

  /** Penalty-free cancellation within 48h — reverses the investment cleanly. */
  refundCoolingOff(entryId: string, now = Date.now()) {
    const inv = this.investments.get(entryId);
    if (!inv) throw new LedgerError(`no investment for entry ${entryId}`);
    if (inv.status !== "active") throw new CoolingOffError("investment is not active");
    if (now > inv.ts + this.coolingOffMs) {
      throw new CoolingOffError("48-hour cooling-off window has passed");
    }
    const rev = this.ledger.reverse(entryId, now);
    inv.status = "refunded";
    return rev;
  }

  /** Milestone escrow release: cash leaves custody to the sponsor. */
  disburse(project: string, amount: number, payoutRef?: string) {
    this.requirePositive(amount);
    if (this.ledger.balance(`escrow:${project}`) < amount) {
      throw new InsufficientFundsError(`escrow:${project} cannot cover ${amount}`);
    }
    return this.ledger.post({
      kind: "disburse",
      ref: payoutRef,
      postings: [
        { account: `escrow:${project}`, amount: +amount }, // liability down
        { account: "mpesa_clearing", amount: -amount },     // asset down (cash out)
      ],
      meta: { project },
    });
  }

  /** Take a platform fee out of a liability pool into income. */
  chargeFee(fromAccount: string, amount: number, note?: string) {
    this.requirePositive(amount);
    if (this.ledger.balance(fromAccount) < amount) {
      throw new InsufficientFundsError(`${fromAccount} cannot cover fee ${amount}`);
    }
    return this.ledger.post({
      kind: "fee",
      postings: [
        { account: fromAccount, amount: +amount },     // liability down
        { account: "platform_fees", amount: -amount },  // income up
      ],
      meta: { note },
    });
  }

  /** Sponsor repays principal + return → enters custody, owed to investors. */
  recordReturn(project: string, amount: number, mpesaRef: string) {
    this.requirePositive(amount);
    return this.ledger.post({
      kind: "return",
      ref: mpesaRef,
      postings: [
        { account: "mpesa_clearing", amount: +amount },    // asset up
        { account: `returns:${project}`, amount: -amount }, // liability up
      ],
      meta: { project },
    });
  }

  /**
   * Distribute the whole returns pool of a project to its active investors,
   * pro-rata to committed capital, with exact remainder handling.
   * Returns the per-investor allocation.
   */
  payoutProRata(project: string): { investor: string; amount: number }[] {
    const pool = this.ledger.balance(`returns:${project}`);
    const actives = [...this.investments.values()].filter(
      (i) => i.project === project && i.status === "active"
    );
    if (actives.length === 0 || pool <= 0) return [];

    const alloc = splitProRata(pool, actives.map((i) => i.amount));
    const result: { investor: string; amount: number }[] = [];

    actives.forEach((inv, idx) => {
      const amt = alloc[idx];
      if (amt == null || amt <= 0) return;
      this.ledger.post({
        kind: "payout",
        postings: [
          { account: `returns:${project}`, amount: +amt }, // liability down
          { account: `wallet:${inv.investor}`, amount: -amt }, // liability up (we owe investor)
        ],
        meta: { project, investor: inv.investor },
      });
      result.push({ investor: inv.investor, amount: amt });
    });
    return result;
  }

  /** Investor cashes out to M-Pesa: cash leaves custody. */
  withdraw(user: string, amount: number, mpesaRef: string) {
    this.requirePositive(amount);
    if (this.available(user) < amount) {
      throw new InsufficientFundsError(`wallet:${user} cannot cover ${amount}`);
    }
    return this.ledger.post({
      kind: "withdraw",
      ref: mpesaRef,
      postings: [
        { account: `wallet:${user}`, amount: +amount }, // liability down
        { account: "mpesa_clearing", amount: -amount },  // asset down
      ],
      meta: { user },
    });
  }

  private requirePositive(amount: number) {
    assertInt(amount);
    if (amount <= 0) throw new LedgerError(`amount must be positive: ${amount}`);
  }
}
