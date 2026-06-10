import { Queryable } from "./db.js";
/**
 * Postgres-backed Agri Vest money operations. Same semantics as the in-memory
 * service; every method is one transaction, and the read-then-write guards take
 * a per-account advisory lock so concurrent requests can't double-spend.
 */
export declare class PgUpeo {
    private db;
    private coolingOffMs;
    constructor(db: Queryable, coolingOffMs?: number);
    available(user: string): Promise<number>;
    balanceOf(account: string): Promise<number>;
    deposit(user: string, amount: number, mpesaRef: string): Promise<number>;
    invest(user: string, project: string, amount: number): Promise<number>;
    refundCoolingOff(entryId: number, now?: number): Promise<void>;
    disburse(project: string, amount: number, payoutRef?: string): Promise<number>;
    recordReturn(project: string, amount: number, mpesaRef: string): Promise<number>;
    chargeFee(fromAccount: string, amount: number, note?: string): Promise<number>;
    payoutProRata(project: string): Promise<{
        investor: string;
        amount: number;
    }[]>;
    withdraw(user: string, amount: number, mpesaRef: string): Promise<number>;
    private requirePositive;
}
/** Reconciliation straight off the rollup table. Throws on any problem. */
export declare function assertInvariantsPg(db: Queryable): Promise<void>;
export declare function reconcileExternalPg(db: Queryable, statementCents: number): Promise<{
    onLedger: number;
    statement: number;
    drift: number;
}>;
