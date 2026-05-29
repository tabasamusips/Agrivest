import "reflect-metadata";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { PGlite } from "@electric-sql/pglite";
import { migrate, KES } from "@agrivest/ledger";
import { migrateMarketplace } from "@agrivest/marketplace";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "../src/app.module.js";
import { PG_POOL } from "../src/ledger/ledger.module.js";

/** Adapt a single PGlite instance to the bits of pg.Pool the API uses. */
function pglitePool(db: any) {
  const client = {
    query: (sql: string, params?: any[]) => db.query(sql, params),
    exec: (sql: string) => db.exec(sql),
    release() {},
  };
  return {
    query: (sql: string, params?: any[]) => db.query(sql, params),
    connect: async () => client,
  };
}

const PHONE = "254712345678";
let app: INestApplication;
let db: any;
let http: any;
let token = "";
let entryId = 0;

before(async () => {
  db = await PGlite.create();
  await migrate(db);
  await migrateMarketplace(db);
  await db.exec(`CREATE TABLE IF NOT EXISTS kyc(
    user_id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'pending',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
  // seed a sponsor so this user can list a project
  await db.query("INSERT INTO sponsor(id,name) VALUES ($1,'Wanjiku Farms')", [PHONE]);

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PG_POOL).useValue(pglitePool(db))
    .compile();
  app = moduleRef.createNestApplication();
  await app.init();
  http = app.getHttpServer();
});

after(async () => { await app?.close(); });

test("auth: request + verify OTP yields a JWT", async () => {
  const otpRes = await request(http).post("/auth/request-otp").send({ phone: PHONE }).expect(201);
  const code = otpRes.body.devOtp;
  assert.ok(code, "dev OTP returned outside production");
  const verRes = await request(http).post("/auth/verify-otp").send({ phone: PHONE, code }).expect(201);
  token = verRes.body.token;
  assert.ok(token);
});

test("wallet starts empty", async () => {
  const res = await request(http).get("/wallet/balance").set("Authorization", `Bearer ${token}`).expect(200);
  assert.equal(res.body.cents, 0);
});

test("M-Pesa STK callback credits the wallet (and is idempotent)", async () => {
  // seed the intent (initiateDeposit would call Daraja; we simulate the inbound callback)
  await db.query(
    "INSERT INTO payment_intent(id,kind,account_ref,amount,phone) VALUES ('ws_CO_E2E','deposit',$1,$2,$3)",
    [PHONE, KES(500), PHONE]);
  const callback = { Body: { stkCallback: {
    CheckoutRequestID: "ws_CO_E2E", ResultCode: 0, ResultDesc: "ok",
    CallbackMetadata: { Item: [
      { Name: "Amount", Value: 500 }, { Name: "MpesaReceiptNumber", Value: "QE2E001" },
      { Name: "PhoneNumber", Value: 254712345678 },
    ]},
  }}};
  await request(http).post("/mpesa/stk-callback").send(callback).expect(201);
  await request(http).post("/mpesa/stk-callback").send(callback).expect(201); // retry

  const bal = await request(http).get("/wallet/balance").set("Authorization", `Bearer ${token}`).expect(200);
  assert.equal(bal.body.cents, KES(500)); // credited exactly once
});

test("investing is blocked until KYC, then allowed", async () => {
  await request(http).post("/projects").set("Authorization", `Bearer ${token}`)
    .send({ id: "kiambu-poultry", title: "Kiambu Broiler Poultry", venture: "poultry",
            location: "Kiambu", returnModel: "fixed", cycleMonths: 4,
            minCents: KES(500), targetCents: KES(1000) }).expect(201);
  await request(http).post("/admin/projects/kiambu-poultry/approve").set("Authorization", `Bearer ${token}`)
    .send({ grade: "B", expectedPct: 18, downsidePct: 4 }).expect(201);

  // gated by KYC -> 403
  await request(http).post("/invest/kiambu-poultry").set("Authorization", `Bearer ${token}`)
    .send({ amountCents: KES(500) }).expect(403);

  await request(http).post("/auth/complete-kyc").set("Authorization", `Bearer ${token}`).expect(201);

  const inv = await request(http).post("/invest/kiambu-poultry").set("Authorization", `Bearer ${token}`)
    .send({ amountCents: KES(500) }).expect(201);
  entryId = inv.body.entryId;
  assert.ok(entryId);

  const bal = await request(http).get("/wallet/balance").set("Authorization", `Bearer ${token}`).expect(200);
  assert.equal(bal.body.cents, 0); // wallet moved into escrow
});

test("projects list shows live funding from the ledger", async () => {
  const res = await request(http).get("/projects").expect(200);
  const p = res.body.find((x: any) => x.id === "kiambu-poultry");
  assert.equal(p.raised, KES(500));
  assert.equal(p.funded_pct, 50);
  assert.equal(p.investors, 1);
});

test("cooling-off cancel refunds the investor", async () => {
  await request(http).post(`/invest/cancel/${entryId}`).set("Authorization", `Bearer ${token}`).expect(201);
  const bal = await request(http).get("/wallet/balance").set("Authorization", `Bearer ${token}`).expect(200);
  assert.equal(bal.body.cents, KES(500)); // money back
});
