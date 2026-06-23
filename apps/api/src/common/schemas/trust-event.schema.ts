import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { TrustEventType } from './common.enums';

export type TrustEventDocument = HydratedDocument<TrustEvent>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'trust_events',
})
export class TrustEvent {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: TrustEventType, required: true, index: true })
  type!: TrustEventType;

  @Prop({ type: Number, required: true })
  pointChange!: number;

  @Prop({ trim: true })
  reason?: string;

  @Prop({ trim: true })
  refCollection?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  refId?: Types.ObjectId;
}

export const TrustEventSchema = SchemaFactory.createForClass(TrustEvent);
TrustEventSchema.index({ userId: 1, createdAt: -1 });
