import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { migrate } from "../src/db.js";
import { PgAgriVest } from "../src/pg.js";
import { PaymentsService } from "../src/mpesa/payments.js";
import {
  darajaTimestamp, stkPassword, centsToWholeKES, parseStkCallback, parseB2CResult,
  DarajaClient,
} from "../src/mpesa/daraja.js";
import { KES } from "../src/money.js";

test("daraja helpers: timestamp, password, cents->shillings guard", () => {
  assert.match(darajaTimestamp(new Date("2026-05-23T09:41:05")), /^20260523094105$/);
  assert.equal(stkPassword("174379", "passkey", "20260523094105"),
    Buffer.from("174379passkey20260523094105").toString("base64"));
  assert.equal(centsToWholeKES(KES(500)), 500);
  assert.throws(() => centsToWholeKES(12345)); // 123.45 shillings -> refused
});

test("parseStkCallback extracts receipt + amount on success, flags failure", () => {
  const ok = parseStkCallback({ Body: { stkCallback: {
    CheckoutRequestID: "ws_CO_1", ResultCode: 0, ResultDesc: "ok",
    CallbackMetadata: { Item: [
      { Name: "Amount", Value: 500 }, { Name: "MpesaReceiptNumber", Value: "QABC123" },
      { Name: "PhoneNumber", Value: 254712345678 },
    ]},
  }}});
  assert.equal(ok.success, true);
  assert.equal(ok.receipt, "QABC123");
  assert.equal(ok.amountKES, 500);

  const cancelled = parseStkCallback({ Body: { stkCallback: {
    CheckoutRequestID: "ws_CO_2", ResultCode: 1032, ResultDesc: "cancelled by user",
  }}});
  assert.equal(cancelled.success, false);
  assert.equal(cancelled.receipt, undefined);
});

/** A fake Daraja so we can drive the whole deposit path with no network. */
class FakeDaraja implements DarajaClient {
  public lastStk: any;
  async stkPush(p: any) { this.lastStk = p; return {
    MerchantRequestID: "m1", CheckoutRequestID: "ws_CO_DEP1", ResponseCode: "0",
  }; }
  async b2c() { return { ConversationID: "c1", OriginatorConversationID: "oc1", ResponseCode: "0" }; }
}

test("deposit flow: STK push -> callback -> wallet credited, and idempotent on retry", async () => {
  const db = await PGlite.create();
  await migrate(db);
  const ledger = new PgAgriVest(db);
  const daraja = new FakeDaraja();
  const pay = new PaymentsService(db, ledger, daraja);

  const { checkoutRequestId } = await pay.initiateDeposit("amina", KES(500), "254712345678");
  assert.equal(daraja.lastStk.amountKES, 500); // converted to whole shillings
  assert.equal(await ledger.available("amina"), 0); // nothing yet — awaiting approval

  const cb = parseStkCallback({ Body: { stkCallback: {
    CheckoutRequestID: checkoutRequestId, ResultCode: 0, ResultDesc: "ok",
    CallbackMetadata: { Item: [
      { Name: "Amount", Value: 500 }, { Name: "MpesaReceiptNumber", Value: "QXYZ987" },
      { Name: "PhoneNumber", Value: 254712345678 },
    ]},
  }}});
  await pay.handleStkCallback(cb);
  assert.equal(await ledger.available("amina"), KES(500)); // credited

  await pay.handleStkCallback(cb); // Daraja retries the callback...
  assert.equal(await ledger.available("amina"), KES(500)); // ...no double-credit
});

test("withdrawal flow: wallet debited, B2C failure compensates", async () => {
  const db = await PGlite.create();
  await migrate(db);
  const ledger = new PgAgriVest(db);
  const pay = new PaymentsService(db, ledger, new FakeDaraja());
  await ledger.deposit("bob", KES(1000), "seed");

  const { conversationId } = await pay.initiateWithdrawal("bob", KES(700), "254700000000");
  assert.equal(await ledger.available("bob"), KES(300)); // debited immediately

  // B2C fails downstream -> money returned
  await pay.handleB2CResult({ originatorConversationId: conversationId, success: false, resultDesc: "failed" });
  assert.equal(await ledger.available("bob"), KES(1000)); // compensated
});
