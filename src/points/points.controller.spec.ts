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
    const timestamp = new Date('2022-10-31');
    let createTransactionDto: CreateTransactionDto;

    beforeAll(async () => {
      createTransactionDto = {
        payer: 'DANNON',
        points: 500,
        timestamp,
      };
      response = await request(app.getHttpServer())
        .post('/points/transaction')
        .send(createTransactionDto);
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
        points: 250,
      };
      response = await request(app.getHttpServer())
        .post('/points/spend')
        .send(spendPointsDto);
    });

    it('should respond with 201', () => {
      expect(response.statusCode).toBe(201);
    });
    it('should return expected transactions', () => {
      expect(response.body).toEqual(
        toClientFormat([
          { payer: 'DANNON', points: -250, timestamp: mockDate },
        ]) as Transaction[],
      );
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
      expect(response.body).toEqual({ DANNON: 250 });
    });
  });

  const toClientFormat = (object: any) => JSON.parse(JSON.stringify(object));
});
