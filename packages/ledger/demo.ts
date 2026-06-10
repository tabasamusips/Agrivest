/** Narrated lifecycle: run with `npx tsx demo.ts` */
import { Upeo } from "./src/service.js";
import { assertInvariants, reconcileExternal } from "./src/reconcile.js";
import { KES, fmt } from "./src/money.js";

const av = new Upeo();
const show = (label: string) => {
  console.log(`\n— ${label} —`);
  for (const a of av.ledger.accounts()) console.log(`   ${a.padEnd(18)} ${fmt(av.ledger.balance(a))}`);
  console.log(`   ${"zero-sum?".padEnd(18)} ${av.ledger.totalRaw() === 0 ? "yes ✓" : "NO ✗"}`);
};

console.log("AGRI VEST — pooled investment lifecycle\n========================================");
av.deposit("amina", KES(50000), "MP-1");
av.deposit("brian", KES(30000), "MP-2");
av.deposit("carol", KES(20000), "MP-3");
show("Three investors fund their wallets via M-Pesa");

av.invest("amina", "kiambu-poultry", KES(50000));
av.invest("brian", "kiambu-poultry", KES(30000));
av.invest("carol", "kiambu-poultry", KES(20000));
show("They pool KES 100,000 into the project escrow");

av.disburse("kiambu-poultry", KES(100000), "B2C-1");
show("Milestone release: escrow disbursed to the sponsor");

av.recordReturn("kiambu-poultry", KES(118000), "MP-RET-1");
av.chargeFee("returns:kiambu-poultry", KES(1800), "10% carry on profit");
const payouts = av.payoutProRata("kiambu-poultry");
show("Sponsor repays 18%; platform takes carry; pool paid out pro-rata");

console.log("\nPayouts:", payouts.map(p => `${p.investor}=${fmt(p.amount)}`).join("  "));
assertInvariants(av);
console.log("Reconciliation against custodian statement:",
  reconcileExternal(av, KES(118000)).drift === 0 ? "matches ✓" : "DRIFT ✗");
console.log("All invariants hold ✓");
