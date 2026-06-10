import { Body, Controller, Inject, Post } from "@nestjs/common";
import { Pool } from "pg";
import { parseStkCallback, parseB2CResult } from "@upeo/ledger";
import { PG_POOL } from "../ledger/ledger.module.js";
import { withClient } from "../ledger/with-client.js";

/**
 * Public, unauthenticated endpoints Daraja calls. Always ACK with the shape
 * Safaricom expects, even on internal error, so they stop retrying once handled.
 */
@Controller("mpesa")
export class MpesaController {
  constructor(@Inject(PG_POOL) private pool: Pool) {}

  @Post("stk-callback")
  async stk(@Body() body: any) {
    try {
      const result = parseStkCallback(body);
      await withClient(this.pool, ({ payments }) => payments.handleStkCallback(result));
    } catch (e) { console.error("stk-callback error", e); }
    return { ResultCode: 0, ResultDesc: "Accepted" };
  }

  @Post("b2c-result")
  async b2c(@Body() body: any) {
    try {
      const result = parseB2CResult(body);
      await withClient(this.pool, ({ payments }) => payments.handleB2CResult(result));
    } catch (e) { console.error("b2c-result error", e); }
    return { ResultCode: 0, ResultDesc: "Accepted" };
  }

  @Post("b2c-timeout")
  timeout(@Body() _b: any) { return { ResultCode: 0, ResultDesc: "Accepted" }; }
}
