import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { GenerateSettlementDto } from './dto/generate-settlement.dto';
import { SettlementsService } from './settlements.service';

@Controller('settlements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'MANAGER')
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Post('generate')
  generate(@Body() dto: GenerateSettlementDto) {
    return this.settlementsService.generateMonthlySettlement(
      dto.houseId,
      dto.month,
      dto.year,
      new Date(dto.dueDate),
    );
  }

  @Get('house/:houseId')
  listByHouse(@Param('houseId') houseId: string, @Query('month') month?: string) {
    return this.settlementsService.listByHouse(houseId, month);
  }
}
