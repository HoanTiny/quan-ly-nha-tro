import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GrantEvnAccessDto {
  @ApiProperty({ description: 'User ID to grant access to' })
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
