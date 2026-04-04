import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EvnService } from './evn.service';
import { EvnController } from './evn.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EncryptionService } from '../../common/services/encryption.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    PrismaModule,
  ],
  controllers: [EvnController],
  providers: [EvnService, EncryptionService],
  exports: [EvnService],
})
export class EvnModule {}
