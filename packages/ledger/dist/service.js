"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Upeo = void 0;
const ledger_js_1 = require("./ledger.js");
const prorata_js_1 = require("./prorata.js");
const money_js_1 = require("./money.js");
const errors_js_1 = require("./errors.js");
const COOLING_OFF_MS = 48 * 60 * 60 * 1000; // CMA-mandated 48h cooling-off
/**
 * Agri Vest money operations expressed as balanced journal entries.
 * Each method below is the *domain* layer; in NestJS each call runs inside a
 * single SERIALIZABLE DB transaction so the read-then-write guards are safe
 * under concurrency (see README).
 */
class Upeo {
    coolingOffMs;
    ledger = new ledger_js_1.Ledger();
    investments = new Map();
    constructor(coolingOffMs = COOLING_OFF_MS) {
        this.coolingOffMs = coolingOffMs;
    }
    /** Investor wallet balance (what we owe them and they can act on). */
    available(user) {
        return this.ledger.balance(`wallet:${user}`);
    }
    /** M-Pesa STK push settles → cash enters custody, credited to the wallet. */
    deposit(user, amount, mpesaRef) {
        this.requirePositive(amount);
        return this.ledger.post({
            kind: "deposit",
            ref: mpesaRef,
            postings: [
                { account: "mpesa_clearing", amount: +amount }, // asset up
                { account: `wallet:${user}`, amount: -amount }, // liability up (we owe user)
            ],
            meta: { user },
        });
    }
    /** Commit wallet funds into a project's escrow (solo or pooled). */
    invest(user, project, amount, ts = Date.now()) {
        this.requirePositive(amount);
        if (this.available(user) < amount) {
            throw new errors_js_1.InsufficientFundsError(`wallet:${user} has ${this.available(user)}, cannot invest ${amount}`);
        }
        const entry = this.ledger.post({
            kind: "invest",
            ts,
            postings: [
                { account: `wallet:${user}`, amount: +amount }, // liability down
                { account: `escrow:${project}`, amount: -amount }, // liability up
            ],
            meta: { user, project },
        });
        this.investments.set(entry.id, {
            entryId: entry.id, investor: user, project, amount, ts, status: "active",
        });
        return entry;
    }
    /** Penalty-free cancellation within 48h — reverses the investment cleanly. */
    refundCoolingOff(entryId, now = Date.now()) {
        const inv = this.investments.get(entryId);
        if (!inv)
            throw new errors_js_1.LedgerError(`no investment for entry ${entryId}`);
        if (inv.status !== "active")
            throw new errors_js_1.CoolingOffError("investment is not active");
        if (now > inv.ts + this.coolingOffMs) {
            throw new errors_js_1.CoolingOffError("48-hour cooling-off window has passed");
        }
        const rev = this.ledger.reverse(entryId, now);
        inv.status = "refunded";
        return rev;
    }
    /** Milestone escrow release: cash leaves custody to the sponsor. */
    disburse(project, amount, payoutRef) {
        this.requirePositive(amount);
        if (this.ledger.balance(`escrow:${project}`) < amount) {
            throw new errors_js_1.InsufficientFundsError(`escrow:${project} cannot cover ${amount}`);
        }
        return this.ledger.post({
            kind: "disburse",
            ref: payoutRef,
            postings: [
                { account: `escrow:${project}`, amount: +amount }, // liability down
                { account: "mpesa_clearing", amount: -amount }, // asset down (cash out)
            ],
            meta: { project },
        });
    }
    /** Take a platform fee out of a liability pool into income. */
    chargeFee(fromAccount, amount, note) {
        this.requirePositive(amount);
        if (this.ledger.balance(fromAccount) < amount) {
            throw new errors_js_1.InsufficientFundsError(`${fromAccount} cannot cover fee ${amount}`);
        }
        return this.ledger.post({
            kind: "fee",
            postings: [
                { account: fromAccount, amount: +amount }, // liability down
                { account: "platform_fees", amount: -amount }, // income up
            ],
            meta: { note },
        });
    }
    /** Sponsor repays principal + return → enters custody, owed to investors. */
    recordReturn(project, amount, mpesaRef) {
        this.requirePositive(amount);
        return this.ledger.post({
            kind: "return",
            ref: mpesaRef,
            postings: [
                { account: "mpesa_clearing", amount: +amount }, // asset up
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
    payoutProRata(project) {
        const pool = this.ledger.balance(`returns:${project}`);
        const actives = [...this.investments.values()].filter((i) => i.project === project && i.status === "active");
        if (actives.length === 0 || pool <= 0)
            return [];
        const alloc = (0, prorata_js_1.splitProRata)(pool, actives.map((i) => i.amount));
        const result = [];
        actives.forEach((inv, idx) => {
            const amt = alloc[idx];
            if (amt == null || amt <= 0)
                return;
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
    withdraw(user, amount, mpesaRef) {
        this.requirePositive(amount);
        if (this.available(user) < amount) {
            throw new errors_js_1.InsufficientFundsError(`wallet:${user} cannot cover ${amount}`);
        }
        return this.ledger.post({
            kind: "withdraw",
            ref: mpesaRef,
            postings: [
                { account: `wallet:${user}`, amount: +amount }, // liability down
                { account: "mpesa_clearing", amount: -amount }, // asset down
            ],
            meta: { user },
        });
    }
    requirePositive(amount) {
        (0, money_js_1.assertInt)(amount);
        if (amount <= 0)
            throw new errors_js_1.LedgerError(`amount must be positive: ${amount}`);
    }
}
exports.Upeo = Upeo;
