import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  admin(@Query('houseId') houseId: string, @Query('month') month?: string) {
    return this.dashboardService.adminSummary(houseId, month);
  }

  @Get('member')
  member(@CurrentUser() user: AuthUser, @Query('month') month?: string) {
    return this.dashboardService.memberSummary(user.sub, month);
  }
}
