import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type RequestAccessVerificationSessionDocument =
  HydratedDocument<RequestAccessVerificationSession>;

export type RequestAccessVerificationPurpose = 'CREATE' | 'TAKEOVER';

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false } })
export class RequestAccessVerificationSession {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Location', required: true })
  locationId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'RequestAccess' })
  requestAccessId?: Types.ObjectId;

  @Prop({ type: String, enum: ['CREATE', 'TAKEOVER'], required: true })
  purpose!: RequestAccessVerificationPurpose;

  @Prop({ required: true })
  otpRequired!: boolean;

  @Prop({ type: String, default: null })
  otpHash?: string | null;

  @Prop({ default: false })
  otpVerified!: boolean;

  @Prop({ default: 0, min: 0 })
  attempts!: number;

  @Prop({ required: true })
  expiresAt!: Date;
}

export const RequestAccessVerificationSessionSchema =
  SchemaFactory.createForClass(RequestAccessVerificationSession);

RequestAccessVerificationSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RequestAccessVerificationSessionSchema.index({
  userId: 1,
  locationId: 1,
  purpose: 1,
});
