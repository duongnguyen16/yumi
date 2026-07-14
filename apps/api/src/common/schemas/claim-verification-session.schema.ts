import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type ClaimVerificationSessionDocument =
  HydratedDocument<ClaimVerificationSession>;

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false } })
export class ClaimVerificationSession {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  vendorId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Location', required: true })
  locationId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  siteCode!: string;

  @Prop({ type: String, default: null })
  otpHash?: string | null;

  @Prop({ required: true })
  otpRequired!: boolean;

  @Prop({ default: false })
  otpVerified!: boolean;

  @Prop({ default: 0, min: 0 })
  attempts!: number;

  @Prop({ required: true })
  expiresAt!: Date;
}

export const ClaimVerificationSessionSchema =
  SchemaFactory.createForClass(ClaimVerificationSession);

ClaimVerificationSessionSchema.index(
  { vendorId: 1, locationId: 1 },
  { unique: true },
);
ClaimVerificationSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
