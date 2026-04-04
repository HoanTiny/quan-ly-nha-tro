import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillsModule } from './modules/bills/bills.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DemoModule } from './modules/demo/demo.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { HousesModule } from './modules/houses/houses.module';
import { MembersModule } from './modules/members/members.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { SettlementsModule } from './modules/settlements/settlements.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { EvnModule } from './modules/evn/evn.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    DemoModule,
    HousesModule,
    RoomsModule,
    MembersModule,
    BillsModule,
    ExpensesModule,
    SettlementsModule,
    PaymentsModule,
    NotificationsModule,
    DashboardModule,
    UploadsModule,
    EvnModule,
  ],
  providers: [JwtAuthGuard, RolesGuard],
})
export class AppModule {}
