"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const ledger_module_js_1 = require("./ledger/ledger.module.js");
const auth_module_js_1 = require("./auth/auth.module.js");
const wallet_controller_js_1 = require("./wallet/wallet.controller.js");
const invest_controller_js_1 = require("./invest/invest.controller.js");
const mpesa_controller_js_1 = require("./mpesa/mpesa.controller.js");
const projects_controller_js_1 = require("./projects/projects.controller.js");
const admin_controller_js_1 = require("./projects/admin.controller.js");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [ledger_module_js_1.LedgerModule, auth_module_js_1.AuthModule],
        controllers: [wallet_controller_js_1.WalletController, invest_controller_js_1.InvestController, mpesa_controller_js_1.MpesaController, projects_controller_js_1.ProjectsController, admin_controller_js_1.AdminProjectsController],
    })
], AppModule);
