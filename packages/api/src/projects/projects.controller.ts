import { Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../ledger/ledger.module.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { withClient } from "../ledger/with-client.js";

/** Marketplace catalogue, backed by @agrivest/marketplace with live funding from the ledger. */
@Controller("projects")
export class ProjectsController {
  constructor(@Inject(PG_POOL) private pool: Pool) {}

  @Get() list() {
    return withClient(this.pool, ({ market }) => market.listProjects());
  }

  @Get(":id") get(@Param("id") id: string) {
    return withClient(this.pool, ({ market }) => market.getProject(id));
  }

  // Sponsor submits a venture (enters underwriting).
  @UseGuards(AuthGuard)
  @Post() submit(@Req() req: any, @Body() b: any) {
    return withClient(this.pool, ({ market }) =>
      market.submitProject({ ...b, sponsorId: req.user.sub }));
  }

  @UseGuards(AuthGuard)
  @Post(":id/updates") update(@Param("id") id: string, @Body() b: { body: string; hasPhoto?: boolean }) {
    return withClient(this.pool, ({ market }) => market.postUpdate(id, b.body, b.hasPhoto ?? false));
  }
}
