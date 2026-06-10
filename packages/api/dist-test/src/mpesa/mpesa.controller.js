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
exports.MpesaController = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const ledger_1 = require("@upeo/ledger");
const ledger_module_js_1 = require("../ledger/ledger.module.js");
const with_client_js_1 = require("../ledger/with-client.js");
/**
 * Public, unauthenticated endpoints Daraja calls. Always ACK with the shape
 * Safaricom expects, even on internal error, so they stop retrying once handled.
 */
let MpesaController = class MpesaController {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async stk(body) {
        try {
            const result = (0, ledger_1.parseStkCallback)(body);
            await (0, with_client_js_1.withClient)(this.pool, ({ payments }) => payments.handleStkCallback(result));
        }
        catch (e) {
            console.error("stk-callback error", e);
        }
        return { ResultCode: 0, ResultDesc: "Accepted" };
    }
    async b2c(body) {
        try {
            const result = (0, ledger_1.parseB2CResult)(body);
            await (0, with_client_js_1.withClient)(this.pool, ({ payments }) => payments.handleB2CResult(result));
        }
        catch (e) {
            console.error("b2c-result error", e);
        }
        return { ResultCode: 0, ResultDesc: "Accepted" };
    }
    timeout(_b) { return { ResultCode: 0, ResultDesc: "Accepted" }; }
};
exports.MpesaController = MpesaController;
__decorate([
    (0, common_1.Post)("stk-callback"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "stk", null);
__decorate([
    (0, common_1.Post)("b2c-result"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MpesaController.prototype, "b2c", null);
__decorate([
    (0, common_1.Post)("b2c-timeout"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MpesaController.prototype, "timeout", null);
exports.MpesaController = MpesaController = __decorate([
    (0, common_1.Controller)("mpesa"),
    __param(0, (0, common_1.Inject)(ledger_module_js_1.PG_POOL)),
    __metadata("design:paramtypes", [pg_1.Pool])
], MpesaController);
