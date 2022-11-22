import { IsInt, NotEquals } from 'class-validator';

export class SpendPointsDto {
  @IsInt()
  @NotEquals(0)
  points: number;
}
