import { test } from "node:test";
import assert from "node:assert/strict";
import { AgriVest } from "../src/service.js";
import { assertInvariants, reconcileExternal } from "../src/reconcile.js";
import { KES } from "../src/money.js";
import { InsufficientFundsError, CoolingOffError } from "../src/errors.js";

test("deposit then invest moves wallet -> escrow; can't over-invest", () => {
  const av = new AgriVest();
  av.deposit("alice", KES(5000), "MP1");
  assert.equal(av.available("alice"), KES(5000));
  av.invest("alice", "p1", KES(3000));
  assert.equal(av.available("alice"), KES(2000));
  assert.equal(av.ledger.balance("escrow:p1"), KES(3000));
  assert.throws(() => av.invest("alice", "p1", KES(9999)), InsufficientFundsError);
  assertInvariants(av);
});

test("cooling-off: refund inside 48h works, outside fails, and is one-shot", () => {
  const av = new AgriVest();
  av.deposit("bob", KES(1000), "MP2");
  const t0 = Date.now();
  const e = av.invest("bob", "p1", KES(1000), t0);
  assert.equal(av.available("bob"), 0);

  // 49h later -> too late
  assert.throws(() => av.refundCoolingOff(e.id, t0 + 49 * 3600 * 1000), CoolingOffError);
  // 1h later -> fine
  av.refundCoolingOff(e.id, t0 + 1 * 3600 * 1000);
  assert.equal(av.available("bob"), KES(1000));   // restored
  assert.equal(av.ledger.balance("escrow:p1"), 0);
  // can't refund twice
  assert.throws(() => av.refundCoolingOff(e.id, t0 + 1 * 3600 * 1000), CoolingOffError);
  assertInvariants(av);
});

test("full pooled lifecycle reconciles to the cent", () => {
  const av = new AgriVest();
  // three pooled investors
  av.deposit("a", KES(50000), "D-a");
  av.deposit("b", KES(30000), "D-b");
  av.deposit("c", KES(20000), "D-c");
  av.invest("a", "p1", KES(50000));
  av.invest("b", "p1", KES(30000));
  av.invest("c", "p1", KES(20000));
  assert.equal(av.ledger.balance("escrow:p1"), KES(100000));

  // milestone release of the full raise to the sponsor
  av.disburse("p1", KES(100000), "B2C-1");
  assert.equal(av.ledger.balance("escrow:p1"), 0);
  assert.equal(av.ledger.balance("mpesa_clearing"), 0); // 100k in (deposits) - 100k out

  // sponsor returns principal + 18% gross
  av.recordReturn("p1", KES(118000), "R-1");
  // platform takes 10% carry on the 18,000 profit = 1,800
  av.chargeFee("returns:p1", KES(1800), "10% carry on profit");
  assert.equal(av.ledger.balance("returns:p1"), KES(116200));

  // distribute the net pool pro-rata to committed capital
  const payouts = av.payoutProRata("p1");
  const byInvestor = Object.fromEntries(payouts.map((p) => [p.investor, p.amount]));
  assert.equal(byInvestor.a, KES(58100)); // 50% of 116,200
  assert.equal(byInvestor.b, KES(34860)); // 30%
  assert.equal(byInvestor.c, KES(23240)); // 20%
  assert.equal(av.ledger.balance("returns:p1"), 0);

  // realised profit per investor (got back principal + profit)
  assert.equal(av.available("a"), KES(58100)); // +8,100 on 50,000
  assert.equal(av.available("b"), KES(34860)); // +4,860
  assert.equal(av.available("c"), KES(23240)); // +3,240
  assert.equal(av.ledger.balance("platform_fees"), KES(1800));

  // conservation of profit: investor gains + platform fee == sponsor's 18,000
  const investorProfit = KES(8100) + KES(4860) + KES(3240);
  assert.equal(investorProfit + KES(1800), KES(18000));

  // books balance, cash on hand matches the custodian statement
  assertInvariants(av);
  assert.equal(reconcileExternal(av, KES(118000)).drift, 0);

  // investor withdraws to M-Pesa
  av.withdraw("a", KES(58100), "W-a");
  assert.equal(av.available("a"), 0);
  assertInvariants(av);
  assert.equal(reconcileExternal(av, KES(59900)).drift, 0); // 118,000 - 58,100
});

test("pooled payout with an awkward pool still reconciles exactly", () => {
  const av = new AgriVest();
  for (const [u, amt, ref] of [["x", 1, "dx"], ["y", 1, "dy"], ["z", 1, "dz"]] as const) {
    av.deposit(u, KES(amt), ref);
    av.invest(u, "p2", KES(amt));
  }
  av.disburse("p2", KES(3), "b2");
  av.recordReturn("p2", KES(4), "r2"); // 1.00 profit across three equal investors
  const payouts = av.payoutProRata("p2");
  assert.equal(payouts.reduce((s, p) => s + p.amount, 0), KES(4)); // no cent lost
  assert.equal(av.ledger.balance("returns:p2"), 0);
  assertInvariants(av);
});
