import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { DisputeStatus } from './common.enums';
import {
  EvidenceFile,
  EvidenceFileSchema,
  AdminDecision,
  AdminDecisionSchema,
} from './common.embedded';

export type DisputeDocument = HydratedDocument<Dispute>;

@Schema({ timestamps: true, collection: 'disputes' })
export class Dispute {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'RequestAccess',
  })
  requestAccessId?: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Appeal',
  })
  appealId?: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Location',
    required: true,
    index: true,
  })
  locationId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  vendorAId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  vendorBId!: Types.ObjectId;

  @Prop({ type: [EvidenceFileSchema], default: [] })
  evidenceA!: EvidenceFile[];

  @Prop({ type: [EvidenceFileSchema], default: [] })
  evidenceB!: EvidenceFile[];

  @Prop({
    type: String,
    enum: DisputeStatus,
    default: DisputeStatus.OPEN,
    index: true,
  })
  status!: DisputeStatus;

  @Prop({ type: AdminDecisionSchema })
  adminDecision?: AdminDecision;
}

export const DisputeSchema = SchemaFactory.createForClass(Dispute);
DisputeSchema.index({ locationId: 1, status: 1 });
DisputeSchema.index(
  { requestAccessId: 1 },
  {
    unique: true,
    partialFilterExpression: { requestAccessId: { $exists: true } },
  },
);
