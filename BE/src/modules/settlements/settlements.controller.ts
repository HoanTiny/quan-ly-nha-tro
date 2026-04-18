import { Body, Controller, Get, Logger, Param, Post, Query, UseGuards } from '@nestjs/common';
import { performance } from 'node:perf_hooks';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { GenerateSettlementDto } from './dto/generate-settlement.dto';
import { SettlementsService } from './settlements.service';

@Controller('settlements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'MANAGER')
export class SettlementsController {
  private readonly logger = new Logger(SettlementsController.name);

  constructor(private readonly settlementsService: SettlementsService) {}

  @Post('generate')
  async generate(@Body() dto: GenerateSettlementDto) {
    const startedAt = performance.now();
    try {
      return await this.settlementsService.generateMonthlySettlement(
        dto.houseId,
        dto.month,
        dto.year,
        new Date(dto.dueDate),
      );
    } finally {
      this.logger.log(
        `POST /settlements/generate houseId=${dto.houseId} month=${dto.year}-${`${dto.month}`.padStart(2, '0')} completed in ${Math.round(performance.now() - startedAt)}ms`,
      );
    }
  }

  @Get('house/:houseId')
  async listByHouse(@Param('houseId') houseId: string, @Query('month') month?: string) {
    const startedAt = performance.now();
    try {
      return await this.settlementsService.listByHouse(houseId, month);
    } finally {
      this.logger.log(
        `GET /settlements/house/${houseId} month=${month ?? 'all'} completed in ${Math.round(performance.now() - startedAt)}ms`,
      );
    }
  }
}
