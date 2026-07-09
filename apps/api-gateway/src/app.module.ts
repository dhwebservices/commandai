import { Module } from "@nestjs/common";
import { HealthModule } from "./modules/health/health.module";
import { IntentsModule } from "./modules/intents/intents.module";
import { AuthModule } from "./modules/auth/auth.module";

@Module({
  imports: [HealthModule, IntentsModule, AuthModule],
})
export class AppModule {}
