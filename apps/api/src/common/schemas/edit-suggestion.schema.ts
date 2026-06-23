import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { EditSuggestionStatus, RoutingTarget } from './common.enums';

export type EditSuggestionDocument = HydratedDocument<EditSuggestion>;

@Schema({ timestamps: true, collection: 'edit_suggestions' })
export class EditSuggestion {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Location', required: true, index: true })
  locationId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  fieldName: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  oldValue?: any;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  newValue: any;

  @Prop({ type: String, enum: RoutingTarget, required: true, index: true })
  routingTarget: RoutingTarget;

  @Prop({ type: String, enum: EditSuggestionStatus, default: EditSuggestionStatus.PENDING, index: true })
  status: EditSuggestionStatus;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId;

  @Prop({ type: Date })
  reviewedAt?: Date;

  @Prop({ trim: true })
  reviewReason?: string;
}

export const EditSuggestionSchema = SchemaFactory.createForClass(EditSuggestion);
EditSuggestionSchema.index({ locationId: 1, status: 1, createdAt: -1 });
