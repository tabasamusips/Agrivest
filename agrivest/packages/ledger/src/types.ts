/** Chart-of-accounts classification and the journal data shapes. */

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";

/**
 * A posting's amount is SIGNED: positive = debit, negative = credit.
 * A journal entry is valid iff its postings sum to exactly zero
 * (debits == credits). The whole ledger therefore always sums to zero.
 */
export interface Posting {
  account: string;
  amount: number; // signed minor units
}

export interface JournalEntry {
  id: string;
  ts: number;            // epoch ms
  kind: string;          // operation name, e.g. "deposit", "invest", "payout"
  ref?: string;          // external idempotency key (e.g. M-Pesa receipt)
  reverses?: string;     // id of the entry this one reverses
  postings: Posting[];
  meta?: Record<string, unknown>;
}

/**
 * Agri Vest chart of accounts (custodial model).
 *  ASSET     mpesa_clearing      cash held at the custodian / settlement
 *  LIABILITY wallet:{userId}     funds the platform owes an investor
 *  LIABILITY escrow:{projectId}  committed funds held for a project's raise
 *  LIABILITY returns:{projectId} sponsor repayments owed to that project's investors
 *  INCOME    platform_fees       platform revenue (origination / carry)
 */
export function accountType(account: string): AccountType {
  if (account === "mpesa_clearing") return "ASSET";
  if (account === "platform_fees") return "INCOME";
  if (account.startsWith("wallet:")) return "LIABILITY";
  if (account.startsWith("escrow:")) return "LIABILITY";
  if (account.startsWith("returns:")) return "LIABILITY";
  throw new Error(`Unknown account, refusing to classify: ${account}`);
}

export const isDebitNormal = (t: AccountType): boolean =>
  t === "ASSET" || t === "EXPENSE";

/** Accounts that must never go negative in their natural direction. */
export const mustStayNonNegative = (account: string): boolean =>
  /^(wallet:|escrow:|returns:)/.test(account);
