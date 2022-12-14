import { Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Transaction } from './interfaces/transaction.interface';

import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import { OpenPosition } from './interfaces/open-position.interface';
import { SpendPointsDto } from './dto/spend-points.dto';
import { PayerBalances } from './interfaces/payer-balances.interface';

dayjs.extend(utc);

@Injectable()
export class TransactionService {
  public transactions: Transaction[];
  public openPositionHead: OpenPosition | null;

  constructor() {
    this.transactions = [];
    this.openPositionHead = null;
  }

  public createTransaction(
    createTransactionDto: CreateTransactionDto,
  ): Transaction {
    // do not process 0 point transactions
    if (createTransactionDto.points === 0) {
      throw new Error('cannot process 0 point transactions');
    }
    const transaction: Transaction = {
      payer: createTransactionDto.payer,
      points: createTransactionDto.points,
      timestamp: dayjs(createTransactionDto.timestamp).utc().toDate(),
    };
    this.updateOpenPositions(transaction);
    this.transactions.push(transaction);

    return transaction;
  }

  public spendPoints(spendPointsDto: SpendPointsDto): Transaction[] {
    const debit = Math.abs(spendPointsDto.points) * -1;
    if (debit === 0) {
      throw new Error('cannot process 0 point transactions');
    }
    if (!this.isValidSpend(this.openPositionHead, debit)) {
      throw new Error('insufficient balance');
    } else {
      const newTransactions = this.spendFromOpenPositions(
        this.openPositionHead,
        debit,
      );
      this.transactions = this.transactions.concat(newTransactions);
      return newTransactions;
    }
  }

  public getPayerBalances(): PayerBalances {
    const payerBalances = {};
    for (const transaction of this.transactions) {
      const payer = transaction.payer;
      if (!(payer in payerBalances)) payerBalances[payer] = 0;
    }

    const _getPlayerBalances = (openPositionHead: OpenPosition) => {
      if (openPositionHead === null) return;
      payerBalances[openPositionHead.payer] += openPositionHead.balance;
      _getPlayerBalances(openPositionHead.next);
    };

    _getPlayerBalances(this.openPositionHead);
    return payerBalances;
  }

  private updateOpenPositions(transaction: Transaction): void {
    if (transaction.points > 0) {
      this.addOpenPosition(this.openPositionHead, transaction);
    } else {
      if (
        !this.isValidDebitTransaction(
          this.openPositionHead,
          transaction.payer,
          transaction.timestamp,
          transaction.points,
        )
      ) {
        throw new Error('insufficient balance for debit value as of timestamp');
      } else {
        this.reducePayerOpenPositions(
          this.openPositionHead,
          transaction.payer,
          transaction.points,
        );
      }
    }
  }

  /**
   * @description recursively inserts an open position in correct index according to timestamp
   * @param {OpenPosition} openPositionHead current position in linked list
   * @param {CreateTransactionDto} createTransactionDto
   * @param {OpenPosition | null} prevPosition previous position in linked list
   */
  private addOpenPosition(
    openPositionHead: OpenPosition | null,
    transaction: Transaction,
    prevPosition: OpenPosition = null,
  ): Transaction[] {
    // if empty linked list
    if (openPositionHead === null && prevPosition === null) {
      this.openPositionHead = {
        payer: transaction.payer,
        timestamp: transaction.timestamp,
        balance: transaction.points,
        next: null,
      };
      return;
    }
    // if reached end of linked list
    else if (openPositionHead === null) {
      prevPosition.next = {
        payer: transaction.payer,
        timestamp: transaction.timestamp,
        balance: transaction.points,
        next: null,
      };
      return;
    }
    // insert new open position by ascending timestamp
    else if (
      dayjs(transaction.timestamp).utc().toDate().valueOf() <
      dayjs(openPositionHead.timestamp).utc().toDate().valueOf()
    ) {
      const newPosition: OpenPosition = {
        payer: transaction.payer,
        timestamp: transaction.timestamp,
        balance: transaction.points,
        next: openPositionHead,
      };
      if (prevPosition === null) {
        this.openPositionHead = newPosition;
      } else {
        prevPosition.next = newPosition;
      }
      return;
    }

    return this.addOpenPosition(
      openPositionHead.next,
      transaction,
      openPositionHead,
    );
  }

