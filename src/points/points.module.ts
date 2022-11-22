import { Module } from '@nestjs/common';
import { PointsController } from './points.controller';
import { TransactionService } from './transaction.service';

@Module({
  providers: [TransactionService],
  controllers: [PointsController],
})
export class PointsModule {}
