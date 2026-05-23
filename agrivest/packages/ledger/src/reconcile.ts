import { AgriVest } from "./service.js";
import { accountType, isDebitNormal, mustStayNonNegative } from "./types.js";
import { ReconcileError } from "./errors.js";

/**
 * The checks an operator (and a cron job) runs to trust the books.
 * Throws ReconcileError listing every problem found.
 */
export function assertInvariants(av: AgriVest): void {
  const L = av.ledger;
  const problems: string[] = [];

  // 1. Conservation: the entire ledger nets to zero.
  if (L.totalRaw() !== 0) problems.push(`ledger not zero-sum: ${L.totalRaw()}`);

  // 2. Trial balance: total debits == total credits (in normal terms).
  let debits = 0, credits = 0;
  for (const acc of L.accounts()) {
    const bal = L.balance(acc);
    if (isDebitNormal(accountType(acc))) debits += bal;
    else credits += bal;
  }
  if (debits !== credits) {
    problems.push(`trial balance mismatch: debits=${debits} credits=${credits}`);
  }

  // 3. Accounting equation: Assets = Liabilities + Equity + Income - Expenses.
  let assets = 0, liab = 0, eqInc = 0, exp = 0;
  for (const acc of L.accounts()) {
    const t = accountType(acc), b = L.balance(acc);
    if (t === "ASSET") assets += b;
    else if (t === "LIABILITY") liab += b;
    else if (t === "INCOME" || t === "EQUITY") eqInc += b;
    else if (t === "EXPENSE") exp += b;
  }
  if (assets !== liab + eqInc - exp) {
    problems.push(`accounting equation broken: assets=${assets} != ${liab + eqInc - exp}`);
  }

  // 4. No custody account (wallet/escrow/returns) is ever overdrawn.
  for (const acc of L.accounts()) {
    if (mustStayNonNegative(acc) && L.balance(acc) < 0) {
      problems.push(`negative balance on ${acc}: ${L.balance(acc)}`);
    }
  }

  if (problems.length) throw new ReconcileError(problems.join("; "));
}

/** Compare ledger cash to the custodian/M-Pesa statement; report any drift. */
export function reconcileExternal(av: AgriVest, statementCents: number) {
  const onLedger = av.ledger.balance("mpesa_clearing");
  return { onLedger, statement: statementCents, drift: onLedger - statementCents };
}
