"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitProRata = splitProRata;
const money_js_1 = require("./money.js");
/**
 * Split an integer `total` across integer `weights` so the parts sum EXACTLY
 * to `total` — no cent created or lost. Largest-remainder method: floor every
 * share, then hand the leftover cents to the largest fractional parts.
 */
function splitProRata(total, weights) {
    (0, money_js_1.assertInt)(total, "total");
    if (total < 0)
        throw new Error("total must be >= 0");
    const W = weights.reduce((a, b) => a + b, 0);
    if (W <= 0)
        throw new Error("weights must sum to > 0");
    const exact = weights.map((w) => (total * w) / W);
    const out = exact.map((e) => Math.floor(e));
    const remainder = total - out.reduce((a, b) => a + b, 0);
    const order = exact
        .map((e, i) => ({ i, frac: e - Math.floor(e) }))
        .sort((a, b) => b.frac - a.frac || a.i - b.i);
    for (let k = 0; k < remainder; k++) {
        const idx = order[k].i;
        out[idx] = (out[idx] ?? 0) + 1;
    }
    return out;
}
