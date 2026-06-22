import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  password_hash!: string;

  @Prop({ required: true, enum: ['user', 'admin', 'vendor'], default: 'user' })
  role!: string;

  @Prop({ type: String, default: null })
  name?: string | null;

  @Prop({ type: String, default: null })
  phone?: string | null;

  @Prop({ default: false })
  phone_verified!: boolean;

  @Prop({ type: String, default: null })
  avatar_url?: string | null;

  @Prop({
    required: true,
    enum: ['active', 'inactive', 'banned'],
    default: 'active',
  })
  status!: string;

  created_at?: Date;
  updated_at?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
