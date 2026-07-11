import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import {
  ReportReason,
  ReportRoute,
  ReportStatus,
  ReportTargetType,
} from './common.enums';
import { EvidenceFile, EvidenceFileSchema } from './common.embedded';

export type ReportDocument = HydratedDocument<Report>;

@Schema({ timestamps: true, collection: 'reports' })
export class Report {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  reporterId!: Types.ObjectId;

  @Prop({ type: String, enum: ReportTargetType, required: true, index: true })
  targetType!: ReportTargetType;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  targetId!: Types.ObjectId;

  @Prop({ type: String, enum: ReportReason, required: true, index: true })
  reason!: ReportReason;

  @Prop({ type: [EvidenceFileSchema], default: [] })
  evidenceFiles!: EvidenceFile[];

  @Prop({ trim: true })
  description?: string;

  @Prop({
    type: String,
    enum: ReportRoute,
    default: ReportRoute.STANDARD_REVIEW,
    index: true,
  })
  route!: ReportRoute;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', index: true })
  affectedVendorId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: ReportStatus,
    default: ReportStatus.PENDING,
    index: true,
  })
  status!: ReportStatus;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  handledBy?: Types.ObjectId;

  @Prop({ trim: true })
  resultReason?: string;

  @Prop({ type: Date })
  resolvedAt?: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
ReportSchema.index(
  { targetType: 1, targetId: 1, reason: 1 },
  {
    unique: true,
    partialFilterExpression: { status: ReportStatus.PENDING },
    name: 'one_pending_report_per_target_and_reason',
  },
);
