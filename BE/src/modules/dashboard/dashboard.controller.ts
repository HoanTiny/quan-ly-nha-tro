import { Controller, Get, Logger, Query, UseGuards } from '@nestjs/common';
import { performance } from 'node:perf_hooks';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'MANAGER')
  async admin(@Query('houseId') houseId: string, @Query('month') month?: string) {
    const startedAt = performance.now();
    try {
      return await this.dashboardService.adminSummary(houseId, month);
    } finally {
      this.logger.log(
        `GET /dashboard/admin houseId=${houseId} month=${month ?? 'current'} completed in ${Math.round(performance.now() - startedAt)}ms`,
      );
    }
  }

  @Get('member')
  async member(@CurrentUser() user: AuthUser, @Query('month') month?: string) {
    const startedAt = performance.now();
    try {
      return await this.dashboardService.memberSummary(user.sub, month);
    } finally {
      this.logger.log(
        `GET /dashboard/member userId=${user.sub} month=${month ?? 'current'} completed in ${Math.round(performance.now() - startedAt)}ms`,
      );
    }
  }
}
