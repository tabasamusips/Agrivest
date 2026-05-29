"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpDarajaClient = void 0;
exports.darajaTimestamp = darajaTimestamp;
exports.stkPassword = stkPassword;
exports.basicAuth = basicAuth;
exports.centsToWholeKES = centsToWholeKES;
exports.parseStkCallback = parseStkCallback;
exports.parseB2CResult = parseB2CResult;
/* ---------- pure helpers (unit-tested, no network) ---------- */
/** Daraja timestamp: YYYYMMDDHHmmss in EAT. */
function darajaTimestamp(d = new Date()) {
    const p = (n, w = 2) => String(n).padStart(w, "0");
    return (d.getFullYear().toString() + p(d.getMonth() + 1) + p(d.getDate()) +
        p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()));
}
/** STK password = base64(shortcode + passkey + timestamp). */
function stkPassword(shortcode, passkey, timestamp) {
    return Buffer.from(shortcode + passkey + timestamp).toString("base64");
}
/** OAuth basic header value. */
function basicAuth(key, secret) {
    return "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
}
/**
 * M-Pesa transacts WHOLE shillings. Convert internal cents -> shillings,
 * refusing any amount that isn't a whole shilling so we never silently
 * drop or round a customer's money at the payment boundary.
 */
function centsToWholeKES(cents) {
    if (!Number.isInteger(cents))
        throw new Error(`cents must be integer: ${cents}`);
    if (cents % 100 !== 0)
        throw new Error(`M-Pesa needs whole shillings; ${cents} cents has a fractional shilling`);
    return cents / 100;
}
class HttpDarajaClient {
    cfg;
    fetchImpl;
    token;
    constructor(cfg, fetchImpl = fetch) {
        this.cfg = cfg;
        this.fetchImpl = fetchImpl;
    }
    async getToken() {
        if (this.token && Date.now() < this.token.expires)
            return this.token.value;
        const res = await this.fetchImpl(`${this.cfg.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: basicAuth(this.cfg.consumerKey, this.cfg.consumerSecret) } });
        if (!res.ok)
            throw new Error(`Daraja OAuth failed: ${res.status}`);
        const j = await res.json();
        this.token = { value: j.access_token, expires: Date.now() + (Number(j.expires_in) - 30) * 1000 };
        return this.token.value;
    }
    async stkPush(p) {
        const ts = darajaTimestamp();
        const body = {
            BusinessShortCode: this.cfg.shortcode,
            Password: stkPassword(this.cfg.shortcode, this.cfg.passkey, ts),
            Timestamp: ts,
            TransactionType: "CustomerPayBillOnline",
            Amount: p.amountKES,
            PartyA: p.phone,
            PartyB: this.cfg.shortcode,
            PhoneNumber: p.phone,
            CallBackURL: this.cfg.stkCallbackUrl,
            AccountReference: p.accountReference,
            TransactionDesc: p.description,
        };
        return this.post("/mpesa/stkpush/v1/processrequest", body);
    }
    async b2c(p) {
        if (!this.cfg.b2cShortcode || !this.cfg.initiatorName || !this.cfg.securityCredential) {
            throw new Error("B2C not configured (shortcode/initiator/securityCredential)");
        }
        const body = {
            InitiatorName: this.cfg.initiatorName,
            SecurityCredential: this.cfg.securityCredential,
            CommandID: "BusinessPayment",
            Amount: p.amountKES,
            PartyA: this.cfg.b2cShortcode,
            PartyB: p.phone,
            Remarks: p.remarks,
            QueueTimeOutURL: this.cfg.b2cTimeoutUrl,
            ResultURL: this.cfg.b2cResultUrl,
            Occasion: p.occasion ?? "",
        };
        return this.post("/mpesa/b2c/v1/paymentrequest", body);
    }
    async post(path, body) {
        const token = await this.getToken();
        const res = await this.fetchImpl(`${this.cfg.baseUrl}${path}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const j = await res.json();
        if (!res.ok)
            throw new Error(`Daraja ${path} failed: ${res.status} ${JSON.stringify(j)}`);
        return j;
    }
}
exports.HttpDarajaClient = HttpDarajaClient;
/** Parse the JSON Daraja POSTs to the STK callback URL. */
function parseStkCallback(body) {
    const cb = body?.Body?.stkCallback;
    if (!cb)
        throw new Error("not an STK callback payload");
    const out = {
        checkoutRequestId: cb.CheckoutRequestID,
        success: cb.ResultCode === 0,
        resultDesc: cb.ResultDesc,
    };
    if (out.success) {
        const items = cb.CallbackMetadata?.Item ?? [];
        const get = (n) => items.find((i) => i.Name === n)?.Value;
        out.receipt = get("MpesaReceiptNumber");
        out.amountKES = Number(get("Amount"));
        const phone = get("PhoneNumber");
        out.phone = phone != null ? String(phone) : undefined;
    }
    return out;
}
function parseB2CResult(body) {
    const r = body?.Result;
    if (!r)
        throw new Error("not a B2C result payload");
    const params = r.ResultParameters?.ResultParameter ?? [];
    const receipt = params.find((p) => p.Key === "TransactionReceipt")?.Value;
    return {
        originatorConversationId: r.OriginatorConversationID,
        success: r.ResultCode === 0,
        receipt: receipt != null ? String(receipt) : undefined,
        resultDesc: r.ResultDesc,
    };
}
