import { Module } from '@nestjs/common';
import { DisposalsService } from './disposals.service';
import { DisposalsController } from './disposals.controller';

@Module({
  providers: [DisposalsService],
  controllers: [DisposalsController],
})
export class DisposalsModule {}
