import { Body, Controller, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../ledger/ledger.module.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { KycGuard } from "../auth/kyc.guard.js";
import { withClient } from "../ledger/with-client.js";

@UseGuards(AuthGuard, KycGuard)
@Controller("invest")
export class InvestController {
  constructor(@Inject(PG_POOL) private pool: Pool) {}

  // Solo and pooled both call invest(); the difference is product/UX, not ledger.
  @Post(":projectId")
  invest(@Req() req: any, @Param("projectId") projectId: string, @Body() b: { amountCents: number }) {
    return withClient(this.pool, async ({ ledger }) => ({
      entryId: await ledger.invest(req.user.sub, projectId, b.amountCents),
    }));
  }

  @Post("cancel/:entryId")
  cancel(@Param("entryId") entryId: string) {
    return withClient(this.pool, async ({ ledger }) => {
      await ledger.refundCoolingOff(Number(entryId));
      return { refunded: true };
    });
  }
}
