import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { ClaimRequestStatus, ClaimRequestType } from './common.enums';
import {
  AdminDecision,
  AdminDecisionSchema,
  EvidenceFile,
  EvidenceFileSchema,
} from './common.embedded';

export type ClaimRequestDocument = HydratedDocument<ClaimRequest>;

@Schema({ timestamps: true, collection: 'claim_requests' })
export class ClaimRequest {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  vendorId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Location',
    required: true,
    index: true,
  })
  locationId!: Types.ObjectId;

  @Prop({ type: String, enum: ClaimRequestType, required: true })
  type!: ClaimRequestType;

  @Prop({ type: [EvidenceFileSchema], default: [] })
  evidenceFiles!: EvidenceFile[];

  @Prop({ trim: true })
  licenseUrl?: string;

  @Prop({ default: false, index: true })
  otpVerified!: boolean;

  @Prop({ type: Date })
  otpVerifiedAt?: Date;

  @Prop({
    type: String,
    enum: ClaimRequestStatus,
    default: ClaimRequestStatus.PENDING,
    index: true,
  })
  status!: ClaimRequestStatus;

  @Prop({ type: AdminDecisionSchema })
  adminDecision?: AdminDecision;
}

export const ClaimRequestSchema = SchemaFactory.createForClass(ClaimRequest);
ClaimRequestSchema.index(
  { locationId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: ClaimRequestStatus.PENDING },
  },
);
