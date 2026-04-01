import { Controller, Get, Post, Query } from '@nestjs/common';
import { DemoService } from './demo.service';

@Controller('demo')
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Post('bootstrap')
  bootstrap() {
    return this.demoService.bootstrap();
  }

  @Get('context')
  context() {
    return this.demoService.getContext();
  }

  @Post('reset-expenses')
  resetExpenses(@Query('houseId') houseId?: string) {
    return this.demoService.resetExpenses(houseId);
  }
}
