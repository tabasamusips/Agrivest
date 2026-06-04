"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    // ─── CORS ─────────────────────────────────────────────────────────
    // Allow requests from the Vite dev server (port 5173) and any
    // deployed origin listed in CORS_ORIGIN env var.
    // In production set CORS_ORIGIN to your frontend domain.
    const allowedOrigins = [
        "http://localhost:5173", // Vite dev server
        "http://localhost:3001", // alternative local port
        process.env.CORS_ORIGIN, // production frontend URL
    ].filter(Boolean);
    app.enableCors({
        origin: (origin, callback) => {
            // Allow requests with no origin (curl, Postman, server-to-server)
            if (!origin)
                return callback(null, true);
            if (allowedOrigins.includes(origin))
                return callback(null, true);
            callback(new Error(`CORS: origin ${origin} not allowed`));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    });
    // ──────────────────────────────────────────────────────────────────
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`\n🌱  Agri Vest API running on http://localhost:${port}`);
    console.log(`   Frontend dev server:  http://localhost:5173\n`);
}
bootstrap();
