import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EvnService } from './evn.service';
import { EvnLoginDto } from './dto/evn-login.dto';
import { GetMeterReadingDto } from './dto/get-meter-reading.dto';
import { GetMonthlyIndexDto } from './dto/get-monthly-index.dto';
import {
  SaveEvnCredentialsDto,
  TestEvnConnectionDto,
} from './dto/save-credentials.dto';
import { GrantEvnAccessDto } from './dto/grant-evn-access.dto';
import { EvnCredentialsResponseDto, EvnAccessInfoDto } from './dto/evn-access-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { HouseRoleGuard } from '../../common/guards/house-role.guard';
import { HouseRoles } from '../../common/decorators/house-roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../modules/auth/interfaces/auth-user.interface';
import { HouseRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('evn')
@Controller('evn')
export class EvnController {
  constructor(
    private readonly evnService: EvnService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Login to EVN API and get access token' })
  async login(@Body() loginDto: EvnLoginDto) {
    return this.evnService.login(loginDto);
  }

  @Post('meter-readings')
  @ApiOperation({ summary: 'Get meter readings for a customer' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getMeterReadings(
    @Body() body: GetMeterReadingDto,
    @CurrentUser() user: AuthUser,
  ) {
    // Get houseId from user's membership
    const houseId = user.houseRoles
      ? Object.keys(user.houseRoles)[0]
      : undefined;

    // If user has no house, return error gracefully
    if (!houseId) {
      throw new HttpException(
        'User is not a member of any house. Please contact admin to add you to a house.',
        HttpStatus.FORBIDDEN,
      );
    }
    return this.evnService.getMeterReadingsForHouse(houseId, body);
  }

  @Post('monthly-index')
  @ApiOperation({ summary: 'Get monthly index for a customer' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getMonthlyIndex(
    @Body() body: GetMonthlyIndexDto,
    @CurrentUser() user: AuthUser,
  ) {
    const houseId = user.houseRoles
      ? Object.keys(user.houseRoles)[0]
      : undefined;
    if (!houseId) {
      throw new Error('User is not a member of any house');
    }
    return this.evnService.getMonthlyIndexForHouse(houseId, body);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get list of customers (requires EVN token)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getCustomerList(@Query('token') token?: string) {
    if (!token) {
      token = await this.evnService.getValidToken();
    }
    return this.evnService.getCustomerList(token);
  }

  @Post('test-connection')
  @ApiOperation({ summary: 'Test connection to EVN API' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, HouseRoleGuard)
  @HouseRoles(HouseRole.OWNER, HouseRole.MANAGER)
  async testConnection(@Body() loginDto?: TestEvnConnectionDto) {
    try {
      const credentials: EvnLoginDto | undefined =
        loginDto?.username && loginDto?.password
          ? { username: loginDto.username, password: loginDto.password }
          : undefined;
      const tokenData = await this.evnService.login(credentials);
      return {
        success: true,
        message: 'Successfully connected to EVN API',
        token: tokenData.access_token,
        expiresIn: tokenData.expires_in,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // ============= Credentials Management =============

  @Post('credentials')
  @ApiOperation({ summary: 'Save EVN credentials for the house' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, HouseRoleGuard)
  @HouseRoles(HouseRole.OWNER, HouseRole.MANAGER)
  async saveCredentials(
    @Body() dto: SaveEvnCredentialsDto,
    @CurrentUser() user: AuthUser,
  ) {
    const houseId = user.houseRoles
      ? Object.keys(user.houseRoles)[0]
      : undefined;
    if (!houseId) {
      throw new Error('User is not a member of any house');
    }
    await this.evnService.saveCredentials(houseId, user.sub, dto);
    return { success: true, message: 'EVN credentials saved successfully' };
  }

  @Get('credentials')
  @ApiOperation({ summary: 'Get EVN credentials status for the house' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getCredentials(
    @CurrentUser() user: AuthUser,
  ): Promise<EvnCredentialsResponseDto> {
    const houseId = user.houseRoles
      ? Object.keys(user.houseRoles)[0]
      : undefined;

    // If user has no house, return empty credentials gracefully
    if (!houseId) {
      return {
        hasCredentials: false,
      };
    }

    const credentials = await this.evnService.getCredentials(houseId);
    return (
      credentials ?? {
        hasCredentials: false,
      }
    );
  }

  @Get('credentials/members')
  @ApiOperation({ summary: 'Get all house members with EVN access status' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, HouseRoleGuard)
  @HouseRoles(HouseRole.OWNER, HouseRole.MANAGER)
  async getHouseMembers(@CurrentUser() user: AuthUser): Promise<EvnAccessInfoDto[]> {
    const houseId = user.houseRoles
      ? Object.keys(user.houseRoles)[0]
      : undefined;
    if (!houseId) {
      throw new HttpException('User is not a member of any house', HttpStatus.FORBIDDEN);
    }

    // Get credential to get credentialId
    const credential = await this.prisma.evnCredential.findFirst({
      where: { houseId, isActive: true },
      select: { id: true }
    });

    return this.evnService.getHouseMembersWithAccessStatus(houseId, credential?.id);
  }

  @Post('credentials/:credentialId/grant')
  @ApiOperation({ summary: 'Grant EVN access to a specific member' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, HouseRoleGuard)
  @HouseRoles(HouseRole.OWNER, HouseRole.MANAGER)
  async grantAccess(
    @Param('credentialId') credentialId: string,
    @Body() dto: GrantEvnAccessDto,
    @CurrentUser() user: AuthUser,
  ) {
    const houseId = user.houseRoles
      ? Object.keys(user.houseRoles)[0]
      : undefined;
    if (!houseId) {
      throw new HttpException('User is not a member of any house', HttpStatus.FORBIDDEN);
    }

    await this.evnService.grantAccess(houseId, credentialId, dto.userId, user.sub);
    return { success: true, message: 'Access granted successfully' };
  }

  @Delete('credentials/:credentialId/revoke/:userId')
  @ApiOperation({ summary: 'Revoke EVN access from a member' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, HouseRoleGuard)
  @HouseRoles(HouseRole.OWNER, HouseRole.MANAGER)
  async revokeAccess(
    @Param('credentialId') credentialId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const houseId = user.houseRoles
      ? Object.keys(user.houseRoles)[0]
      : undefined;
    if (!houseId) {
      throw new HttpException('User is not a member of any house', HttpStatus.FORBIDDEN);
    }

    await this.evnService.revokeAccess(houseId, credentialId, userId);
    return { success: true, message: 'Access revoked successfully' };
  }

  @Post('credentials/toggle-all')
  @ApiOperation({ summary: 'Toggle EVN access for all members at once' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, HouseRoleGuard)
  @HouseRoles(HouseRole.OWNER, HouseRole.MANAGER)
  async toggleAccessForAll(
    @Body() body: { grantAccess: boolean },
    @CurrentUser() user: AuthUser,
  ) {
    const houseId = user.houseRoles
      ? Object.keys(user.houseRoles)[0]
      : undefined;
    if (!houseId) {
      throw new HttpException('User is not a member of any house', HttpStatus.FORBIDDEN);
    }

    const credential = await this.prisma.evnCredential.findFirst({
      where: { houseId, isActive: true },
      select: { id: true }
    });

    if (!credential) {
      throw new HttpException('No EVN credentials found', HttpStatus.NOT_FOUND);
    }

    await this.evnService.toggleAccessForAllMembers(
      houseId,
      credential.id,
      body.grantAccess,
      user.sub
    );
    return { success: true, message: 'Access settings updated successfully' };
  }

  @Get('credentials/check-access')
  @ApiOperation({ summary: 'Check if current user has EVN access' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async checkAccess(@CurrentUser() user: AuthUser) {
    const houseId = user.houseRoles
      ? Object.keys(user.houseRoles)[0]
      : undefined;
    if (!houseId) {
      return { hasAccess: false };
    }

    const hasAccess = await this.evnService.userHasAccess(houseId, user.sub);
    return { hasAccess };
  }
}
