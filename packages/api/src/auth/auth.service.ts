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
    const expires = Date.now() + 10 * 60 * 1000;

    await this.db.query(
      `INSERT INTO otp_codes (phone, code, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (phone) DO UPDATE
         SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at`,
      [phone, code, expires]
    );

    console.log(`[OTP] ${phone} -> ${code}`);
    return process.env.NODE_ENV === "production" ? {} : { devOtp: code };
  }

  async verifyOtp(phone: string, code: string): Promise<{ token: string }> {
    const { rows } = await this.db.query(
      `SELECT code, expires_at FROM otp_codes WHERE phone = $1`,
      [phone]
    );

    const rec = rows[0];
    const now = Date.now();
    const expires = Number(rec?.expires_at); // cast to number

    console.log(`[VERIFY] phone=${phone} code=${code} stored=${rec?.code} expires=${expires} now=${now} expired=${expires < now}`);

    if (!rec || expires < now || rec.code !== code) {
      throw new UnauthorizedException("invalid or expired code");
    }

    await this.db.query(`DELETE FROM otp_codes WHERE phone = $1`, [phone]);

    const token = await this.jwt.signAsync({ sub: phone, phone });
    return { token };
  }

  async completeKyc(userId: string): Promise<{ status: string }> {
    await this.db.query(
      `UPDATE users SET kyc_verified = true, kyc_at = now() WHERE id = $1`,
      [userId]
    );
    return { status: "verified" };
  }
}
