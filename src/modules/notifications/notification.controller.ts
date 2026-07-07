import { Controller, Get, Post, Body, Request, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { MarkAsReadDto } from './dto/mark-as-read.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getUserNotifications(
    @Request() req,
    @Query() query: QueryNotificationDto,
  ) {
    const userId = req.user.id;
    return await this.notificationService.getUserNotifications(userId, query);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const userId = req.user.id;
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Post('mark-as-read')
  async markAsRead(@Request() req, @Body() markAsReadDto: MarkAsReadDto) {
    const userId = req.user.id;
    const { notificationId } = markAsReadDto;

    const success = await this.notificationService.markAsRead(
      notificationId,
      userId,
    );
    return { success };
  }

  @Post('mark-as-unread')
  async markAsUnread(@Request() req, @Body() markAsReadDto: MarkAsReadDto) {
    const userId = req.user.id;
    const { notificationId } = markAsReadDto;

    const success = await this.notificationService.markAsUnread(
      notificationId,
      userId,
    );
    return { success };
  }

  @Post('mark-all-as-read')
  async markAllAsRead(@Request() req) {
    const userId = req.user.id;
    const count = await this.notificationService.markAllAsRead(userId);
    return { count, message: `Marked ${count} notifications as read` };
  }

  @Post('cleanup-old')
  async cleanupOldNotifications(@Request() req) {
    const userId = req.user.id;
    await this.notificationService.cleanupOldNotifications(userId);
    return { message: 'Old notifications cleaned up successfully' };
  }

  @Post('cleanup-all-old')
  async cleanupAllOldNotifications() {
    const totalCleaned =
      await this.notificationService.cleanupAllOldNotifications();
    return {
      message: `Cleanup completed successfully`,
      totalCleaned,
      details: `Removed ${totalCleaned} old notifications across all users`,
    };
  }
}
