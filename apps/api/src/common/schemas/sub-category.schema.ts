import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type SubCategoryDocument = HydratedDocument<SubCategory>;

@Schema({ timestamps: true, collection: 'sub_categories' })
export class SubCategory {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true,
  })
  categoryId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ default: true, index: true })
  isActive!: boolean;
}

export const SubCategorySchema = SchemaFactory.createForClass(SubCategory);
SubCategorySchema.index({ categoryId: 1, name: 1 }, { unique: true });
