import { PaymentProvider } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  settlementLineId!: string;

  @IsString()
  payerUserId!: string;

  @IsOptional()
  @IsString()
  payeeUserId?: string;

  @IsEnum(PaymentProvider)
  gateway!: PaymentProvider;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  proofUrl?: string;

  @IsOptional()
  @IsString()
  transactionRef?: string;
}
