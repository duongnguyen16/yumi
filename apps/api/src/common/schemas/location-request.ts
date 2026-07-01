import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from './user.schema';
import { Location } from './location.schema';

export type LocationRequestDocument = HydratedDocument<LocationRequest>;

export enum LocationRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true, collection: 'location_requests' })
export class LocationRequest {
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
    required: true,
    index: true,
  })
  locationId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: LocationRequestStatus,
    default: LocationRequestStatus.PENDING,
    index: true,
  })
  status!: LocationRequestStatus;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    required: true,
  })
  submittedDataSnapshot!: Record<string, any>;
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
  rejectReason?: string | null;
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
