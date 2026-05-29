/** Safaricom Daraja configuration. Get sandbox values from developer.safaricom.co.ke */
export interface DarajaConfig {
    baseUrl: string;
    consumerKey: string;
    consumerSecret: string;
    shortcode: string;
    passkey: string;
    stkCallbackUrl: string;
    b2cShortcode?: string;
    initiatorName?: string;
    securityCredential?: string;
    b2cResultUrl?: string;
    b2cTimeoutUrl?: string;
}
export interface StkPushParams {
    amountKES: number;
    phone: string;
    accountReference: string;
    description: string;
}
export interface StkPushResponse {
    MerchantRequestID: string;
    CheckoutRequestID: string;
    ResponseCode: string;
    CustomerMessage?: string;
}
export interface B2CParams {
    amountKES: number;
    phone: string;
    remarks: string;
    occasion?: string;
}
export interface B2CResponse {
    ConversationID: string;
    OriginatorConversationID: string;
    ResponseCode: string;
}
