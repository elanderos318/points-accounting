import { Test, TestingModule } from '@nestjs/testing';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { OpenPosition } from './interfaces/open-position.interface';
import { Transaction } from './interfaces/transaction.interface';
import { TransactionService } from './transaction.service';

describe('TransactionService', () => {
  let transactionService: TransactionService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransactionService],
    }).compile();

    transactionService = module.get<TransactionService>(TransactionService);
  });

  it('should be defined', () => {
    expect(transactionService).toBeDefined();
  });

  describe('createTransaction', () => {
    describe('given 0 point transaction', () => {
      afterAll(() => resetTransactionProperties());

      it('throws an error', () => {
        const createTransactionDto: CreateTransactionDto = {
          payer: 'DANNON',
          points: 0,
          timestamp: new Date(),
        };
        const error = () =>
          transactionService.createTransaction(createTransactionDto);
        expect(error).toThrow('cannot process 0 point transactions');
      });
      it('does not persist a transaction', () => {
        expect(transactionService.transactions.length).toBe(0);
      });
      it('does not persist an open position', () => {
        expect(transactionService.openPositionHead).toBeNull();
      });
    });

    describe('given transactions are empty', () => {
      describe('given negative transaction', () => {
        afterAll(() => resetTransactionProperties());

        it('throws an error', () => {
          const createTransactionDto: CreateTransactionDto = {
            payer: 'DANNON',
            points: -100,
            timestamp: new Date(),
          };
          const error = () =>
            transactionService.createTransaction(createTransactionDto);
          expect(error).toThrow(
            'insufficient balance for debit value as of timestamp',
          );
        });
        it('does not persist a transaction', () => {
          expect(transactionService.transactions.length).toBe(0);
        });
        it('does not persist an open position', () => {
          expect(transactionService.openPositionHead).toBeNull();
        });
      });

      describe('given positive transaction', () => {
        let createTransactionDto: CreateTransactionDto;
        let returnedTransaction: Transaction;

        beforeAll(() => {
          createTransactionDto = {
            payer: 'DANNON',
            points: 100,
            timestamp: new Date(),
          };
          returnedTransaction =
            transactionService.createTransaction(createTransactionDto);
        });
        afterAll(() => resetTransactionProperties());

        it('returns expected transaction', () => {
          expect(returnedTransaction.payer).toBe(createTransactionDto.payer);
          expect(returnedTransaction.points).toBe(createTransactionDto.points);
          expect(returnedTransaction.timestamp.valueOf()).toBe(
            createTransactionDto.timestamp.valueOf(),
          );
        });
        it('persists a transaction', () => {
          expect(transactionService.transactions.length).toBe(1);

          const transaction = transactionService.transactions[0];
          expect(transaction.payer).toBe(createTransactionDto.payer);
          expect(transaction.points).toBe(createTransactionDto.points);
          expect(transaction.timestamp.valueOf()).toBe(
            createTransactionDto.timestamp.valueOf(),
          );
        });
        it('persists an open position', () => {
          expect(transactionService.openPositionHead).toBeDefined();

          const openPositionHead = transactionService.openPositionHead;
          expect(openPositionHead.payer).toBe(createTransactionDto.payer);
          expect(openPositionHead.balance).toBe(createTransactionDto.points);
          expect(openPositionHead.timestamp.valueOf()).toBe(
            createTransactionDto.timestamp.valueOf(),
          );
          expect(openPositionHead.next).toBeNull();
        });
      });
    });

    describe('given transactions are not empty', () => {
      describe('given negative transaction', () => {
        describe('given insufficient payer balance', () => {
          let startingTransactions: Transaction[];
          let openPositionHead: OpenPosition;

          beforeAll(() => {
            startingTransactions = [
              {
                payer: 'DANNON',
                points: 100,
                timestamp: new Date('2022-04-04'),
              },
              {
                payer: 'UNILEVER',
                points: 100,
                timestamp: new Date('2022-04-04'),
              },
            ];
            transactionService.transactions = [...startingTransactions];

            const secondOpenPosition: OpenPosition = {
              payer: 'UNILEVER',
              balance: 100,
              timestamp: new Date('2022-04-04'),
              next: null,
            };
            openPositionHead = {
              payer: 'DANNON',
              balance: 100,
              timestamp: new Date('2022-04-04'),
              next: secondOpenPosition,
            };
            transactionService.openPositionHead =
              toClientFormat(openPositionHead);
          });
          afterAll(() => resetTransactionProperties());

          it('throws an error', () => {
            const createTransactionDto: CreateTransactionDto = {
              payer: 'DANNON',
              points: -150,
              timestamp: new Date('2022-08-01'),
            };
            const error = () =>
              transactionService.createTransaction(createTransactionDto);
            expect(error).toThrow(
              'insufficient balance for debit value as of timestamp',
            );
          });
          it('does not persist a transaction', () => {
            expect(transactionService.transactions).toEqual(
              startingTransactions,
            );
          });
          it('does not persist an open position', () => {
            matchOpenPositions(
              transactionService.openPositionHead,
              toClientFormat(openPositionHead),
            );
          });
        });

        describe('given insufficient payer balance due to early timestamp', () => {
          let startingTransactions: Transaction[];
          let openPositionHead: OpenPosition;

          beforeAll(() => {
            startingTransactions = [
              {
                payer: 'DANNON',
                points: 100,
                timestamp: new Date('2022-04-04'),
              },
              {
                payer: 'DANNON',
                points: 100,
                timestamp: new Date('2022-06-04'),
              },
            ];
            transactionService.transactions = [...startingTransactions];

            const secondOpenPosition: OpenPosition = {
              payer: 'DANNON',
              balance: 100,
              timestamp: new Date('2022-06-04'),
              next: null,
            };
            openPositionHead = {
              payer: 'DANNON',
              balance: 100,
              timestamp: new Date('2022-04-04'),
              next: secondOpenPosition,
            };
            transactionService.openPositionHead =
              toClientFormat(openPositionHead);
          });
          afterAll(() => resetTransactionProperties());

          it('throws an error', () => {
            const createTransactionDto: CreateTransactionDto = {
              payer: 'DANNON',
              points: -150,
              timestamp: new Date('2022-05-01'),
            };
            const error = () =>
              transactionService.createTransaction(createTransactionDto);
            expect(error).toThrow(
              'insufficient balance for debit value as of timestamp',
            );
          });
          it('does not persist a transaction', () => {
            expect(transactionService.transactions).toEqual(
              startingTransactions,
            );
          });
          it('does not persist an open position', () => {
            matchOpenPositions(
              transactionService.openPositionHead,
              toClientFormat(openPositionHead),
            );
          });
        });

        describe('given sufficient payer balance for debit value', () => {
          let startingTransactions: Transaction[];
          let openPositionHead: OpenPosition;
          let createTransactionDto: CreateTransactionDto;
          let returnedTransaction: Transaction;

          beforeAll(() => {
            startingTransactions = [
              {
                payer: 'MILLER COORS',
                points: 50,
                timestamp: new Date('2022-04-04'),
              },
              {
                payer: 'DANNON',
                points: 100,
                timestamp: new Date('2022-04-04'),
              },
              {
                payer: 'DANNON',
                points: 100,
                timestamp: new Date('2022-04-04'),
              },
            ];
            transactionService.transactions = [...startingTransactions];

            const thirdOpenPosition: OpenPosition = {
              payer: 'DANNON',
              balance: 100,
              timestamp: new Date('2022-04-04'),
              next: null,
            };
            const secondOpenPosition: OpenPosition = {
              payer: 'DANNON',
              balance: 100,
              timestamp: new Date('2022-04-04'),
              next: thirdOpenPosition,
            };
            openPositionHead = {
              payer: 'MILLER COORS',
              balance: 50,
              timestamp: new Date('2022-04-04'),
              next: secondOpenPosition,
            };
            transactionService.openPositionHead =
              toClientFormat(openPositionHead);

            createTransactionDto = {
              payer: 'DANNON',
              points: -150,
              timestamp: new Date('2022-08-01'),
            };
            returnedTransaction =
              transactionService.createTransaction(createTransactionDto);
          });
          afterAll(() => resetTransactionProperties());

          it('returns expected transaction', () => {
            expect(returnedTransaction).toStrictEqual(createTransactionDto);
          });
          it('persists a transaction', () => {
            expect(transactionService.transactions.length).toBe(
              startingTransactions.length + 1,
            );
            expect(transactionService.transactions).toEqual([
              ...startingTransactions,
              returnedTransaction,
            ]);
          });
          it('updates open positions', () => {
            const expectedOpenPosition: OpenPosition = toClientFormat({
              ...openPositionHead,
              next: {
                payer: 'DANNON',
                balance: 50,
                timestamp: new Date('2022-04-04'),
                next: null,
              },
            });
            matchOpenPositions(
              transactionService.openPositionHead,
              expectedOpenPosition,
            );
          });
        });
      });

      describe('given positive transaction', () => {
        describe('given open position to be placed at head of list', () => {
          let startingTransactions: Transaction[];
          let openPositionHead: OpenPosition;
          let createTransactionDto: CreateTransactionDto;
          let returnedTransaction: Transaction;

          beforeAll(() => {
            startingTransactions = [
              {
                payer: 'DANNON',
                points: 100,
                timestamp: new Date('2022-04-04'),
              },
            ];
            transactionService.transactions = [...startingTransactions];

            openPositionHead = {
              payer: 'DANNON',
              balance: 100,
              timestamp: new Date('2022-04-04'),
              next: null,
            };
            transactionService.openPositionHead =
              toClientFormat(openPositionHead);

            createTransactionDto = {
              payer: 'DANNON',
              points: 150,
              timestamp: new Date('2022-03-01'),
            };
            returnedTransaction =
              transactionService.createTransaction(createTransactionDto);
          });
          afterAll(() => resetTransactionProperties());

          it('returns expected transaction', () => {
            expect(returnedTransaction).toStrictEqual(createTransactionDto);
          });
          it('persists a transaction', () => {
            expect(transactionService.transactions.length).toBe(
              startingTransactions.length + 1,
            );
            expect(transactionService.transactions).toEqual([
              ...startingTransactions,
              returnedTransaction,
            ]);
          });
          it('updates open positions in the correct order', () => {
            const secondOpenPosition: OpenPosition = {
              ...openPositionHead,
            };
            const firstPosition: OpenPosition = {
              payer: createTransactionDto.payer,
              balance: createTransactionDto.points,
              timestamp: createTransactionDto.timestamp,
              next: secondOpenPosition,
            };

            matchOpenPositions(
              toClientFormat(transactionService.openPositionHead),
              toClientFormat(firstPosition),
            );
          });
        });

        describe('given open position to be placed at end of list', () => {
          let startingTransactions: Transaction[];
          let openPositionHead: OpenPosition;
          let createTransactionDto: CreateTransactionDto;
          let returnedTransaction: Transaction;

          beforeAll(() => {
            startingTransactions = [
              {
                payer: 'DANNON',
                points: 100,
                timestamp: new Date('2022-04-04'),
              },
            ];
            transactionService.transactions = [...startingTransactions];

            openPositionHead = {
              payer: 'DANNON',
              balance: 100,
              timestamp: new Date('2022-04-04'),
              next: null,
            };
            transactionService.openPositionHead =
              toClientFormat(openPositionHead);

            createTransactionDto = {
              payer: 'DANNON',
              points: 150,
              timestamp: new Date('2022-05-01'),
            };
            returnedTransaction =
              transactionService.createTransaction(createTransactionDto);
          });
          afterAll(() => resetTransactionProperties());

          it('returns expected transaction', () => {
            expect(returnedTransaction).toStrictEqual(createTransactionDto);
          });
          it('persists a transaction', () => {
            expect(transactionService.transactions.length).toBe(
              startingTransactions.length + 1,
            );
            expect(transactionService.transactions).toEqual([
              ...startingTransactions,
              returnedTransaction,
            ]);
          });
          it('updates open positions in the correct order', () => {
            const secondOpenPosition: OpenPosition = {
              payer: createTransactionDto.payer,
              balance: createTransactionDto.points,
              timestamp: createTransactionDto.timestamp,
              next: null,
            };
            const firstPosition: OpenPosition = {
              ...openPositionHead,
              next: secondOpenPosition,
            };

            matchOpenPositions(
              toClientFormat(transactionService.openPositionHead),
              toClientFormat(firstPosition),
            );
          });
        });

        describe('given open position to be placed in middle of list', () => {
          let startingTransactions: Transaction[];
          let openPositionHead: OpenPosition;
          let endPosition: OpenPosition;
          let createTransactionDto: CreateTransactionDto;
          let returnedTransaction: Transaction;

          beforeAll(() => {
            startingTransactions = [
              {
                payer: 'DANNON',
                points: 100,
                timestamp: new Date('2022-04-04'),
              },
              {
                payer: 'UNILEVER',
                points: 200,
                timestamp: new Date('2022-06-04'),
              },
            ];
            transactionService.transactions = [...startingTransactions];

            endPosition = {
              payer: 'UNILEVER',
              balance: 150,
              timestamp: new Date('2022-06-04'),
              next: null,
            };
            openPositionHead = {
              payer: 'DANNON',
              balance: 100,
              timestamp: new Date('2022-04-04'),
              next: endPosition,
            };
            transactionService.openPositionHead =
              toClientFormat(openPositionHead);

            createTransactionDto = {
              payer: 'MILLER COORS',
              points: 150,
              timestamp: new Date('2022-05-01'),
            };
            returnedTransaction =
              transactionService.createTransaction(createTransactionDto);
          });
          afterAll(() => resetTransactionProperties());

          it('returns expected transaction', () => {
            expect(returnedTransaction).toStrictEqual(createTransactionDto);
          });
          it('persists a transaction', () => {
            expect(transactionService.transactions.length).toBe(
              startingTransactions.length + 1,
            );
            expect(transactionService.transactions).toEqual([
              ...startingTransactions,
              returnedTransaction,
            ]);
          });
          it('updates open positions in the correct order', () => {
            const thirdOpenPosition: OpenPosition = {
              ...endPosition,
            };
            const secondOpenPosition: OpenPosition = {
              payer: createTransactionDto.payer,
              balance: createTransactionDto.points,
              timestamp: createTransactionDto.timestamp,
              next: thirdOpenPosition,
            };
            const firstPosition: OpenPosition = {
              ...openPositionHead,
              next: secondOpenPosition,
            };

            matchOpenPositions(
              toClientFormat(transactionService.openPositionHead),
              toClientFormat(firstPosition),
            );
          });
        });
      });
    });
  });

  const resetTransactionProperties = () => {
    transactionService.transactions = [];
    transactionService.openPositionHead = null;
  };

  const matchOpenPositions = (
    openPosition: OpenPosition | null,
    expectedOpenPosition: OpenPosition | null,
  ): void => {
    if (expectedOpenPosition === null) {
      expect(openPosition).toBeNull();
      return;
    }

    expect(openPosition).toEqual(expectedOpenPosition);
    return matchOpenPositions(openPosition.next, expectedOpenPosition.next);
  };

  const toClientFormat = (object: OpenPosition | null) =>
    JSON.parse(JSON.stringify(object));
});
