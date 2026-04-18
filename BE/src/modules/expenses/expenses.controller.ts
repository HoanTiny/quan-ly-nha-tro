import { Body, Controller, Delete, Get, Logger, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { performance } from 'node:perf_hooks';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpensesController {
  private readonly logger = new Logger(ExpensesController.name);

  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @Roles('OWNER', 'MANAGER')
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto) {
    const startedAt = performance.now();
    try {
      return await this.expensesService.createExpense(user.sub, dto);
    } finally {
      this.logger.log(
        `POST /expenses houseId=${dto.houseId} completed in ${Math.round(performance.now() - startedAt)}ms`,
      );
    }
  }

  @Get()
  @Roles('OWNER', 'MANAGER')
  list(@Query('houseId') houseId: string, @Query('month') month?: string) {
    return this.expensesService.list(houseId, month);
  }

  @Get('summary/member')
  getMemberSummary(
    @Query('userId') userId: string,
    @Query('houseId') houseId: string,
    @Query('month') month: string,
  ) {
    return this.expensesService.getMemberExpenseSummary(userId, houseId, month);
  }

  @Get('summary/admin')
  @Roles('OWNER', 'MANAGER')
  getAdminSummary(
    @Query('houseId') houseId: string,
    @Query('month') month: string,
  ) {
    return this.expensesService.getAdminExpenseSummaryByMember(houseId, month);
  }

  @Get(':expenseId')
  @Roles('OWNER', 'MANAGER')
  findOne(@Param('expenseId') expenseId: string) {
    return this.expensesService.findOne(expenseId);
  }

  @Put(':expenseId')
  @Roles('OWNER', 'MANAGER')
  async update(@Param('expenseId') expenseId: string, @Body() dto: Partial<CreateExpenseDto>) {
    const startedAt = performance.now();
    try {
      return await this.expensesService.updateExpense(expenseId, dto);
    } finally {
      this.logger.log(
        `PUT /expenses/${expenseId} completed in ${Math.round(performance.now() - startedAt)}ms`,
      );
    }
  }

  @Delete(':expenseId')
  @Roles('OWNER', 'MANAGER')
  async delete(@Param('expenseId') expenseId: string) {
    const startedAt = performance.now();
    try {
      return await this.expensesService.deleteExpense(expenseId);
    } finally {
      this.logger.log(
        `DELETE /expenses/${expenseId} completed in ${Math.round(performance.now() - startedAt)}ms`,
      );
    }
  }
}
