import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { HealthModule } from "./modules/health/health.module";
import { IntentsModule } from "./modules/intents/intents.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AgentsModule } from "./modules/agents/agents.module";
import { AIModule } from "./modules/ai/ai.module";
import { CommandsModule } from "./modules/commands/commands.module";
import { AdminModule } from "./modules/admin/admin.module";
import { DevicesModule } from "./modules/devices/devices.module";
import { RemoteSessionsModule } from "./modules/remote-sessions/remote-sessions.module";
import { FileTransfersModule } from "./modules/file-transfers/file-transfers.module";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 10, // 10 requests per minute (general default)
      },
    ]),
    HealthModule,
    IntentsModule,
    AuthModule,
    AgentsModule,
    AIModule,
    CommandsModule,
    AdminModule,
    DevicesModule,
    RemoteSessionsModule,
    FileTransfersModule,
  ],
})
export class AppModule {}
