"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const supertest_1 = __importDefault(require("supertest"));
const pglite_1 = require("@electric-sql/pglite");
const ledger_1 = require("@upeo/ledger");
const marketplace_1 = require("@upeo/marketplace");
const testing_1 = require("@nestjs/testing");
const app_module_js_1 = require("../src/app.module.js");
const ledger_module_js_1 = require("../src/ledger/ledger.module.js");
/** Adapt a single PGlite instance to the bits of pg.Pool the API uses. */
function pglitePool(db) {
    const client = {
        query: (sql, params) => db.query(sql, params),
        exec: (sql) => db.exec(sql),
        release() { },
    };
    return {
        query: (sql, params) => db.query(sql, params),
        connect: async () => client,
    };
}
const PHONE = "254712345678";
let app;
let db;
let http;
let token = "";
let entryId = 0;
(0, node_test_1.before)(async () => {
    db = await pglite_1.PGlite.create();
    await (0, ledger_1.migrate)(db);
    await (0, marketplace_1.migrateMarketplace)(db);
    await db.exec(`CREATE TABLE IF NOT EXISTS kyc(
    user_id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'pending',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
    // seed a sponsor so this user can list a project
    await db.query("INSERT INTO sponsor(id,name) VALUES ($1,'Wanjiku Farms')", [PHONE]);
    const moduleRef = await testing_1.Test.createTestingModule({ imports: [app_module_js_1.AppModule] })
        .overrideProvider(ledger_module_js_1.PG_POOL).useValue(pglitePool(db))
        .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    http = app.getHttpServer();
});
(0, node_test_1.after)(async () => { await app?.close(); });
(0, node_test_1.test)("auth: request + verify OTP yields a JWT", async () => {
    const otpRes = await (0, supertest_1.default)(http).post("/auth/request-otp").send({ phone: PHONE }).expect(201);
    const code = otpRes.body.devOtp;
    strict_1.default.ok(code, "dev OTP returned outside production");
    const verRes = await (0, supertest_1.default)(http).post("/auth/verify-otp").send({ phone: PHONE, code }).expect(201);
    token = verRes.body.token;
    strict_1.default.ok(token);
});
(0, node_test_1.test)("wallet starts empty", async () => {
    const res = await (0, supertest_1.default)(http).get("/wallet/balance").set("Authorization", `Bearer ${token}`).expect(200);
    strict_1.default.equal(res.body.cents, 0);
});
(0, node_test_1.test)("M-Pesa STK callback credits the wallet (and is idempotent)", async () => {
    // seed the intent (initiateDeposit would call Daraja; we simulate the inbound callback)
    await db.query("INSERT INTO payment_intent(id,kind,account_ref,amount,phone) VALUES ('ws_CO_E2E','deposit',$1,$2,$3)", [PHONE, (0, ledger_1.KES)(500), PHONE]);
    const callback = { Body: { stkCallback: {
                CheckoutRequestID: "ws_CO_E2E", ResultCode: 0, ResultDesc: "ok",
                CallbackMetadata: { Item: [
                        { Name: "Amount", Value: 500 }, { Name: "MpesaReceiptNumber", Value: "QE2E001" },
                        { Name: "PhoneNumber", Value: 254712345678 },
                    ] },
            } } };
    await (0, supertest_1.default)(http).post("/mpesa/stk-callback").send(callback).expect(201);
    await (0, supertest_1.default)(http).post("/mpesa/stk-callback").send(callback).expect(201); // retry
    const bal = await (0, supertest_1.default)(http).get("/wallet/balance").set("Authorization", `Bearer ${token}`).expect(200);
    strict_1.default.equal(bal.body.cents, (0, ledger_1.KES)(500)); // credited exactly once
});
(0, node_test_1.test)("investing is blocked until KYC, then allowed", async () => {
    await (0, supertest_1.default)(http).post("/projects").set("Authorization", `Bearer ${token}`)
        .send({ id: "kiambu-poultry", title: "Kiambu Broiler Poultry", venture: "poultry",
        location: "Kiambu", returnModel: "fixed", cycleMonths: 4,
        minCents: (0, ledger_1.KES)(500), targetCents: (0, ledger_1.KES)(1000) }).expect(201);
    await (0, supertest_1.default)(http).post("/admin/projects/kiambu-poultry/approve").set("Authorization", `Bearer ${token}`)
        .send({ grade: "B", expectedPct: 18, downsidePct: 4 }).expect(201);
    // gated by KYC -> 403
    await (0, supertest_1.default)(http).post("/invest/kiambu-poultry").set("Authorization", `Bearer ${token}`)
        .send({ amountCents: (0, ledger_1.KES)(500) }).expect(403);
    await (0, supertest_1.default)(http).post("/auth/complete-kyc").set("Authorization", `Bearer ${token}`).expect(201);
    const inv = await (0, supertest_1.default)(http).post("/invest/kiambu-poultry").set("Authorization", `Bearer ${token}`)
        .send({ amountCents: (0, ledger_1.KES)(500) }).expect(201);
    entryId = inv.body.entryId;
    strict_1.default.ok(entryId);
    const bal = await (0, supertest_1.default)(http).get("/wallet/balance").set("Authorization", `Bearer ${token}`).expect(200);
    strict_1.default.equal(bal.body.cents, 0); // wallet moved into escrow
});
(0, node_test_1.test)("projects list shows live funding from the ledger", async () => {
    const res = await (0, supertest_1.default)(http).get("/projects").expect(200);
    const p = res.body.find((x) => x.id === "kiambu-poultry");
    strict_1.default.equal(p.raised, (0, ledger_1.KES)(500));
    strict_1.default.equal(p.funded_pct, 50);
    strict_1.default.equal(p.investors, 1);
});
(0, node_test_1.test)("cooling-off cancel refunds the investor", async () => {
    await (0, supertest_1.default)(http).post(`/invest/cancel/${entryId}`).set("Authorization", `Bearer ${token}`).expect(201);
    const bal = await (0, supertest_1.default)(http).get("/wallet/balance").set("Authorization", `Bearer ${token}`).expect(200);
    strict_1.default.equal(bal.body.cents, (0, ledger_1.KES)(500)); // money back
});
