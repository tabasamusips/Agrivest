import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

    // ─── CORS ─────────────────────────────────────────────────────────
      // Allow requests from the Vite dev server (port 5173) and any
        // deployed origin listed in CORS_ORIGIN env var.
          // In production set CORS_ORIGIN to your frontend domain.
            const allowedOrigins = [
                "http://localhost:5173",     // Vite dev server
                    "http://localhost:3001",     // alternative local port
                        process.env.CORS_ORIGIN,    // production frontend URL
                          ].filter(Boolean);

                            app.enableCors({
                                origin: (origin, callback) => {
                                      // Allow requests with no origin (curl, Postman, server-to-server)
                                            if (!origin) return callback(null, true);
                                                  if (allowedOrigins.includes(origin)) return callback(null, true);
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