/**
 * Money is stored EVERYWHERE as integer minor units (cents).
 * Floats never touch a balance. KES has 100 cents; USD (diaspora) too.
 * M-Pesa moves whole shillings today, but a ledger that may hold USD and
 * apply percentage fees needs sub-unit precision; integer cents give it
 * without ever risking float drift.
 */
export type Cents = number;

/** Build cents from a shillings/dollars figure with at most 2 decimals. */
export const KES = (shillings: number): Cents => {
  const c = Math.round(shillings * 100);
  if (Math.abs(c - shillings * 100) > 1e-6) {
    throw new Error(`Money supports at most 2 decimal places: ${shillings}`);
  }
  return c;
};

export function assertInt(n: number, what = "amount"): void {
  if (!Number.isInteger(n)) {
    throw new Error(`${what} must be an integer (minor units), got ${n}`);
  }
}

/** Human-readable. Negative shown with a leading minus. */
export const fmt = (c: Cents): string =>
  (c < 0 ? "-" : "") + "KES " +
  (Math.abs(c) / 100).toLocaleString("en-KE", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
