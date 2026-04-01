import { ExpenseCategory, SplitMethod } from '@prisma/client';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ParticipantWeightDto {
  @IsString()
  membershipId!: string;

  @IsNumber()
  weight!: number;
}

export class CreateExpenseDto {
  @IsString()
  createdById!: string;

  @IsString()
  houseId!: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsString()
  payerUserId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @IsEnum(SplitMethod)
  splitMethod!: SplitMethod;

  @IsNumber()
  totalAmount!: number;

  @IsDateString()
  expenseDate!: string;

  @IsOptional()
  @IsString()
  receiptImageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  participantMembershipIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  participantUserIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantWeightDto)
  participantWeights?: { membershipId: string; weight: number }[];
}
