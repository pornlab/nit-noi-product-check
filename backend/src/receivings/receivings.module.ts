import { Module } from '@nestjs/common';
import { ReceivingsService } from './receivings.service';
import { ReceivingsController } from './receivings.controller';

@Module({
  providers: [ReceivingsService],
  controllers: [ReceivingsController],
})
export class ReceivingsModule {}
