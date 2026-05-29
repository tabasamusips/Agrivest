import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { AuthGuard } from "./auth.guard.js";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("request-otp")
  requestOtp(@Body() b: { phone: string }) { return this.auth.requestOtp(b.phone); }

  @Post("verify-otp")
  verifyOtp(@Body() b: { phone: string; code: string }) { return this.auth.verifyOtp(b.phone, b.code); }

  @UseGuards(AuthGuard)
  @Post("complete-kyc")
  completeKyc(@Req() req: any) { return this.auth.completeKyc(req.user.sub); }
}
