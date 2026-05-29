"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.darajaConfig = darajaConfig;
exports.withClient = withClient;
const ledger_1 = require("@agrivest/ledger");
const marketplace_1 = require("@agrivest/marketplace");
function darajaConfig() {
    return {
        baseUrl: process.env.MPESA_BASE_URL ?? "https://sandbox.safaricom.co.ke",
        consumerKey: process.env.MPESA_CONSUMER_KEY ?? "",
        consumerSecret: process.env.MPESA_CONSUMER_SECRET ?? "",
        shortcode: process.env.MPESA_SHORTCODE ?? "",
        passkey: process.env.MPESA_PASSKEY ?? "",
        stkCallbackUrl: (process.env.PUBLIC_URL ?? "") + "/mpesa/stk-callback",
        b2cShortcode: process.env.MPESA_B2C_SHORTCODE,
        initiatorName: process.env.MPESA_INITIATOR,
        securityCredential: process.env.MPESA_SECURITY_CRED,
        b2cResultUrl: (process.env.PUBLIC_URL ?? "") + "/mpesa/b2c-result",
        b2cTimeoutUrl: (process.env.PUBLIC_URL ?? "") + "/mpesa/b2c-timeout",
    };
}
/** Acquire one client, build the ledger services on it, run, always release. */
async function withClient(pool, fn) {
    const client = await pool.connect();
    try {
        const ledger = new ledger_1.PgAgriVest(client);
        const payments = new ledger_1.PaymentsService(client, ledger, new ledger_1.HttpDarajaClient(darajaConfig()));
        const market = new marketplace_1.MarketplaceService(client);
        return await fn({ client, ledger, payments, market });
    }
    finally {
        client.release();
    }
}
