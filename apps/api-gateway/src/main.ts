import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { VersioningType } from "@nestjs/common";
import { AppModule } from "./app.module";
import { loadApiGatewayConfig } from "./config";
import { createLogger } from "@commandai/logger";
import { AllExceptionsFilter } from "./common/all-exceptions.filter";

async function bootstrap() {
  const config = loadApiGatewayConfig(); // crashes fast on invalid config
  const logger = createLogger("api-gateway", config.LOG_LEVEL);

  const app = await NestFactory.create(AppModule);
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
