import { Body, Controller, Get, Inject, Post, Req, UseGuards } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../ledger/ledger.module.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { withClient } from "../ledger/with-client.js";

@UseGuards(AuthGuard)
@Controller("wallet")
export class WalletController {
  constructor(@Inject(PG_POOL) private pool: Pool) {}

  @Get("balance")
  balance(@Req() req: any) {
    return withClient(this.pool, async ({ ledger }) => ({
      cents: await ledger.available(req.user.sub),
    }));
  }

  @Post("deposit")
  deposit(@Req() req: any, @Body() b: { amountCents: number; phone: string }) {
    return withClient(this.pool, ({ payments }) =>
      payments.initiateDeposit(req.user.sub, b.amountCents, b.phone));
  }

  @Post("withdraw")
  withdraw(@Req() req: any, @Body() b: { amountCents: number; phone: string }) {
    return withClient(this.pool, ({ payments }) =>
      payments.initiateWithdrawal(req.user.sub, b.amountCents, b.phone));
  }
}
