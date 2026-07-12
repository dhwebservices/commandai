import { Module } from "@nestjs/common";
import { HealthModule } from "./modules/health/health.module";
import { IntentsModule } from "./modules/intents/intents.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AgentsModule } from "./modules/agents/agents.module";
import { AIModule } from "./modules/ai/ai.module";

@Module({
  imports: [HealthModule, IntentsModule, AuthModule, AgentsModule, AIModule],
})
export class AppModule {}
