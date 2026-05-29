/** Chart-of-accounts classification and the journal data shapes. */
export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
/**
 * A posting's amount is SIGNED: positive = debit, negative = credit.
 * A journal entry is valid iff its postings sum to exactly zero
 * (debits == credits). The whole ledger therefore always sums to zero.
 */
export interface Posting {
    account: string;
    amount: number;
}
export interface JournalEntry {
    id: string;
    ts: number;
    kind: string;
    ref?: string;
    reverses?: string;
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
export declare function accountType(account: string): AccountType;
export declare const isDebitNormal: (t: AccountType) => boolean;
/** Accounts that must never go negative in their natural direction. */
export declare const mustStayNonNegative: (account: string) => boolean;
