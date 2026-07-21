import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from './user.schema';
import { Location } from './location.schema';

export type LocationRequestDocument = HydratedDocument<LocationRequest>;

export enum LocationRequestType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum LocationRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  PENDING_RE_APPROVAL = 'PENDING_RE_APPROVAL',
}

@Schema({ timestamps: true, collection: 'location_requests' })
export class LocationRequest {

  @Prop({
    type: String,
    enum: LocationRequestType,
    required: true,
    index: true,
  })
  type!: LocationRequestType;

  @Prop({
    type: String,
    enum: LocationRequestStatus,
    default: LocationRequestStatus.PENDING,
    index: true,
  })
  status!: LocationRequestStatus;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  submittedBy!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Location.name,
    required: function (this: LocationRequest) {
      return this.type !== LocationRequestType.CREATE;
    },
    default: null,
    index: true,
  })
  locationId?: Types.ObjectId | null;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    default: null,
  })
  oldData?: Record<string, unknown> | null;

  @Prop({
  type: MongooseSchema.Types.Mixed,
    required: true,
  })
  newData!: Record<string, unknown>;

  @Prop({
    type: [String],
    default: [],
  })
  imageUrls!: string[];

  @Prop({
    type: MongooseSchema.Types.Mixed,
    default: null,
  })
  pinLocation?: {
    type: 'Point';
    coordinates: [number, number];
  } | null;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    default: null,
  })
  deviceLocation?: {
    type: 'Point';
    coordinates: [number, number];
  } | null;

  @Prop({
    type: Number,
    min: 0,
    default: null,
  })
  deviceDistanceMeters?: number | null;

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  isPotentialDuplicate!: boolean;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: Location.name }],
    default: [],
  })
  suspectedDuplicateLocationIds!: Types.ObjectId[];

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    default: null,
    index: true,
  })
  reviewerId?: Types.ObjectId | null;

  @Prop({
    type: Date,
    default: null,
  })
  reviewedAt?: Date | null;

  @Prop({
    type: String,
    trim: true,
    default: null,
  })
  reviewNote?: string | null;

  @Prop({ type: Object })
  verificationProof?: {
    proofUrls?: string[];
    licenseUrls?: string[];
    systemCode?: string;
    capturedAt?: Date;
  };
}

export const LocationRequestSchema =
  SchemaFactory.createForClass(LocationRequest);

LocationRequestSchema.index({
  submittedBy: 1,
  status: 1,
  createdAt: -1,
});

LocationRequestSchema.index({
  locationId: 1,
  status: 1,
});

LocationRequestSchema.index({
  status: 1,
  createdAt: -1,
});

LocationRequestSchema.index(
  {
    locationId: 1,
    type: 1,
    status: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      type: LocationRequestType.UPDATE,
      status: {
        $in: [
          LocationRequestStatus.PENDING,
          LocationRequestStatus.PENDING_RE_APPROVAL,
        ],
      },
    },
    name: 'uniq_pending_update_request_per_location',
  },
);
