import { Module } from "@nestjs/common";
import { HealthModule } from "./modules/health/health.module";
import { IntentsModule } from "./modules/intents/intents.module";

@Module({
  imports: [HealthModule, IntentsModule],
})
export class AppModule {}
