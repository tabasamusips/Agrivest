import {
  DarajaConfig, StkPushParams, StkPushResponse, B2CParams, B2CResponse,
} from "./types.js";

/* ---------- pure helpers (unit-tested, no network) ---------- */

/** Daraja timestamp: YYYYMMDDHHmmss in EAT. */
export function darajaTimestamp(d = new Date()): string {
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    d.getFullYear().toString() + p(d.getMonth() + 1) + p(d.getDate()) +
    p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds())
  );
}

/** STK password = base64(shortcode + passkey + timestamp). */
export function stkPassword(shortcode: string, passkey: string, timestamp: string): string {
  return Buffer.from(shortcode + passkey + timestamp).toString("base64");
}

/** OAuth basic header value. */
export function basicAuth(key: string, secret: string): string {
  return "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
}

/**
 * M-Pesa transacts WHOLE shillings. Convert internal cents -> shillings,
 * refusing any amount that isn't a whole shilling so we never silently
 * drop or round a customer's money at the payment boundary.
 */
export function centsToWholeKES(cents: number): number {
  if (!Number.isInteger(cents)) throw new Error(`cents must be integer: ${cents}`);
  if (cents % 100 !== 0) throw new Error(`M-Pesa needs whole shillings; ${cents} cents has a fractional shilling`);
  return cents / 100;
}

/* ---------- client interface + HTTP implementation ---------- */

export interface DarajaClient {
  stkPush(p: StkPushParams): Promise<StkPushResponse>;
  b2c(p: B2CParams): Promise<B2CResponse>;
}

export class HttpDarajaClient implements DarajaClient {
  private token?: { value: string; expires: number };
  constructor(private cfg: DarajaConfig, private fetchImpl: typeof fetch = fetch) {}

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expires) return this.token.value;
    const res = await this.fetchImpl(
      `${this.cfg.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: basicAuth(this.cfg.consumerKey, this.cfg.consumerSecret) } }
    );
    if (!res.ok) throw new Error(`Daraja OAuth failed: ${res.status}`);
    const j: any = await res.json();
    this.token = { value: j.access_token, expires: Date.now() + (Number(j.expires_in) - 30) * 1000 };
    return this.token.value;
  }

  async stkPush(p: StkPushParams): Promise<StkPushResponse> {
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

  async b2c(p: B2CParams): Promise<B2CResponse> {
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

  private async post(path: string, body: unknown): Promise<any> {
    const token = await this.getToken();
    const res = await this.fetchImpl(`${this.cfg.baseUrl}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j: any = await res.json();
    if (!res.ok) throw new Error(`Daraja ${path} failed: ${res.status} ${JSON.stringify(j)}`);
    return j;
  }
}

/* ---------- callback parsing (pure) ---------- */

export interface StkResult {
  checkoutRequestId: string;
  success: boolean;
  receipt?: string;     // M-Pesa receipt (idempotency key for the ledger)
  amountKES?: number;
  phone?: string;
  resultDesc: string;
}

/** Parse the JSON Daraja POSTs to the STK callback URL. */
export function parseStkCallback(body: any): StkResult {
  const cb = body?.Body?.stkCallback;
  if (!cb) throw new Error("not an STK callback payload");
  const out: StkResult = {
    checkoutRequestId: cb.CheckoutRequestID,
    success: cb.ResultCode === 0,
    resultDesc: cb.ResultDesc,
  };
  if (out.success) {
    const items: any[] = cb.CallbackMetadata?.Item ?? [];
    const get = (n: string) => items.find((i) => i.Name === n)?.Value;
    out.receipt = get("MpesaReceiptNumber");
    out.amountKES = Number(get("Amount"));
    const phone = get("PhoneNumber");
    out.phone = phone != null ? String(phone) : undefined;
  }
  return out;
}

export interface B2CResult {
  originatorConversationId: string;
  success: boolean;
  receipt?: string;
  resultDesc: string;
}

export function parseB2CResult(body: any): B2CResult {
  const r = body?.Result;
  if (!r) throw new Error("not a B2C result payload");
  const params: any[] = r.ResultParameters?.ResultParameter ?? [];
  const receipt = params.find((p) => p.Key === "TransactionReceipt")?.Value;
  return {
    originatorConversationId: r.OriginatorConversationID,
    success: r.ResultCode === 0,
    receipt: receipt != null ? String(receipt) : undefined,
    resultDesc: r.ResultDesc,
  };
}
