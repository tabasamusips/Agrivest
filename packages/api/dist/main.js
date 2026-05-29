"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_js_1 = require("./app.module.js");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_js_1.AppModule);
    app.enableCors();
    const port = Number(process.env.PORT ?? 3000);
    await app.listen(port);
    console.log(`Agri Vest API on :${port}`);
}
bootstrap();
