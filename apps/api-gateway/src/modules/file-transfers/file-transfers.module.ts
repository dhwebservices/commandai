import { Module } from "@nestjs/common";
import { FileTransfersController } from "./file-transfers.controller";
import { FileTransfersService } from "./file-transfers.service";

@Module({
  controllers: [FileTransfersController],
  providers: [FileTransfersService],
  exports: [FileTransfersService],
})
export class FileTransfersModule {}
