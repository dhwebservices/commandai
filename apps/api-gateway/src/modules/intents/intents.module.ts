import { Module } from "@nestjs/common";
import { IntentsController } from "./intents.controller";
import { ConfirmIntentController } from "./confirm-intent.controller";
import { AUDIT_LOG, auditLogFactory } from "./audit-log.provider";

@Module({
  controllers: [IntentsController, ConfirmIntentController],
  providers: [{ provide: AUDIT_LOG, useFactory: auditLogFactory }],
})
export class IntentsModule {}
