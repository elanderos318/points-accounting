import { Controller } from '@nestjs/common';
import { TransactionService } from './transaction.service';

@Controller('points')
export class PointsController {
  constructor(private readonly transactionService: TransactionService) {}
}
