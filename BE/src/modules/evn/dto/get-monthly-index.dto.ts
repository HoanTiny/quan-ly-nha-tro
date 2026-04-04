import { IsString, IsNotEmpty, IsInt, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetMonthlyIndexDto {
  @ApiProperty({ description: 'Unit code (e.g., HN0100)' })
  @IsString()
  @IsNotEmpty()
  maDViQLy!: string;

  @ApiProperty({ description: 'Customer ID (e.g., PD30000222084)' })
  @IsString()
  @IsNotEmpty()
  maKhachHang!: string;

  @ApiProperty({ description: 'Measurement point ID (e.g., PD30000222084001)' })
  @IsString()
  @IsNotEmpty()
  maDiemDo!: string;

  @ApiProperty({ description: 'Year (e.g., 2026)' })
  @IsInt()
  @IsNotEmpty()
  nam!: number;

  @ApiProperty({ description: 'Month (1-12)' })
  @IsInt()
  @IsOptional()
  thang?: number;
}

export class MonthlyIndexResponseDto {
  @ApiProperty()
  maDViQLy?: string;

  @ApiProperty()
  maDiemDo?: string;

  @ApiProperty()
  nam?: number;

  @ApiProperty()
  thang?: number;

  @ApiProperty({ description: 'Total usage for the month' })
  tongSo?: number;

  @ApiProperty({ description: 'Monthly readings' })
  data?: MonthlyReading[];
}

export class MonthlyReading {
  @ApiProperty()
  thang!: number;

  @ApiProperty()
  nam!: number;

  @ApiProperty()
  chiSoDau!: number;

  @ApiProperty()
  chiSoCuoi!: number;

  @ApiProperty()
  sanLuong!: number;

  @ApiProperty()
  loaiBcs!: string;
}
