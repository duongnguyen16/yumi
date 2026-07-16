import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from './user.schema';
import { Location } from './location.schema';

export type OtpDocument = HydratedDocument<Otp>;

export enum OtpPurpose {
  CHANGE_PHONE = 'CHANGE_PHONE',
  CLAIM_LOCATION = 'CLAIM_LOCATION',
  REQUEST_ACCESS = 'REQUEST_ACCESS',
  RESET_PASSWORD = 'RESET_PASSWORD',
  VERIFY_PHONE = 'VERIFY_PHONE',
  VERIFY_EMAIL = 'VERIFY_EMAIL',
  VERIFY_LOCATION = 'VERIFY_LOCATION',
}

export enum OtpChannel {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  SYSTEM = 'SYSTEM',
}

export enum OtpStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  LOCKED = 'LOCKED',
}

@Schema({ timestamps: true, collection: 'otps' })
export class Otp {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: false,
    index: true,
  })
  userId?: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Location.name,
    required: false,
    index: true,
  })
  locationId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: OtpPurpose,
    required: true,
    index: true,
  })
  purpose!: OtpPurpose;

  @Prop({
    type: String,
    enum: OtpChannel,
    default: OtpChannel.SMS,
    required: true,
  })
  channel!: OtpChannel;

  // SĐT hoặc email nhận OTP
  @Prop({
    type: String,
    required: true,
    trim: true,
    index: true,
  })
  recipient!: string;

  // Không nên lưu OTP plain text, chỉ lưu hash
  @Prop({
    type: String,
    required: true,
  })
  otpHash!: string;

  @Prop({
    type: String,
    enum: OtpStatus,
    default: OtpStatus.PENDING,
    index: true,
  })
  status!: OtpStatus;

  @Prop({
    type: Date,
  })
  expiresAt?: Date;

  @Prop({
    type: Date,
    required: false,
  })
  verifiedAt?: Date;

  // Lưu thêm metadata nếu cần: ip, deviceId, userAgent...
  @Prop({
    type: Object,
    default: {},
  })
  metadata?: Record<string, unknown>;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

OtpSchema.index({
  recipient: 1,
  purpose: 1,
  status: 1,
  createdAt: -1,
});

OtpSchema.index({
  userId: 1,
  purpose: 1,
  status: 1,
});

OtpSchema.index({
  locationId: 1,
  purpose: 1,
  status: 1,
});
