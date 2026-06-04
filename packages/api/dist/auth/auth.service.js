"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const pg_1 = require("pg");
let AuthService = class AuthService {
    jwt;
    db;
    constructor(jwt) {
        this.jwt = jwt;
        this.db = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
    }
    async requestOtp(phone) {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expires = Date.now() + 10 * 60 * 1000;
        await this.db.query(`INSERT INTO otp_codes (phone, code, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (phone) DO UPDATE
         SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at`, [phone, code, expires]);
        console.log(`[OTP] ${phone} -> ${code}`);
        return process.env.NODE_ENV === "production" ? {} : { devOtp: code };
    }
    async verifyOtp(phone, code) {
        const { rows } = await this.db.query(`SELECT code, expires_at FROM otp_codes WHERE phone = $1`, [phone]);
        const rec = rows[0];
        const now = Date.now();
        const expires = Number(rec?.expires_at); // cast to number
        console.log(`[VERIFY] phone=${phone} code=${code} stored=${rec?.code} expires=${expires} now=${now} expired=${expires < now}`);
        if (!rec || expires < now || rec.code !== code) {
            throw new common_1.UnauthorizedException("invalid or expired code");
        }
        await this.db.query(`DELETE FROM otp_codes WHERE phone = $1`, [phone]);
        const token = await this.jwt.signAsync({ sub: phone, phone });
        return { token };
    }
    async completeKyc(userId) {
        await this.db.query(`UPDATE users SET kyc_verified = true, kyc_at = now() WHERE id = $1`, [userId]);
        return { status: "verified" };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], AuthService);
