import { Module } from "@nestjs/common";
import { IntentsController } from "./intents.controller";
import { ConfirmIntentController } from "./confirm-intent.controller";

@Module({
  controllers: [IntentsController, ConfirmIntentController],
})
export class IntentsModule {}
