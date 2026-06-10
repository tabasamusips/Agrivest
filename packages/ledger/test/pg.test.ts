import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { migrate, withTx } from "../src/db.js";
import { PgUpeo, assertInvariantsPg, reconcileExternalPg } from "../src/pg.js";
import { KES } from "../src/money.js";
import { InsufficientFundsError, CoolingOffError, IdempotencyError } from "../src/errors.js";

async function fresh() {
  const db = await PGlite.create();
  await migrate(db);
  return db;
}

test("schema migrates and the rollup tracks balances", async () => {
  const db = await fresh();
  const av = new PgUpeo(db);
  await av.deposit("a", KES(1000), "D1");
  assert.equal(await av.available("a"), KES(1000));
  assert.equal(await av.balanceOf("mpesa_clearing"), KES(1000));
  await assertInvariantsPg(db);
});

test("idempotency: replaying an M-Pesa ref does not double-credit", async () => {
  const db = await fresh();
  const av = new PgUpeo(db);
  await av.deposit("a", KES(500), "MP-DUP");
  await assert.rejects(() => av.deposit("a", KES(500), "MP-DUP"), IdempotencyError);
  assert.equal(await av.available("a"), KES(500)); // still just one credit
});

test("over-investing is rejected by the advisory-locked guard", async () => {
  const db = await fresh();
  const av = new PgUpeo(db);
  await av.deposit("a", KES(2000), "D2");
  await av.invest("a", "p1", KES(1500));
  assert.equal(await av.available("a"), KES(500));
  await assert.rejects(() => av.invest("a", "p1", KES(9999)), InsufficientFundsError);
  await assertInvariantsPg(db);
});

test("append-only: a raw UPDATE on postings is refused by the DB", async () => {
  const db = await fresh();
  const av = new PgUpeo(db);
  await av.deposit("a", KES(100), "D3");
  await assert.rejects(() => db.query("UPDATE posting SET amount = 0 WHERE account = 'wallet:a'"));
});

test("cooling-off refund works inside 48h, fails outside, one-shot", async () => {
  const db = await fresh();
  const av = new PgUpeo(db);
  await av.deposit("bob", KES(1000), "D4");
  const id = await av.invest("bob", "p1", KES(1000));
  assert.equal(await av.available("bob"), 0);

  await assert.rejects(() => av.refundCoolingOff(id, Date.now() + 49 * 3600 * 1000), CoolingOffError);
  await av.refundCoolingOff(id, Date.now() + 3600 * 1000);
  assert.equal(await av.available("bob"), KES(1000));
  assert.equal(await av.balanceOf("escrow:p1"), 0);
  await assert.rejects(() => av.refundCoolingOff(id), CoolingOffError);
  await assertInvariantsPg(db);
});

test("full pooled lifecycle reconciles to the cent (in Postgres)", async () => {
  const db = await fresh();
  const av = new PgUpeo(db);
  await av.deposit("a", KES(50000), "Da");
  await av.deposit("b", KES(30000), "Db");
  await av.deposit("c", KES(20000), "Dc");
  await av.invest("a", "p1", KES(50000));
  await av.invest("b", "p1", KES(30000));
  await av.invest("c", "p1", KES(20000));
  assert.equal(await av.balanceOf("escrow:p1"), KES(100000));

  await av.disburse("p1", KES(100000), "B2C1");
  assert.equal(await av.balanceOf("mpesa_clearing"), 0);

  await av.recordReturn("p1", KES(118000), "RET1");
  await av.chargeFee("returns:p1", KES(1800), "10% carry");
  const payouts = await av.payoutProRata("p1");
  const by = Object.fromEntries(payouts.map((p) => [p.investor, p.amount]));
  assert.equal(by.a, KES(58100));
  assert.equal(by.b, KES(34860));
  assert.equal(by.c, KES(23240));

  assert.equal(await av.available("a"), KES(58100));
  assert.equal(await av.balanceOf("platform_fees"), KES(1800));
  await assertInvariantsPg(db);
  assert.equal((await reconcileExternalPg(db, KES(118000))).drift, 0);

  await av.withdraw("a", KES(58100), "Wa");
  assert.equal(await av.available("a"), 0);
  await assertInvariantsPg(db);
  assert.equal((await reconcileExternalPg(db, KES(59900))).drift, 0);
});

test("awkward pro-rata pool loses no cent", async () => {
  const db = await fresh();
  const av = new PgUpeo(db);
  for (const u of ["x", "y", "z"]) { await av.deposit(u, KES(1), "d" + u); await av.invest(u, "p2", KES(1)); }
  await av.disburse("p2", KES(3), "b2");
  await av.recordReturn("p2", KES(4), "r2");
  const payouts = await av.payoutProRata("p2");
  assert.equal(payouts.reduce((s, p) => s + p.amount, 0), KES(4));
  assert.equal(await av.balanceOf("returns:p2"), 0);
  await assertInvariantsPg(db);
});
