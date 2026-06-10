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
exports.WalletController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_js_1 = require("../auth/auth.guard.js");
const pg_1 = require("pg");
const db = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function ensureUser(userId) {
    await db.query(`INSERT INTO users (id, phone) VALUES ($1, $1) ON CONFLICT (id) DO NOTHING`, [userId]);
    await db.query(`INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [userId]);
}
let WalletController = class WalletController {
    async balance(req) {
        await ensureUser(req.user.sub);
        const { rows } = await db.query(`SELECT balance_cents FROM wallets WHERE user_id = $1`, [req.user.sub]);
        return { balance: rows[0]?.balance_cents ?? 0 };
    }
    async deposit(req, b) {
        await ensureUser(req.user.sub);
        await db.query(`UPDATE wallets SET balance_cents = balance_cents + $1, updated_at = now() WHERE user_id = $2`, [b.amount, req.user.sub]);
        await db.query(`INSERT INTO transactions (user_id, type, amount_cents, ref, status) VALUES ($1, 'deposit', $2, 'mpesa-sandbox', 'completed')`, [req.user.sub, b.amount]);
        const { rows } = await db.query(`SELECT balance_cents FROM wallets WHERE user_id = $1`, [req.user.sub]);
        return { balance: rows[0].balance_cents, status: "completed" };
    }
    async withdraw(req, b) {
        await ensureUser(req.user.sub);
        const { rows } = await db.query(`SELECT balance_cents FROM wallets WHERE user_id = $1`, [req.user.sub]);
        const bal = rows[0]?.balance_cents ?? 0;
        if (bal < b.amount)
            throw new Error("Insufficient balance");
        await db.query(`UPDATE wallets SET balance_cents = balance_cents - $1, updated_at = now() WHERE user_id = $2`, [b.amount, req.user.sub]);
        await db.query(`INSERT INTO transactions (user_id, type, amount_cents, ref, status) VALUES ($1, 'withdraw', $2, 'mpesa-sandbox', 'completed')`, [req.user.sub, b.amount]);
        return { status: "completed" };
    }
};
exports.WalletController = WalletController;
__decorate([
    (0, common_1.UseGuards)(auth_guard_js_1.AuthGuard),
    (0, common_1.Get)("balance"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "balance", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_js_1.AuthGuard),
    (0, common_1.Post)("deposit"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "deposit", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_js_1.AuthGuard),
    (0, common_1.Post)("withdraw"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "withdraw", null);
exports.WalletController = WalletController = __decorate([
    (0, common_1.Controller)("wallet")
], WalletController);
