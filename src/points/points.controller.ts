import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { SpendPointsDto } from './dto/spend-points.dto';
import { PayerBalances } from './interfaces/payer-balances.interface';
import { Transaction } from './interfaces/transaction.interface';
import { TransactionService } from './transaction.service';

@Controller('points')
export class PointsController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post('transaction')
  @ApiOperation({ description: 'POST payer transacaction success ' })
  @HttpCode(201)
  @UsePipes(new ValidationPipe({ transform: true }))
  createTransaction(
    @Body() createTransactionDto: CreateTransactionDto,
  ): Transaction {
    return this.transactionService.createTransaction(createTransactionDto);
  }

  @Post('spend')
  @ApiOperation({ description: 'POST spend points success ' })
  @HttpCode(201)
  @UsePipes(new ValidationPipe({ transform: true }))
  spendPoints(@Body() spendPointsDto: SpendPointsDto): Transaction[] {
    return this.transactionService.spendPoints(spendPointsDto);
  }

  @Get('balances')
  @ApiOperation({ description: 'GET payer balances success ' })
  @HttpCode(200)
  getBalances(): PayerBalances {
    return this.transactionService.getPayerBalances();
  }
}
