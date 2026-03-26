import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpsertPaymentAccountDto } from './dto/upsert-payment-account.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(user.sub, dto);
  }

  @Post('proof')
  createProof(@CurrentUser() user: AuthUser, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(user.sub, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  list(@Query('houseId') houseId: string, @Query('status') status?: string) {
    return this.paymentsService.list(houseId, status);
  }

  @Get('account')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  getAccount(@Query('houseId') houseId: string) {
    return this.paymentsService.getPaymentAccount(houseId);
  }

  @Get('account/me')
  getMyAccount(@CurrentUser() user: AuthUser, @Query('houseId') houseId: string) {
    return this.paymentsService.getUserPaymentAccount(user.sub, houseId);
  }

  @Put('account')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  upsertAccount(@CurrentUser() user: AuthUser, @Body() dto: UpsertPaymentAccountDto) {
    return this.paymentsService.upsertPaymentAccount(user.sub, dto);
  }

  @Put('account/me')
  upsertMyAccount(@CurrentUser() user: AuthUser, @Body() dto: UpsertPaymentAccountDto) {
    return this.paymentsService.upsertUserPaymentAccount(user.sub, dto);
  }

  @Post('qr')
  generateQr(
    @CurrentUser() user: AuthUser,
    @Body('settlementLineId') settlementLineId: string,
    @Body('payeeUserId') payeeUserId?: string,
  ) {
    return this.paymentsService.generateQr(user.sub, settlementLineId, payeeUserId);
  }

  @Patch(':paymentId/confirm')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  confirm(@Param('paymentId') paymentId: string) {
    return this.paymentsService.confirm(paymentId);
  }
}
