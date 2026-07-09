import { Module } from "@nestjs/common";
import { IntentsController } from "./intents.controller";

@Module({
  controllers: [IntentsController],
})
export class IntentsModule {}
