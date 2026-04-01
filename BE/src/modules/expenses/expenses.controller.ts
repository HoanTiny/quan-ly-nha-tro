import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
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
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @Roles('OWNER', 'MANAGER')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto) {
    return this.expensesService.createExpense(user.sub, dto);
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
  update(@Param('expenseId') expenseId: string, @Body() dto: Partial<CreateExpenseDto>) {
    return this.expensesService.updateExpense(expenseId, dto);
  }

  @Delete(':expenseId')
  @Roles('OWNER', 'MANAGER')
  delete(@Param('expenseId') expenseId: string) {
    return this.expensesService.deleteExpense(expenseId);
  }
}
