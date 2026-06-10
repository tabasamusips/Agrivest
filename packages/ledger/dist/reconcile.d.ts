import { Upeo } from "./service.js";
/**
 * The checks an operator (and a cron job) runs to trust the books.
 * Throws ReconcileError listing every problem found.
 */
export declare function assertInvariants(av: Upeo): void;
/** Compare ledger cash to the custodian/M-Pesa statement; report any drift. */
export declare function reconcileExternal(av: Upeo, statementCents: number): {
    onLedger: number;
    statement: number;
    drift: number;
};
