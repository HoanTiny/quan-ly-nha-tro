import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EvnService } from './evn.service';
import { EvnLoginDto } from './dto/evn-login.dto';
import { GetMeterReadingDto } from './dto/get-meter-reading.dto';
import { GetMonthlyIndexDto } from './dto/get-monthly-index.dto';

@ApiTags('evn')
@Controller('evn')
export class EvnController {
  constructor(private readonly evnService: EvnService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login to EVN API and get access token' })
  async login(@Body() loginDto: EvnLoginDto) {
    return this.evnService.login(loginDto);
  }

  @Post('meter-readings')
  @ApiOperation({ summary: 'Get meter readings for a customer' })
  @ApiBearerAuth()
  async getMeterReadings(@Body() body: GetMeterReadingDto) {
    return this.evnService.getMeterReadingsWithAuth(body);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get list of customers (requires EVN token)' })
  @ApiBearerAuth()
  async getCustomerList(@Query('token') token?: string) {
    if (!token) {
      // Use configured credentials to get token
      token = await this.evnService.getValidToken();
    }
    return this.evnService.getCustomerList(token);
  }

  @Post('test-connection')
  @ApiOperation({ summary: 'Test connection to EVN API' })
  async testConnection(@Body() loginDto?: EvnLoginDto) {
    try {
      const tokenData = await this.evnService.login(loginDto);
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

  @Post('monthly-index')
  @ApiOperation({ summary: 'Get monthly index for a customer' })
  @ApiBearerAuth()
  async getMonthlyIndex(@Body() body: GetMonthlyIndexDto) {
    return this.evnService.getMonthlyIndexWithAuth(body);
  }
}
