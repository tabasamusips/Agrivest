import { Ledger } from "./ledger.js";
/**
 * Agri Vest money operations expressed as balanced journal entries.
 * Each method below is the *domain* layer; in NestJS each call runs inside a
 * single SERIALIZABLE DB transaction so the read-then-write guards are safe
 * under concurrency (see README).
 */
export declare class Upeo {
    private coolingOffMs;
    readonly ledger: Ledger;
    private investments;
    constructor(coolingOffMs?: number);
    /** Investor wallet balance (what we owe them and they can act on). */
    available(user: string): number;
    /** M-Pesa STK push settles → cash enters custody, credited to the wallet. */
    deposit(user: string, amount: number, mpesaRef: string): import("./types.js").JournalEntry;
    /** Commit wallet funds into a project's escrow (solo or pooled). */
    invest(user: string, project: string, amount: number, ts?: number): import("./types.js").JournalEntry;
    /** Penalty-free cancellation within 48h — reverses the investment cleanly. */
    refundCoolingOff(entryId: string, now?: number): import("./types.js").JournalEntry;
    /** Milestone escrow release: cash leaves custody to the sponsor. */
    disburse(project: string, amount: number, payoutRef?: string): import("./types.js").JournalEntry;
    /** Take a platform fee out of a liability pool into income. */
    chargeFee(fromAccount: string, amount: number, note?: string): import("./types.js").JournalEntry;
    /** Sponsor repays principal + return → enters custody, owed to investors. */
    recordReturn(project: string, amount: number, mpesaRef: string): import("./types.js").JournalEntry;
    /**
     * Distribute the whole returns pool of a project to its active investors,
     * pro-rata to committed capital, with exact remainder handling.
     * Returns the per-investor allocation.
     */
    payoutProRata(project: string): {
        investor: string;
        amount: number;
    }[];
    /** Investor cashes out to M-Pesa: cash leaves custody. */
    withdraw(user: string, amount: number, mpesaRef: string): import("./types.js").JournalEntry;
    private requirePositive;
}
