import { Body, Controller, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../ledger/ledger.module.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { withClient } from "../ledger/with-client.js";

/** Underwriting actions. Protect with a proper admin role in production. */
@UseGuards(AuthGuard)
@Controller("admin/projects")
export class AdminProjectsController {
  constructor(@Inject(PG_POOL) private pool: Pool) {}

  @Post(":id/approve")
  approve(@Param("id") id: string, @Body() b: { grade: string; expectedPct: number; downsidePct: number }) {
    return withClient(this.pool, ({ market }) =>
      market.approveProject(id, { grade: b.grade, expectedPct: b.expectedPct, downsidePct: b.downsidePct }));
  }
}
