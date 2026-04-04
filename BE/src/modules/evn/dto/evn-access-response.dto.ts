import { ApiProperty } from '@nestjs/swagger';
import { HouseRole } from '@prisma/client';

export class EvnAccessInfoDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: HouseRole })
  role!: HouseRole;

  @ApiProperty()
  hasAccess!: boolean;
}

export class EvnCredentialsResponseDto {
  @ApiProperty()
  hasCredentials!: boolean;

  @ApiProperty()
  maskedUsername?: string;

  @ApiProperty()
  customerId?: string;

  @ApiProperty()
  meterNumber?: string;

  @ApiProperty({ description: 'When credentials were last updated' })
  updatedAt?: string;

  @ApiProperty({ description: 'Credential ID for access management', required: false })
  credentialId?: string;
}
