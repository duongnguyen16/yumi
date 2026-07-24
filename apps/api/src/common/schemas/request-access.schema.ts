import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { RequestAccessStatus } from './common.enums';
import { EvidenceFile, EvidenceFileSchema } from './common.embedded';

export type RequestAccessDocument = HydratedDocument<RequestAccess>;

@Schema({ timestamps: true, collection: 'request_accesses' })
export class RequestAccess {
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
  requesterId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  currentOwnerId!: Types.ObjectId;

  @Prop({ type: [EvidenceFileSchema], default: [] })
  evidenceFiles!: EvidenceFile[];

  @Prop({ default: false })
  otpVerified!: boolean;

  @Prop({
    type: String,
    enum: RequestAccessStatus,
    default: RequestAccessStatus.PENDING,
    index: true,
  })
  status!: RequestAccessStatus;

  @Prop({ type: Date, required: true, index: true })
  timeoutAt!: Date;

  @Prop({ trim: true })
  requestReason?: string;

  @Prop({ trim: true })
  responseReason?: string;

  @Prop({ type: Date })
  respondedAt?: Date;
}

export const RequestAccessSchema = SchemaFactory.createForClass(RequestAccess);
RequestAccessSchema.index(
  { locationId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: RequestAccessStatus.PENDING },
  },
);
