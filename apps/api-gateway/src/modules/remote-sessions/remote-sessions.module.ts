import { Module } from "@nestjs/common";
import { RemoteSessionsController } from "./remote-sessions.controller";
import { RemoteSessionsService } from "./remote-sessions.service";
import { DevicesModule } from "../devices/devices.module";

@Module({
  imports: [DevicesModule],
  controllers: [RemoteSessionsController],
  providers: [RemoteSessionsService],
  exports: [RemoteSessionsService],
})
export class RemoteSessionsModule {}
