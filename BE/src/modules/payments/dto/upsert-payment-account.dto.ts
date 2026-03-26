import { IsOptional, IsString } from 'class-validator';

export class UpsertPaymentAccountDto {
  @IsString()
  houseId!: string;

  @IsString()
  accountName!: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankBin?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  staticQrImageUrl?: string;
}
