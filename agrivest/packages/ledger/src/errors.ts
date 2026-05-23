export class LedgerError extends Error {}
export class IdempotencyError extends LedgerError {
  constructor(public ref: string) { super(`duplicate entry for ref "${ref}"`); }
}
export class InsufficientFundsError extends LedgerError {}
export class CoolingOffError extends LedgerError {}
export class ReconcileError extends LedgerError {}
