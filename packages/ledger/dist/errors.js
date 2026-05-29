"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconcileError = exports.CoolingOffError = exports.InsufficientFundsError = exports.IdempotencyError = exports.LedgerError = void 0;
class LedgerError extends Error {
}
exports.LedgerError = LedgerError;
class IdempotencyError extends LedgerError {
    ref;
    constructor(ref) {
        super(`duplicate entry for ref "${ref}"`);
        this.ref = ref;
    }
}
exports.IdempotencyError = IdempotencyError;
class InsufficientFundsError extends LedgerError {
}
exports.InsufficientFundsError = InsufficientFundsError;
class CoolingOffError extends LedgerError {
}
exports.CoolingOffError = CoolingOffError;
class ReconcileError extends LedgerError {
}
exports.ReconcileError = ReconcileError;
