import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.notificationsService.listByUser(user.sub);
  }

  @Patch(':notificationId/read')
  markRead(@Param('notificationId') notificationId: string, @CurrentUser() user: AuthUser) {
    return this.notificationsService.markRead(notificationId, user.sub);
  }
}
