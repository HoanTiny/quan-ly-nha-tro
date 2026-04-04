import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class SaveEvnCredentialsDto {
  @ApiProperty({ description: 'EVN username (phone number or account)' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ description: 'EVN password' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({
    description: 'Whether to share EVN access with household members (deprecated - use member access API instead)',
    default: false
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  shareWithMembers?: boolean;
}

export class TestEvnConnectionDto {
  @ApiProperty({ description: 'EVN username (optional, uses saved if not provided)' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ description: 'EVN password (optional, uses saved if not provided)' })
  @IsString()
  @IsOptional()
  password?: string;
}
