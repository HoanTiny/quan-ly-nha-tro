import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EvnLoginDto {
  @ApiProperty({ description: 'EVN username (phone number or account)' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ description: 'EVN password' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class EvnTokenResponseDto {
  @ApiProperty()
  access_token!: string;

  @ApiProperty()
  expires_in!: number;

  @ApiProperty()
  token_type!: string;

  @ApiProperty()
  scope!: string;
}
