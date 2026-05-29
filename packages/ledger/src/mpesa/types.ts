/** Safaricom Daraja configuration. Get sandbox values from developer.safaricom.co.ke */
export interface DarajaConfig {
  baseUrl: string;            // https://sandbox.safaricom.co.ke (sandbox) | api.safaricom.co.ke (prod)
  consumerKey: string;
  consumerSecret: string;
  // C2B / STK push (deposits)
  shortcode: string;          // Paybill/Till (Lipa na M-Pesa Online shortcode)
  passkey: string;            // Lipa na M-Pesa Online passkey
  stkCallbackUrl: string;     // public https URL Daraja will POST the STK result to
  // B2C (payouts / withdrawals)
  b2cShortcode?: string;
  initiatorName?: string;
  securityCredential?: string; // encrypted initiator password
  b2cResultUrl?: string;
  b2cTimeoutUrl?: string;
}

export interface StkPushParams {
  amountKES: number;          // whole shillings (M-Pesa does not transact cents)
  phone: string;              // 2547XXXXXXXX
  accountReference: string;
  description: string;
}
export interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;       // "0" = accepted
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
