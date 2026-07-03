import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true, collection: 'notifications' })
  
export class Notification {
  @Prop({
    type: MongooseSchema.Types.
      ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true, index: true })
  type!: string;

  @Prop({ trim: true })
  refCollection?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  refId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  body!: string;

  @Prop({ default: false, index: true })
  isRead!: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
