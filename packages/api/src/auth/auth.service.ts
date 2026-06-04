import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Pool } from "pg";

@Injectable()
export class AuthService {
  private db: Pool;

  constructor(private jwt: JwtService) {
    this.db = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  async requestOtp(phone: string): Promise<{ devOtp?: string }> {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Upsert into postgres — survives hot-reloads
    await this.db.query(
      `INSERT INTO otp_codes (phone, code, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (phone) DO UPDATE
         SET code = $2, expires_at = $3`,
      [phone, code, expires]
    );

    console.log(`[OTP] ${phone} → ${code}`);
    // Always return devOtp in non-production
    return process.env.NODE_ENV === "production" ? {} : { devOtp: code };
  }

  async verifyOtp(phone: string, code: string): Promise<{ token: string }> {
    const { rows } = await this.db.query(
      `SELECT code, expires_at FROM otp_codes WHERE phone = $1`,
      [phone]
    );

    const rec = rows[0];
    if (!rec || rec.expires_at < Date.now() || rec.code !== code) {
      throw new UnauthorizedException("invalid or expired code");
    }

    // Delete used OTP
    await this.db.query(`DELETE FROM otp_codes WHERE phone = $1`, [phone]);

    const userId = phone;
    const token = await this.jwt.signAsync({ sub: userId, phone });
    return { token };
  }

  async completeKyc(userId: string): Promise<{ status: string }> {
    await this.db.query(
      `UPDATE users SET kyc_verified = true, kyc_at = now()
       WHERE id = $1`,
      [userId]
    );
    return { status: "verified" };
  }
}
