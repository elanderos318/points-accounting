import { Test, TestingModule } from '@nestjs/testing';

import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { PointsModule } from './points.module';
import { Transaction } from './interfaces/transaction.interface';
import { SpendPointsDto } from './dto/spend-points.dto';
import MockDate from 'mockdate';

describe('PointsController', () => {
  let response: request.Response;
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PointsModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => await app.close());

  describe('POST /points/transaction', () => {
    const timestamp = new Date('2022-10-31T10:00:00Z');
    let createTransactionDto: CreateTransactionDto;

    beforeAll(async () => {
      createTransactionDto = {
        payer: 'DANNON',
        points: 300,
        timestamp,
      };
      response = await request(app.getHttpServer())
        .post('/points/transaction')
        .send(createTransactionDto);
    });
    afterAll(async () => {
      const transactions: CreateTransactionDto[] = [
        {
          payer: 'UNILEVER',
          points: 200,
          timestamp: new Date('2022-10-31T11:00:00Z'),
        },
        {
          payer: 'DANNON',
          points: -200,
          timestamp: new Date('2022-10-31T15:00:00Z'),
        },
        {
          payer: 'MILLER COORS',
          points: 10000,
          timestamp: new Date('2022-11-01T14:00:00Z'),
        },
        {
          payer: 'DANNON',
          points: 1000,
          timestamp: new Date('2022-11-02T14:00:00Z'),
        },
      ];
      for (const transaction of transactions) {
        await request(app.getHttpServer())
          .post('/points/transaction')
          .send(transaction);
      }
    });

    it('should respond with 201', () => {
      expect(response.statusCode).toBe(201);
    });
    it('should return expected transaction', () => {
      expect(response.body).toEqual(
        toClientFormat(createTransactionDto) as Transaction,
      );
    });
  });

  describe('POST /points/spend', () => {
    const mockDate = new Date('2022-11-01');
    let spendPointsDto: SpendPointsDto;

    beforeAll(async () => {
      MockDate.set(mockDate);
      spendPointsDto = {
        points: 5000,
      };
      response = await request(app.getHttpServer())
        .post('/points/spend')
        .send(spendPointsDto);
    });

    it('should respond with 201', () => {
      expect(response.statusCode).toBe(201);
    });
    it('should return expected transactions', () => {
      const expectedTransactions: Transaction[] = [
        { payer: 'DANNON', points: -100, timestamp: mockDate },
        { payer: 'UNILEVER', points: -200, timestamp: mockDate },
        { payer: 'MILLER COORS', points: -4700, timestamp: mockDate },
      ];
      expect(response.body).toEqual(toClientFormat(expectedTransactions));
    });
  });

  describe('GET /points/balances', () => {
    beforeAll(async () => {
      response = await request(app.getHttpServer()).get('/points/balances');
    });

    it('should respond with 200', () => {
      expect(response.statusCode).toBe(200);
    });
    it('should return expected transaction', () => {
      expect(response.body).toEqual({
        DANNON: 1000,
        UNILEVER: 0,
        'MILLER COORS': 5300,
      });
    });
  });

  const toClientFormat = (object: any) => JSON.parse(JSON.stringify(object));
});
