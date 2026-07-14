import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from 'src/common/schemas/notification.schema';

export interface NotifyParams {
  userId: string;
  type: string;
  title: string;
  body: string;
  refCollection?: string;
  refId?: string;
}

export interface NotificationPort {
  notify(params: NotifyParams): Promise<void>;
}

export const NOTIFICATION_PORT = Symbol('NOTIFICATION_PORT');

/** STUB TẠM — chỉ tạo in-app notification. Email/SMS + template là việc M3/WDP-7. */
@Injectable()
export class NotificationStub implements NotificationPort {
  constructor(
    @InjectModel(Notification.name)
    private readonly model: Model<NotificationDocument>,
  ) {}

  async notify(p: NotifyParams): Promise<void> {
    // TODO: depends on WDP-7 — thay bằng M3 service thật
    await this.model.create({
      userId: p.userId,
      type: p.type,
      title: p.title,
      body: p.body,
      refCollection: p.refCollection,
      refId: p.refId,
      isRead: false,
    });
  }
}
