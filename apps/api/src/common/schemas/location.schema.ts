import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { LocationSource, LocationStatus } from './common.enums';
import {
  GeoPoint,
  GeoPointSchema,
  ImageAsset,
  ImageAssetSchema,
} from './common.embedded';

export type LocationDocument = HydratedDocument<Location>;

@Schema({ timestamps: true, collection: 'locations' })
export class Location {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  submittedBy!: Types.ObjectId;

  // null/undefined = community-owned/no-owner
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  ownerId?: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 100,
    index: true,
  })
  name!: string;

  @Prop({ required: true, trim: true, minlength: 10 })
  description!: string;

  @Prop({ required: true, trim: true })
  address!: string;

  @Prop({ type: GeoPointSchema, required: true })
  geo!: GeoPoint;

  @Prop({ type: Number, min: 0 })
  accuracyMeters?: number;

  @Prop({ type: String, trim: true })
  openingHours?: string;

  @Prop({ type: String, trim: true })
  phone?: string;

  @Prop({
    type: String,
    enum: LocationStatus,
    default: LocationStatus.SUBMITTED,
    index: true,
  })
  status!: LocationStatus;

  @Prop({ default: false, index: true })
  isDuplicate!: boolean;

  @Prop({ default: false, index: true })
  isSuspectedDuplicate!: boolean;

  @Prop({ type: Number, default: 0, min: 0 })
  viewCount!: number;

  @Prop({ type: String, enum: LocationSource, required: true, index: true })
  source!: LocationSource;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true,
  })
  categoryId!: Types.ObjectId;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'SubCategory' }],
    default: [],
    index: true,
  })
  subCategoryIds!: Types.ObjectId[];

  @Prop({ type: [ImageAssetSchema], default: [] })
  imagesUrls!: ImageAsset[];

  @Prop({ type: Date })
  submittedAt?: Date;

  @Prop({ type: Date })
  holdExpiresAt?: Date;
}

export const LocationSchema = SchemaFactory.createForClass(Location);
LocationSchema.index({ geo: '2dsphere' });
LocationSchema.index({ name: 'text', description: 'text', address: 'text' });
LocationSchema.index({ status: 1, categoryId: 1 });
LocationSchema.index({ ownerId: 1, status: 1 });
