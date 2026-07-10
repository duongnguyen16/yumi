import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../schemas/audit-log.schema';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(params: {
    actorId: string | Types.ObjectId;
    action: string;
    targetCollection: string;
    targetId: string | Types.ObjectId;
    reason?: string;
    diff?: Record<string, any>;
  }) {
    return this.auditLogModel.create({
      actorId: this.toObjectId(params.actorId),
      action: params.action,
      targetCollection: params.targetCollection,
      targetId: this.toObjectId(params.targetId),
      reason: params.reason,
      diff: params.diff,
    });
  }

  private toObjectId(id: string | Types.ObjectId) {
    return typeof id === 'string' ? new Types.ObjectId(id) : id;
  }
}
