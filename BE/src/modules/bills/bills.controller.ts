import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { BillsService } from './bills.service';

@Controller('bills')
@UseGuards(JwtAuthGuard)
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('month') month?: string) {
    return this.billsService.listForUser(user.sub, month);
  }

  @Get(':billId')
  findOne(@CurrentUser() user: AuthUser, @Param('billId') billId: string) {
    return this.billsService.findDetail(billId, user.sub);
  }
}
