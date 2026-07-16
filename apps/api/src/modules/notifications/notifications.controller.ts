import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard('jwt-at'))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(
    @Request() req: any,
    @Query() query: ListNotificationsDto,
  ) {
    const userId = this.extractUserId(req);
    return this.notificationsService.listNotifications(
      userId,
      query.page ?? 1,
      query.limit ?? 20,
      query.unreadOnly ?? false,
    );
  }

  @Get('unread-count')
  async unreadCount(@Request() req: any) {
    const userId = this.extractUserId(req);
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch(':id/read')
  async markOneRead(@Request() req: any, @Param('id') id: string) {
    const userId = this.extractUserId(req);
    return this.notificationsService.markOneAsRead(userId, id);
  }

  @Patch('read-all')
  async markAllRead(@Request() req: any) {
    const userId = this.extractUserId(req);
    return this.notificationsService.markAllAsRead(userId);
  }

  private extractUserId(req: any): string {
    const userId = (req as { user?: { userId?: string } }).user?.userId;
    if (!userId) throw new UnauthorizedException('Không tìm thấy người dùng');
    return userId;
  }
}