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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const pg_1 = require("pg");
const ledger_module_js_1 = require("../ledger/ledger.module.js");
/**
 * Phone-first auth, mirroring the prototype's onboarding. In production the OTP
 * is sent by SMS and stored hashed with a TTL; here it is generated and (for the
 * sandbox) returned so you can test without an SMS gateway. KYC status gates
 * investing — enforce it in a guard before money-moving routes.
 */
let AuthService = class AuthService {
    jwt;
    pool;
    otps = new Map();
    constructor(jwt, pool) {
        this.jwt = jwt;
        this.pool = pool;
    }
    async requestOtp(phone) {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        this.otps.set(phone, { code, expires: Date.now() + 5 * 60_000 });
        // TODO: send via SMS provider. Sandbox: surface it for testing only.
        return process.env.NODE_ENV === "production" ? {} : { devOtp: code };
    }
    /** Sandbox KYC: mark verified after ID + liveness (the prototype's onboarding). */
    async completeKyc(userId) {
        await this.pool.query(`INSERT INTO kyc(user_id, status) VALUES ($1,'verified')
       ON CONFLICT (user_id) DO UPDATE SET status='verified', updated_at=now()`, [userId]);
        return { status: "verified" };
    }
    async verifyOtp(phone, code) {
        const rec = this.otps.get(phone);
        if (!rec || rec.expires < Date.now() || rec.code !== code) {
            throw new common_1.UnauthorizedException("invalid or expired code");
        }
        this.otps.delete(phone);
        const userId = phone; // phone is the stable identity; map to a user row in production
        const token = await this.jwt.signAsync({ sub: userId, phone });
        return { token };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(ledger_module_js_1.PG_POOL)),
    __metadata("design:paramtypes", [jwt_1.JwtService, pg_1.Pool])
], AuthService);
