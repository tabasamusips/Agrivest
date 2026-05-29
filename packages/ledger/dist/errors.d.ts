export declare class LedgerError extends Error {
}
export declare class IdempotencyError extends LedgerError {
    ref: string;
    constructor(ref: string);
}
export declare class InsufficientFundsError extends LedgerError {
}
export declare class CoolingOffError extends LedgerError {
}
export declare class ReconcileError extends LedgerError {
}
