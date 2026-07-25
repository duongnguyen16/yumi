import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PendingVendorRegistrationDocument =
  HydratedDocument<PendingVendorRegistration>;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: false,
  },
})
export class PendingVendorRegistration {
  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true, unique: true })
  phone!: string;

  @Prop({ required: true })
  password_hash!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  otp_hash!: string;

  @Prop({ type: Number, default: 0 })
  attempts!: number;

  @Prop({ required: true })
  expires_at!: Date;

  created_at?: Date;
}

export const PendingVendorRegistrationSchema = SchemaFactory.createForClass(
  PendingVendorRegistration,
);

PendingVendorRegistrationSchema.index(
  { expires_at: 1 },
  { expireAfterSeconds: 0 },
);
