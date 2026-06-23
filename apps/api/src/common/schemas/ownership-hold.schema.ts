import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { OwnershipHoldStatus } from './common.enums';

export type OwnershipHoldDocument = HydratedDocument<OwnershipHold>;

@Schema({ timestamps: true, collection: 'ownership_holds' })
export class OwnershipHold {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Location', required: true, index: true })
  locationId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  newOwnerId: Types.ObjectId;

  @Prop({ type: Date, required: true, index: true })
  holdUntil: Date;

  @Prop({ type: [String], default: ['HIDE_LOCATION', 'BULK_DELETE_PRODUCT', 'CHANGE_CORE_INFO'] })
  blockedActions: string[];

  @Prop({ type: String, enum: OwnershipHoldStatus, default: OwnershipHoldStatus.ACTIVE, index: true })
  status: OwnershipHoldStatus;
}

export const OwnershipHoldSchema = SchemaFactory.createForClass(OwnershipHold);
OwnershipHoldSchema.index({ locationId: 1, status: 1 });
