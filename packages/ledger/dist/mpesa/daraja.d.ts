import { DarajaConfig, StkPushParams, StkPushResponse, B2CParams, B2CResponse } from "./types.js";
/** Daraja timestamp: YYYYMMDDHHmmss in EAT. */
export declare function darajaTimestamp(d?: Date): string;
/** STK password = base64(shortcode + passkey + timestamp). */
export declare function stkPassword(shortcode: string, passkey: string, timestamp: string): string;
/** OAuth basic header value. */
export declare function basicAuth(key: string, secret: string): string;
/**
 * M-Pesa transacts WHOLE shillings. Convert internal cents -> shillings,
 * refusing any amount that isn't a whole shilling so we never silently
 * drop or round a customer's money at the payment boundary.
 */
export declare function centsToWholeKES(cents: number): number;
export interface DarajaClient {
    stkPush(p: StkPushParams): Promise<StkPushResponse>;
    b2c(p: B2CParams): Promise<B2CResponse>;
}
export declare class HttpDarajaClient implements DarajaClient {
    private cfg;
    private fetchImpl;
    private token?;
    constructor(cfg: DarajaConfig, fetchImpl?: typeof fetch);
    private getToken;
    stkPush(p: StkPushParams): Promise<StkPushResponse>;
    b2c(p: B2CParams): Promise<B2CResponse>;
    private post;
}
export interface StkResult {
    checkoutRequestId: string;
    success: boolean;
    receipt?: string;
    amountKES?: number;
    phone?: string;
    resultDesc: string;
}
/** Parse the JSON Daraja POSTs to the STK callback URL. */
export declare function parseStkCallback(body: any): StkResult;
export interface B2CResult {
    originatorConversationId: string;
    success: boolean;
    receipt?: string;
    resultDesc: string;
}
export declare function parseB2CResult(body: any): B2CResult;