  /**
   * @description recursively checks whether payer open positions have sufficient balance as of given timestamp
   * @param openPositionHead current position in linked list
   * @param payer payer to check balance against
   * @param timestamp cut-off date for totaling balances
   * @param debit negative integer to subtract balances from
   */
  private isValidDebitTransaction(
    openPositionHead: OpenPosition | null,
    payer: Transaction['payer'],
    timestamp: Transaction['timestamp'],
    debit: number,
  ): boolean {
    if (debit >= 0) {
      throw new Error('invalid debit value');
    }
    if (
      openPositionHead === null ||
      dayjs(openPositionHead.timestamp).utc().toDate().valueOf() >
        dayjs(timestamp).utc().toDate().valueOf()
    )
      return false;

    let remainingDebit = debit;
    if (openPositionHead.payer === payer) {
      remainingDebit = openPositionHead.balance + debit;
      if (remainingDebit >= 0) return true;
    }

    return this.isValidDebitTransaction(
      openPositionHead.next,
      payer,
      timestamp,
      remainingDebit,
    );
  }

  /**
   * @description subtract balances from payer's open positions totaling debit value and re-assign linked list head
   * @param openPositionHead current position in linked list
   * @param debit negative integer to subtract balances from
   */
  private reducePayerOpenPositions(
    openPositionHead: OpenPosition | null,
    payer: Transaction['payer'],
    debit: number,
    prevPosition: OpenPosition = null,
  ): void {
    if (debit > 0) {
      throw new Error('invalid debit value');
    }
    if (openPositionHead === null && debit < 0) {
      throw new Error('cannot reduce empty position');
    }
    if (debit == 0) {
      return;
    }

    const next = openPositionHead.next;
    if (openPositionHead.payer === payer) {
      // update open position
      openPositionHead.balance += debit;

      const newBalance = openPositionHead.balance;
      // complete if balance remaining
      if (newBalance > 0) {
        return;
      } else {
        // remove position
        if (prevPosition === null) {
          // assign new starting open position
          this.openPositionHead = next;
        } else {
          prevPosition.next = next;
        }
        return this.reducePayerOpenPositions(
          next,
          payer,
          newBalance,
          prevPosition,
        );
      }
    } else {
      return this.reducePayerOpenPositions(
        next,
        payer,
        debit,
        openPositionHead,
      );
    }
  }

  /**
   * @description recursively checks whether open positions contain sufficient balance for spend
   * @param openPositionHead current position in linked list
   * @param debit negative integer to subtract balances from
   */
  private isValidSpend(
    openPositionHead: OpenPosition | null,
    debit: number,
  ): boolean {
    if (debit >= 0) {
      throw new Error('invalid debit value');
    }
    if (openPositionHead === null) return false;

    const remainingDebit = openPositionHead.balance + debit;
    if (remainingDebit >= 0) return true;

    return this.isValidSpend(openPositionHead.next, remainingDebit);
  }

  /**
   * @description subtract balances from open positions totalling debit value and re-assign linked list head
   * @param openPositionHead current position in linked list
   * @param debit negative integer to subtract balances from
   */
  private spendFromOpenPositions(
    openPositionHead: OpenPosition | null,
    debit: number,
    transactions: Transaction[] = [],
  ): Transaction[] {
    if (debit > 0) {
      throw new Error('invalid debit value');
    }
    if (openPositionHead === null && debit < 0) {
      throw new Error('cannot reduce empty position');
    }
    if (debit == 0) {
      this.openPositionHead = openPositionHead;
      return transactions;
    }

    // create transaction
    const transactionValue =
      Math.min(Math.abs(openPositionHead.balance), Math.abs(debit)) * -1;
    const transaction: Transaction = {
      payer: openPositionHead.payer,
      points: transactionValue,
      timestamp: dayjs().utc().toDate(),
    };
    transactions.push(transaction);

    // update open position
    openPositionHead.balance += debit;

    // complete if balance remaining
    if (openPositionHead.balance > 0) {
      this.openPositionHead = openPositionHead;
      return transactions;
    } else {
      return this.spendFromOpenPositions(
        openPositionHead.next,
        openPositionHead.balance,
        transactions,
      );
    }
  }
}
