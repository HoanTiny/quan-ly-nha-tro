import { ApiProperty } from '@nestjs/swagger';

export class EvnCredentialsResponseDto {
  @ApiProperty({ description: 'Whether credentials are configured for this house' })
  hasCredentials!: boolean;

  @ApiProperty({ description: 'Masked EVN username (e.g., PD*******084)' })
  maskedUsername?: string;

  @ApiProperty({ description: 'Whether sharing is enabled for members' })
  shareWithMembers?: boolean;

  @ApiProperty({ description: 'EVN customer ID if saved' })
  customerId?: string;

  @ApiProperty({ description: 'EVN meter number if saved' })
  meterNumber?: string;

  @ApiProperty({ description: 'When credentials were last updated' })
  updatedAt?: string;
}
