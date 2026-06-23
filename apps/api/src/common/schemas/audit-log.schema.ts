import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  actorId: Types.ObjectId;

  @Prop({ required: true, trim: true, index: true })
  action: string;

  @Prop({ required: true, trim: true, index: true })
  targetCollection: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  targetId: Types.ObjectId;

  @Prop({ trim: true })
  reason?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  diff?: Record<string, any>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ targetCollection: 1, targetId: 1, createdAt: -1 });
