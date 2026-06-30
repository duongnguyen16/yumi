import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type LocationViewDocument = HydratedDocument<LocationView>;

@Schema({ timestamps: true, collection: 'location_views' })
export class LocationView {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Location',
    required: true,
  })
  locationId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
  })
  viewDate!: string;

  @Prop({
    type: Date,
    default: Date.now,
  })
  viewedAt!: Date;
}

export const LocationViewSchema = SchemaFactory.createForClass(LocationView);

LocationViewSchema.index(
  {
    locationId: 1,
    userId: 1,
    viewDate: 1,
  },
  {
    unique: true,
    name: 'uniq_location_user_view_date',
  },
);

LocationViewSchema.index(
  {
    locationId: 1,
    viewedAt: -1,
  },
  {
    name: 'idx_location_viewed_at',
  },
);
