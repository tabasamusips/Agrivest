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
exports.InvestController = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const ledger_module_js_1 = require("../ledger/ledger.module.js");
const auth_guard_js_1 = require("../auth/auth.guard.js");
const kyc_guard_js_1 = require("../auth/kyc.guard.js");
const with_client_js_1 = require("../ledger/with-client.js");
let InvestController = class InvestController {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    // Solo and pooled both call invest(); the difference is product/UX, not ledger.
    invest(req, projectId, b) {
        return (0, with_client_js_1.withClient)(this.pool, async ({ ledger }) => ({
            entryId: await ledger.invest(req.user.sub, projectId, b.amountCents),
        }));
    }
    cancel(entryId) {
        return (0, with_client_js_1.withClient)(this.pool, async ({ ledger }) => {
            await ledger.refundCoolingOff(Number(entryId));
            return { refunded: true };
        });
    }
};
exports.InvestController = InvestController;
__decorate([
    (0, common_1.Post)(":projectId"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("projectId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], InvestController.prototype, "invest", null);
__decorate([
    (0, common_1.Post)("cancel/:entryId"),
    __param(0, (0, common_1.Param)("entryId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InvestController.prototype, "cancel", null);
exports.InvestController = InvestController = __decorate([
    (0, common_1.UseGuards)(auth_guard_js_1.AuthGuard, kyc_guard_js_1.KycGuard),
    (0, common_1.Controller)("invest"),
    __param(0, (0, common_1.Inject)(ledger_module_js_1.PG_POOL)),
    __metadata("design:paramtypes", [pg_1.Pool])
], InvestController);
