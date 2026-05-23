import { Pool, PoolClient } from "pg";
import { PgAgriVest, PaymentsService, HttpDarajaClient, DarajaConfig } from "@agrivest/ledger";
import { MarketplaceService } from "@agrivest/marketplace";

export function darajaConfig(): DarajaConfig {
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
export async function withClient<T>(
  pool: Pool,
  fn: (svc: { client: PoolClient; ledger: PgAgriVest; payments: PaymentsService; market: MarketplaceService }) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    const ledger = new PgAgriVest(client as any);
    const payments = new PaymentsService(client as any, ledger, new HttpDarajaClient(darajaConfig()));
    const market = new MarketplaceService(client as any);
    return await fn({ client, ledger, payments, market });
  } finally {
    client.release();
  }
}
