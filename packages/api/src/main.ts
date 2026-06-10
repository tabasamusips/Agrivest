import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: '/data/data/org.smartide.code/files/home/projects/Upeo/.env' });

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const origins = ["http://localhost:5173"];
  if (process.env.CORS_ORIGIN) origins.push(process.env.CORS_ORIGIN);

  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allowedHeaders: ["Content-Type","Authorization"],
  });

  console.log("DB URL loaded:", !!process.env.DATABASE_URL);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`\n🌱  Agri Vest API running on http://localhost:${port}`);
  console.log(`   Frontend dev server:  http://localhost:5173\n`);
}
bootstrap();
