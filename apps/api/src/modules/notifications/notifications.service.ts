import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from 'src/common/schemas/notification.schema';
import { NotificationType } from 'src/common/schemas/common.enums';

export interface CreateNotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  refCollection?: string;
  refId?: string | Types.ObjectId;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  /**
   * Tạo 1 notification cho 1 user.
   * Các module khác inject NotificationsService và gọi method này.
   * Dùng fire-and-forget (không await ở caller) hoặc await tuỳ context.
   */
  async createNotification(
    userId: string | Types.ObjectId,
    payload: CreateNotificationPayload,
  ): Promise<void> {
    try {
      await this.notificationModel.create({
        userId: new Types.ObjectId(String(userId)),
        type: payload.type,
        title: payload.title,
        body: payload.body,
        refCollection: payload.refCollection,
        refId: payload.refId
          ? new Types.ObjectId(String(payload.refId))
          : undefined,
        isRead: false,
      });
    } catch (error) {
      // Log lỗi nhưng không throw — việc tạo notification thất bại
      // không nên làm gián đoạn flow nghiệp vụ chính
      this.logger.error(
        `Tạo notification thất bại cho user ${String(userId)}: ${String(error)}`,
      );
    }
  }

  async listNotifications(
    userId: string,
    page: number,
    limit: number,
    unreadOnly: boolean,
  ) {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (unreadOnly) {
      filter.isRead = false;
    }

    const [data, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.notificationModel.countDocuments(filter),
      this.notificationModel.countDocuments({
        userId: new Types.ObjectId(userId),
        isRead: false,
      }),
    ]);

    return { success: true, data, total, unreadCount, page, limit };
  }

  async markOneAsRead(userId: string, notificationId: string) {
    const result = await this.notificationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userId),
      },
      { isRead: true },
      { new: true },
    );
    if (!result) {
      return { success: false, message: 'Không tìm thấy thông báo' };
    }
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { isRead: true },
    );
    return { success: true };
  }

  async getUnreadCount(userId: string) {
    const count = await this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isRead: false,
    });
    return { success: true, count };
  }
}