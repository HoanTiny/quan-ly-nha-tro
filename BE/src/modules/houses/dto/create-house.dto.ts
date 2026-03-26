import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateHouseDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsString()
  address!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  paymentDueDay?: number;
}
