import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TrustLevel, UserRole, UserStatus } from './common.enums';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.CUSTOMER,
    index: true,
  })
  role!: UserRole;

  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ trim: true, index: true })
  phone?: string;

  @Prop({ default: false })
  phoneVerified!: boolean;

  @Prop({ trim: true })
  avatarUrl?: string;

  @Prop({
    type: String,
    enum: UserStatus,
    default: UserStatus.ACTIVE,
    index: true,
  })
  status!: UserStatus;

  @Prop({ type: Number, default: 0 })
  trustScore!: number;

  @Prop({
    type: String,
    enum: TrustLevel,
    default: TrustLevel.NEW,
    index: true,
  })
  trustLevel!: TrustLevel;

  @Prop({ type: Date })
  lastLoginAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
