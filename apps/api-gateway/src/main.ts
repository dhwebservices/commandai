import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { VersioningType } from "@nestjs/common";
import { AppModule } from "./app.module";
import { loadApiGatewayConfig } from "./config";
import { createLogger } from "@comandr/logger";
import { AllExceptionsFilter } from "./common/all-exceptions.filter";

async function bootstrap() {
  const config = loadApiGatewayConfig(); // crashes fast on invalid config
  const logger = createLogger("api-gateway", config.LOG_LEVEL);

  const app = await NestFactory.create(AppModule);

  // CORS - Production: only allow comandr.pages.dev and subdomains
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true); // Allow same-origin and tools like curl
      }

      const allowedPatterns = [
        "http://localhost:5173", // Local dev
        "https://comandr.pages.dev", // Production
        /^https:\/\/[a-zA-Z0-9-]+\.comandr\.pages\.dev$/, // Preview deployments
      ];

      const isAllowed = allowedPatterns.some((pattern) =>
        typeof pattern === "string" ? pattern === origin : pattern.test(origin),
      );

      callback(null, isAllowed);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Security headers
  app.use((req: any, res: any, next: any) => {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Strict-Transport-Security", "max-age=31536000");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  app.enableVersioning({ type: VersioningType.URI }); // every route versioned, Non-Negotiable #4
  app.useGlobalFilters(new AllExceptionsFilter()); // no error path exits unhandled, Architecture Principle #6

  await app.listen(config.API_GATEWAY_PORT);
  logger.info({ port: config.API_GATEWAY_PORT }, "api-gateway listening");
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("api-gateway failed to start", err);
  process.exit(1);
});
