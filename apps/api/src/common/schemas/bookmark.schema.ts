import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type BookmarkDocument = HydratedDocument<Bookmark>;

@Schema({ timestamps: true, collection: 'bookmarks' })
export class Bookmark {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Location',
    required: true,
    index: true,
  })
  locationId!: Types.ObjectId;
}

export const BookmarkSchema = SchemaFactory.createForClass(Bookmark);
BookmarkSchema.index({ userId: 1, locationId: 1 }, { unique: true });
