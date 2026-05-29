"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fmt = exports.KES = void 0;
exports.assertInt = assertInt;
/** Build cents from a shillings/dollars figure with at most 2 decimals. */
const KES = (shillings) => {
    const c = Math.round(shillings * 100);
    if (Math.abs(c - shillings * 100) > 1e-6) {
        throw new Error(`Money supports at most 2 decimal places: ${shillings}`);
    }
    return c;
};
exports.KES = KES;
function assertInt(n, what = "amount") {
    if (!Number.isInteger(n)) {
        throw new Error(`${what} must be an integer (minor units), got ${n}`);
    }
}
/** Human-readable. Negative shown with a leading minus. */
const fmt = (c) => (c < 0 ? "-" : "") + "KES " +
    (Math.abs(c) / 100).toLocaleString("en-KE", {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
exports.fmt = fmt;
