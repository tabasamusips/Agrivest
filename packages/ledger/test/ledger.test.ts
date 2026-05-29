import { test } from "node:test";
import assert from "node:assert/strict";
import { Ledger } from "../src/ledger.js";
import { splitProRata } from "../src/prorata.js";
import { KES } from "../src/money.js";
import { LedgerError, IdempotencyError } from "../src/errors.js";

test("rejects an unbalanced entry (debits != credits)", () => {
  const L = new Ledger();
  assert.throws(() => L.post({
    kind: "bad",
    postings: [{ account: "mpesa_clearing", amount: 100 }, { account: "wallet:a", amount: -90 }],
  }), LedgerError);
});

test("rejects non-integer amounts", () => {
  const L = new Ledger();
  assert.throws(() => L.post({
    kind: "bad",
    postings: [{ account: "mpesa_clearing", amount: 10.5 }, { account: "wallet:a", amount: -10.5 }],
  }), LedgerError);
});

test("rejects an unknown account", () => {
  const L = new Ledger();
  assert.throws(() => L.post({
    kind: "bad",
    postings: [{ account: "mpesa_clearing", amount: 100 }, { account: "mystery", amount: -100 }],
  }));
});

test("idempotency: a ref can post only once", () => {
  const L = new Ledger();
  const e = () => L.post({
    kind: "deposit", ref: "MPESA-XYZ",
    postings: [{ account: "mpesa_clearing", amount: 100 }, { account: "wallet:a", amount: -100 }],
  });
  e();
  assert.throws(e, IdempotencyError);
});

test("balances read in natural direction; ledger stays zero-sum", () => {
  const L = new Ledger();
  L.post({ kind: "deposit", postings: [
    { account: "mpesa_clearing", amount: KES(1000) },
    { account: "wallet:a", amount: -KES(1000) },
  ]});
  assert.equal(L.balance("mpesa_clearing"), KES(1000)); // asset, debit-normal
  assert.equal(L.balance("wallet:a"), KES(1000));        // liability, credit-normal
  assert.equal(L.totalRaw(), 0);
});

test("append-only: postings are frozen and reversal adds a new mirror entry", () => {
  const L = new Ledger();
  const e = L.post({ kind: "invest", postings: [
    { account: "wallet:a", amount: KES(500) },
    { account: "escrow:p1", amount: -KES(500) },
  ]});
  const before = e.postings[0]!.amount;
  try { (e.postings as any)[0].amount = 999; } catch { /* strict throws; non-strict ignores */ }
  assert.equal(e.postings[0]!.amount, before); // immutable either way
  assert.ok(Object.isFrozen(e.postings[0]));
  const r = L.reverse(e.id);
  assert.equal(r.reverses, e.id);
  assert.equal(L.getEntries().length, 2);          // original remains
  assert.equal(L.balance("escrow:p1"), 0);          // net effect undone
  assert.throws(() => L.reverse(e.id), LedgerError); // can't double-reverse
});

test("splitProRata sums EXACTLY to total with awkward remainders", () => {
  assert.deepEqual(splitProRata(100, [1, 1, 1]), [34, 33, 33]);   // sums 100
  assert.deepEqual(splitProRata(10, [1, 1, 1]), [4, 3, 3]);       // sums 10
  for (const total of [1, 7, 999, 100003, KES(116200)]) {
    for (const weights of [[1,1,1],[5,3,2],[7,11,13,2],[1]]) {
      const parts = splitProRata(total, weights);
      assert.equal(parts.reduce((a,b)=>a+b,0), total, `total ${total} weights ${weights}`);
      assert.ok(parts.every((p)=>p>=0));
    }
  }
});
