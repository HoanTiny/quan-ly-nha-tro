import { IsDateString, IsInt, IsString, Max, Min } from 'class-validator';

export class GenerateSettlementDto {
  @IsString()
  houseId!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsInt()
  year!: number;

  @IsDateString()
  dueDate!: string;
}
