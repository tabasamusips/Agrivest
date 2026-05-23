import { Module } from "@nestjs/common";
import { LedgerModule } from "./ledger/ledger.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { WalletController } from "./wallet/wallet.controller.js";
import { InvestController } from "./invest/invest.controller.js";
import { MpesaController } from "./mpesa/mpesa.controller.js";
import { ProjectsController } from "./projects/projects.controller.js";
import { AdminProjectsController } from "./projects/admin.controller.js";

@Module({
  imports: [LedgerModule, AuthModule],
  controllers: [WalletController, InvestController, MpesaController, ProjectsController, AdminProjectsController],
})
export class AppModule {}
