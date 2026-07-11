import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PasswordResetCodeDocument = HydratedDocument<PasswordResetCode>;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class PasswordResetCode {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  user_id!: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ required: true })
  code_digest!: string;

  @Prop({ required: true })
  expires_at!: Date;

  @Prop({ required: true, default: 0 })
  attempts!: number;

  @Prop({ type: Date, default: null })
  consumed_at?: Date | null;

  created_at!: Date;
  updated_at!: Date;
}

export const PasswordResetCodeSchema =
  SchemaFactory.createForClass(PasswordResetCode);

PasswordResetCodeSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
PasswordResetCodeSchema.index({ email: 1, created_at: -1 });
