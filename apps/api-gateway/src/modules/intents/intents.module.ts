import { Module } from "@nestjs/common";
import { IntentsController } from "./intents.controller";
import { ConfirmIntentController } from "./confirm-intent.controller";
import { IntentsSimpleController } from "./intents-simple.controller";
import { AUDIT_LOG, auditLogFactory } from "./audit-log.provider";
import { NATS_CONNECTION, natsConnectionFactory } from "./nats-connection.provider";

@Module({
  controllers: [IntentsController, ConfirmIntentController, IntentsSimpleController],
  providers: [
    { provide: AUDIT_LOG, useFactory: auditLogFactory },
    { provide: NATS_CONNECTION, useFactory: natsConnectionFactory },
  ],
})
export class IntentsModule {}
