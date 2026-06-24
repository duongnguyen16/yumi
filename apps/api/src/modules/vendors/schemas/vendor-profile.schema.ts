import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type VendorProfileDocument = HydratedDocument<VendorProfile>;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class VendorProfile {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true })
  user_id!: Types.ObjectId;

  @Prop({ required: true })
  business_name!: string;

  @Prop({ required: true })
  business_phone!: string;

  @Prop({ default: null })
  business_address?: string | null;

  @Prop({
    required: true,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  verification_status!: string;

  @Prop({ default: null })
  id_card_image_url?: string | null;

  @Prop({ default: null })
  rejection_reason?: string | null;

  created_at?: Date;
  updated_at?: Date;
}

export const VendorProfileSchema = SchemaFactory.createForClass(VendorProfile);