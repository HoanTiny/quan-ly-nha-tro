import { Module } from '@nestjs/common';
import { ExpensesModule } from '../expenses/expenses.module';
import { SettlementsModule } from '../settlements/settlements.module';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';

@Module({
  imports: [ExpensesModule, SettlementsModule],
  controllers: [DemoController],
  providers: [DemoService],
})
export class DemoModule {}
