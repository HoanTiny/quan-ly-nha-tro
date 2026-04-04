import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EvnService } from './evn.service';
import { EvnController } from './evn.controller';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [EvnController],
  providers: [EvnService],
  exports: [EvnService],
})
export class EvnModule {}
