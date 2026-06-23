import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { AppealStatus, AppealType } from './common.enums';
import { AdminDecision, AdminDecisionSchema, EvidenceFile, EvidenceFileSchema } from './common.embedded';

export type AppealDocument = HydratedDocument<Appeal>;

@Schema({ timestamps: true, collection: 'appeals' })
export class Appeal {
  @Prop({ type: String, enum: AppealType, required: true, index: true })
  type: AppealType;

  @Prop({ required: true, trim: true })
  targetCollection: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  targetId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  appellantId: Types.ObjectId;

  @Prop({ type: [EvidenceFileSchema], default: [] })
  additionalEvidenceFiles: EvidenceFile[];

  @Prop({ type: String, enum: AppealStatus, default: AppealStatus.PENDING, index: true })
  status: AppealStatus;

  @Prop({ trim: true })
  originalDecisionReason?: string;

  @Prop({ type: Date, required: true, index: true })
  appealDeadline: Date;

  @Prop({ type: AdminDecisionSchema })
  adminDecision?: AdminDecision;
}

export const AppealSchema = SchemaFactory.createForClass(Appeal);
AppealSchema.index({ targetCollection: 1, targetId: 1 }, { unique: true });
