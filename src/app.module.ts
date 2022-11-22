import { Module } from '@nestjs/common';
import { PointsModule } from './points/points.module';

@Module({
  imports: [PointsModule],
})
export class AppModule {}
