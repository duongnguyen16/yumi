import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from './user.schema';
import { Location } from './location.schema';

export type LocationRequestDocument = HydratedDocument<LocationRequest>;

export enum LocationRequestType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  RE_APPROVAL = 'RE_APPROVAL',
  DELETE = 'DELETE',
}

export enum LocationRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true, collection: 'location_requests' })
export class LocationRequest {
  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  submittedBy!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: Location.name,
    required: true,
    index: true,
  })
  locationId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: LocationRequestType,
    required: true,
    default: LocationRequestType.CREATE,
    index: true,
  })
  requestType!: LocationRequestType;

  @Prop({
    type: Types.ObjectId,
    ref: User.name,
    default: null,
    index: true,
  })
  reviewerId?: Types.ObjectId | null;

  @Prop({
    type: String,
    trim: true,
    default: null,
  })
  rejectReason?: string | null;

  @Prop({
    type: String,
    enum: LocationRequestStatus,
    default: LocationRequestStatus.PENDING,
    index: true,
  })
  status!: LocationRequestStatus;

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  isPotentialDuplicate!: boolean;

  @Prop({
    type: Number,
    min: 0,
    default: null,
  })
  deviceDistanceMeters?: number | null;
}

export const LocationRequestSchema =
  SchemaFactory.createForClass(LocationRequest);

LocationRequestSchema.index({
  submittedBy: 1,
  status: 1,
});

LocationRequestSchema.index({
  locationId: 1,
  status: 1,
});
