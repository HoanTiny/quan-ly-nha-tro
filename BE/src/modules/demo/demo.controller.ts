import { Controller, Get, Post } from '@nestjs/common';
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
}
