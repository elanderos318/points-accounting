import { IsDateString, IsString, IsInt, NotEquals } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  payer: string;

  @IsInt()
  @NotEquals(0)
  points: number;

  @IsDateString()
  timestamp: Date;
}
