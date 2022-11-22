import { Transaction } from './transaction.interface';

/**
 * @description describes a linked list node of positions yet to be closed, ordered by ascending timestamp
 */
export interface OpenPosition {
  payer: Transaction['payer'];
  balance: number;
  timestamp: Transaction['timestamp'];
  next: OpenPosition | null;
}
