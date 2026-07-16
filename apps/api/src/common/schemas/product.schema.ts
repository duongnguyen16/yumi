import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true, collection: 'products' })
export class Product {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Location',
    required: true,
    index: true,
  })
  locationId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  imageUrl?: string;

  @Prop({ trim: true })
  imagePath?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Number, min: 0 })
  price?: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ locationId: 1, name: 1 });
