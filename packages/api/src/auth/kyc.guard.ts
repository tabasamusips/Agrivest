import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../ledger/ledger.module.js";

/**
 * Blocks money-moving routes until the user is KYC-verified — part of operating
 * as a regulated product. Assumes a `kyc(user_id TEXT PRIMARY KEY, status TEXT)`
 * row exists; create it in your migrations alongside the marketplace schema.
 */
@Injectable()
export class KycGuard implements CanActivate {
  constructor(@Inject(PG_POOL) private pool: Pool) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const r = await this.pool.query("SELECT status FROM kyc WHERE user_id=$1", [req.user?.sub]);
    if (r.rows[0]?.status !== "verified") throw new ForbiddenException("KYC verification required");
    return true;
  }
}
