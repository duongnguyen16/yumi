import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { ReviewStatus } from './common.enums';
import { ImageAsset, ImageAssetSchema } from './common.embedded';

@Schema({ _id: false, timestamps: true })
export class ReviewReply {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  vendorId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  content!: string;

  @Prop({ type: Date, default: Date.now })
  createdAt?: Date;
}
export const ReviewReplySchema = SchemaFactory.createForClass(ReviewReply);

export type ReviewDocument = HydratedDocument<Review>;

@Schema({ timestamps: true, collection: 'reviews' })
export class Review {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Location',
    required: true,
    index: true,
  })
  locationId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  rating!: number;

  @Prop({ required: true, trim: true })
  comment!: string;

  @Prop({ type: [ImageAssetSchema], default: [] })
  images!: ImageAsset[];

  @Prop({
    type: String,
    enum: ReviewStatus,
    default: ReviewStatus.PUBLISHED,
    index: true,
  })
  status!: ReviewStatus;

  // 1 reply / review, so embed instead of separate collection
  @Prop({ type: ReviewReplySchema })
  reply?: ReviewReply;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
ReviewSchema.index({ locationId: 1, userId: 1 }, { unique: true });
ReviewSchema.index({ locationId: 1, status: 1, createdAt: -1 });
