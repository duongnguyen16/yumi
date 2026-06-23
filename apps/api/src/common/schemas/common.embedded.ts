import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ _id: false })
export class GeoPoint {
  @Prop({ type: String, enum: ['Point'], default: 'Point' })
  type: 'Point';

  // GeoJSON order: [longitude, latitude]
  @Prop({ type: [Number], required: true })
  coordinates: [number, number];
}
export const GeoPointSchema = SchemaFactory.createForClass(GeoPoint);

@Schema({ _id: false })
export class ImageAsset {
  @Prop({ required: true, trim: true })
  url: string;

  @Prop({ default: false })
  isCover: boolean;

  @Prop({ type: Date, default: Date.now })
  uploadedAt: Date;
}
export const ImageAssetSchema = SchemaFactory.createForClass(ImageAsset);

@Schema({ _id: false })
export class EvidenceFile {
  @Prop({ required: true, trim: true })
  url: string;

  @Prop({ enum: ['IMAGE', 'VIDEO', 'DOCUMENT'], required: true })
  fileType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';

  @Prop({ type: GeoPointSchema })
  geo?: GeoPoint;

  @Prop({ type: Number, min: 0 })
  accuracyMeters?: number;

  @Prop({ type: Date })
  capturedAt?: Date;

  @Prop({ type: MongooseSchema.Types.Mixed })
  metadata?: Record<string, any>;
}
export const EvidenceFileSchema = SchemaFactory.createForClass(EvidenceFile);

@Schema({ _id: false })
export class AdminDecision {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  decidedBy?: Types.ObjectId;

  @Prop({ trim: true })
  reason?: string;

  @Prop({ type: Date })
  decidedAt?: Date;
}
export const AdminDecisionSchema = SchemaFactory.createForClass(AdminDecision);
