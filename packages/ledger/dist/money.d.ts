/**
 * Money is stored EVERYWHERE as integer minor units (cents).
 * Floats never touch a balance. KES has 100 cents; USD (diaspora) too.
 * M-Pesa moves whole shillings today, but a ledger that may hold USD and
 * apply percentage fees needs sub-unit precision; integer cents give it
 * without ever risking float drift.
 */
export type Cents = number;
/** Build cents from a shillings/dollars figure with at most 2 decimals. */
export declare const KES: (shillings: number) => Cents;
export declare function assertInt(n: number, what?: string): void;
/** Human-readable. Negative shown with a leading minus. */
export declare const fmt: (c: Cents) => string;
