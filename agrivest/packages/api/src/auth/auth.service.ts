import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Pool } from "pg";
import { PG_POOL } from "../ledger/ledger.module.js";

/**
 * Phone-first auth, mirroring the prototype's onboarding. In production the OTP
 * is sent by SMS and stored hashed with a TTL; here it is generated and (for the
 * sandbox) returned so you can test without an SMS gateway. KYC status gates
 * investing — enforce it in a guard before money-moving routes.
 */
@Injectable()
export class AuthService {
  private otps = new Map<string, { code: string; expires: number }>();
  constructor(private jwt: JwtService, @Inject(PG_POOL) private pool: Pool) {}

  async requestOtp(phone: string): Promise<{ devOtp?: string }> {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.otps.set(phone, { code, expires: Date.now() + 5 * 60_000 });
    // TODO: send via SMS provider. Sandbox: surface it for testing only.
    return process.env.NODE_ENV === "production" ? {} : { devOtp: code };
  }

  /** Sandbox KYC: mark verified after ID + liveness (the prototype's onboarding). */
  async completeKyc(userId: string): Promise<{ status: string }> {
    await this.pool.query(
      `INSERT INTO kyc(user_id, status) VALUES ($1,'verified')
       ON CONFLICT (user_id) DO UPDATE SET status='verified', updated_at=now()`, [userId]);
    return { status: "verified" };
  }

  async verifyOtp(phone: string, code: string): Promise<{ token: string }> {
    const rec = this.otps.get(phone);
    if (!rec || rec.expires < Date.now() || rec.code !== code) {
      throw new UnauthorizedException("invalid or expired code");
    }
    this.otps.delete(phone);
    const userId = phone; // phone is the stable identity; map to a user row in production
    const token = await this.jwt.signAsync({ sub: userId, phone });
    return { token };
  }
}
