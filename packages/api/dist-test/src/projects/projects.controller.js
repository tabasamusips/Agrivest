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
exports.ProjectsController = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const ledger_module_js_1 = require("../ledger/ledger.module.js");
const auth_guard_js_1 = require("../auth/auth.guard.js");
const with_client_js_1 = require("../ledger/with-client.js");
/** Marketplace catalogue, backed by @agrivest/marketplace with live funding from the ledger. */
let ProjectsController = class ProjectsController {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    list() {
        return (0, with_client_js_1.withClient)(this.pool, ({ market }) => market.listProjects());
    }
    get(id) {
        return (0, with_client_js_1.withClient)(this.pool, ({ market }) => market.getProject(id));
    }
    // Sponsor submits a venture (enters underwriting).
    submit(req, b) {
        return (0, with_client_js_1.withClient)(this.pool, ({ market }) => market.submitProject({ ...b, sponsorId: req.user.sub }));
    }
    update(id, b) {
        return (0, with_client_js_1.withClient)(this.pool, ({ market }) => market.postUpdate(id, b.body, b.hasPhoto ?? false));
    }
};
exports.ProjectsController = ProjectsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "get", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_js_1.AuthGuard),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "submit", null);
__decorate([
    (0, common_1.UseGuards)(auth_guard_js_1.AuthGuard),
    (0, common_1.Post)(":id/updates"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ProjectsController.prototype, "update", null);
exports.ProjectsController = ProjectsController = __decorate([
    (0, common_1.Controller)("projects"),
    __param(0, (0, common_1.Inject)(ledger_module_js_1.PG_POOL)),
    __metadata("design:paramtypes", [pg_1.Pool])
], ProjectsController);
