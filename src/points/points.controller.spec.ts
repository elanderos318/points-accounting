import { Test, TestingModule } from '@nestjs/testing';
import { PointsController } from './points.controller';
import { TransactionService } from './transaction.service';

describe('PointsController', () => {
  let pointsController: PointsController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PointsController],
      providers: [TransactionService],
    }).compile();

    pointsController = app.get<PointsController>(PointsController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(pointsController.getHello()).toBe('hello');
    });
  });
});
