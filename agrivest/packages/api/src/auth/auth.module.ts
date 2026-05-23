import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";
import { AuthGuard } from "./auth.guard.js";
import { KycGuard } from "./kyc.guard.js";

@Module({
  imports: [JwtModule.register({
    secret: process.env.JWT_SECRET ?? "dev-secret-change-me",
    signOptions: { expiresIn: "30d" },
  })],
  providers: [AuthService, AuthGuard, KycGuard],
  controllers: [AuthController],
  exports: [AuthGuard, KycGuard, JwtModule],
})
export class AuthModule {}
