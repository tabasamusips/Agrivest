"use strict";
/** Chart-of-accounts classification and the journal data shapes. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mustStayNonNegative = exports.isDebitNormal = void 0;
exports.accountType = accountType;
/**
 * Agri Vest chart of accounts (custodial model).
 *  ASSET     mpesa_clearing      cash held at the custodian / settlement
 *  LIABILITY wallet:{userId}     funds the platform owes an investor
 *  LIABILITY escrow:{projectId}  committed funds held for a project's raise
 *  LIABILITY returns:{projectId} sponsor repayments owed to that project's investors
 *  INCOME    platform_fees       platform revenue (origination / carry)
 */
function accountType(account) {
    if (account === "mpesa_clearing")
        return "ASSET";
    if (account === "platform_fees")
        return "INCOME";
    if (account.startsWith("wallet:"))
        return "LIABILITY";
    if (account.startsWith("escrow:"))
        return "LIABILITY";
    if (account.startsWith("returns:"))
        return "LIABILITY";
    throw new Error(`Unknown account, refusing to classify: ${account}`);
}
const isDebitNormal = (t) => t === "ASSET" || t === "EXPENSE";
exports.isDebitNormal = isDebitNormal;
/** Accounts that must never go negative in their natural direction. */
const mustStayNonNegative = (account) => /^(wallet:|escrow:|returns:)/.test(account);
exports.mustStayNonNegative = mustStayNonNegative;
