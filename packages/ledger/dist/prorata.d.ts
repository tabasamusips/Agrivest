/**
 * Split an integer `total` across integer `weights` so the parts sum EXACTLY
 * to `total` — no cent created or lost. Largest-remainder method: floor every
 * share, then hand the leftover cents to the largest fractional parts.
 */
export declare function splitProRata(total: number, weights: number[]): number[];
