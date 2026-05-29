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
exports.KycGuard = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const ledger_module_js_1 = require("../ledger/ledger.module.js");
/**
 * Blocks money-moving routes until the user is KYC-verified — part of operating
 * as a regulated product. Assumes a `kyc(user_id TEXT PRIMARY KEY, status TEXT)`
 * row exists; create it in your migrations alongside the marketplace schema.
 */
let KycGuard = class KycGuard {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async canActivate(ctx) {
        const req = ctx.switchToHttp().getRequest();
        const r = await this.pool.query("SELECT status FROM kyc WHERE user_id=$1", [req.user?.sub]);
        if (r.rows[0]?.status !== "verified")
            throw new common_1.ForbiddenException("KYC verification required");
        return true;
    }
};
exports.KycGuard = KycGuard;
exports.KycGuard = KycGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(ledger_module_js_1.PG_POOL)),
    __metadata("design:paramtypes", [pg_1.Pool])
], KycGuard);
