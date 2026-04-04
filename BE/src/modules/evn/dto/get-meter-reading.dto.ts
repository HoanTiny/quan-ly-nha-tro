import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetMeterReadingDto {
  @ApiProperty({ description: 'EVN Customer ID (e.g., PD30000222084)' })
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @ApiProperty({ description: 'Measurement point ID (e.g., PD30000222084001)' })
  @IsString()
  @IsNotEmpty()
  maDiemDo!: string;

  @ApiProperty({ description: 'Unit code (e.g., HN0100)' })
  @IsString()
  @IsNotEmpty()
  maDonVi!: string;

  @ApiProperty({ description: 'Start date (format: DD/MM/YYYY)' })
  @IsString()
  @IsNotEmpty()
  ngayDau!: string;

  @ApiProperty({ description: 'End date (format: DD/MM/YYYY)' })
  @IsString()
  @IsNotEmpty()
  ngayCuoi!: string;

  @ApiPropertyOptional({ description: 'Verification code (default: EVNHN)' })
  @IsString()
  @IsOptional()
  maXacThuc?: string;
}

export class TongSanLuong {
  @ApiProperty({ description: 'Normal electricity (ban ngay)' })
  bt?: number;

  @ApiProperty({ description: 'Peak electricity (cao diem)' })
  cd?: number;

  @ApiProperty({ description: 'Off-peak electricity (thap diem)' })
  td?: number;

  @ApiProperty({ description: 'Reactive electricity (vo cong)' })
  vc?: number;

  @ApiProperty({ description: 'Total' })
  kt?: number;
}

export class MeterReadingResponseDto {
  @ApiProperty()
  customerId?: string;

  @ApiProperty()
  maDiemDo?: string;

  @ApiProperty()
  soCto?: string;

  @ApiProperty({ description: 'Daily meter readings' })
  readings!: DailyReading[];

  @ApiProperty({ description: 'Latest index' })
  latestIndex?: number;

  @ApiProperty({ description: 'Previous index' })
  previousIndex?: number;

  @ApiProperty({ description: 'Total usage amount' })
  usage?: number;

  @ApiProperty({ description: 'Total production output' })
  tongSanLuong?: TongSanLuong;
}

export class DailyReading {
  @ApiProperty()
  date!: string;

  @ApiProperty()
  value!: number;

  @ApiProperty({ description: 'Usage for this day' })
  usage?: number;

  @ApiPropertyOptional()
  soCto?: string;

  @ApiPropertyOptional()
  maDiemDo?: string;

  @ApiPropertyOptional()
  hsNhan?: number;

  @ApiPropertyOptional()
  loaiBcs?: string;
}
