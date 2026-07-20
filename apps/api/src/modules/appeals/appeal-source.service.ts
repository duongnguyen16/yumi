import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from 'src/common/schemas/audit-log.schema';
import {
  ClaimRequest,
  ClaimRequestDocument,
} from 'src/common/schemas/claim-request.schema';
import {
  AppealType,
  ClaimRequestStatus,
  DisputeStatus,
  LocationStatus,
  RequestAccessStatus,
  ReviewStatus,
  UserStatus,
} from 'src/common/schemas/common.enums';
import { Dispute, DisputeDocument } from 'src/common/schemas/dispute.schema';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import {
  LocationRequest,
  LocationRequestDocument,
  LocationRequestStatus,
} from 'src/common/schemas/location-request';
import {
  RequestAccess,
  RequestAccessDocument,
} from 'src/common/schemas/request-access.schema';
import { Review, ReviewDocument } from 'src/common/schemas/review.schema';
import { User, UserDocument } from 'src/common/schemas/user.schema';

export type AppealSourceResult =
  | {
      success: true;
      targetCollection: string;
      affectedUserId: string;
      decidedAt: Date;
      deciderId?: string;
      reason?: string;
    }
  | { success: false; statusCode: number; message: string };

@Injectable()
export class AppealSourceService {
  constructor(
    @InjectModel(RequestAccess.name)
    private readonly accessModel: Model<RequestAccessDocument>,
    @InjectModel(LocationRequest.name)
    private readonly reqModel: Model<LocationRequestDocument>,
    @InjectModel(ClaimRequest.name)
    private readonly claimModel: Model<ClaimRequestDocument>,
    @InjectModel(Dispute.name)
    private readonly disputeModel: Model<DisputeDocument>,
    @InjectModel(Location.name)
    private readonly locModel: Model<LocationDocument>,
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(AuditLog.name)
    private readonly logModel: Model<AuditLogDocument>,
  ) {}

  async load(type: AppealType, id: Types.ObjectId): Promise<AppealSourceResult> {
    // load dữ liệu gốc của kháng cáo
    if (type === AppealType.REQUEST_ACCESS_REJECTED) return this.access(id);
    if (type === AppealType.LOCATION_REJECTED) return this.locationRequest(id);
    if (type === AppealType.CLAIM_REJECTED) return this.claim(id);
    if (type === AppealType.DUPLICATE_HIDDEN) return this.duplicate(id);
    if (type === AppealType.OWNERSHIP_REVOKED) return this.ownership(id);
    if (type === AppealType.REVIEW_REMOVED) return this.review(id);
    if (type === AppealType.USER_BANNED || type === AppealType.USER_WARNED) {
      return this.user(id, type);
    }
    return this.fail(400, 'Loại kháng cáo không hợp lệ');
  }

  private async access(id: Types.ObjectId): Promise<AppealSourceResult> {
    const item = await this.accessModel.findById(id).lean().exec();
    if (!item) return this.fail(404, 'Không tìm thấy RequestAccess');
    if (item.status !== RequestAccessStatus.REJECTED || !item.respondedAt) {
    return this.fail(409, 'RequestAccess không thể kháng cáo');
    }
    return this.ok(
      'request_accesses',
      item.requesterId,
      item.respondedAt,
      undefined,
      item.responseReason,
    );
  }

  private async locationRequest(id: Types.ObjectId): Promise<AppealSourceResult> {
    const item = await this.reqModel.findById(id).lean().exec();
    if (!item) return this.fail(404, 'Không tìm thấy yêu cầu địa điểm');
    if (item.status !== LocationRequestStatus.REJECTED || !item.reviewedAt) {
      return this.fail(409, 'Yêu cầu địa điểm không thể kháng cáo');
    }
    return this.ok(
      'location_requests',
      item.submittedBy,
      item.reviewedAt,
      item.reviewerId ?? undefined,
      item.reviewNote ?? undefined,
    );
  }

  private async claim(id: Types.ObjectId): Promise<AppealSourceResult> {
    const item = await this.claimModel.findById(id).lean().exec();
    if (!item) return this.fail(404, 'Không tìm thấy claim');
    const decision = item.adminDecision;
    if (item.status !== ClaimRequestStatus.REJECTED || !decision?.decidedAt) {
      return this.fail(409, 'Claim không thể kháng cáo');
    }
    return this.ok(
      'claim_requests',
      item.vendorId,
      decision.decidedAt,
      decision.decidedBy,
      decision.reason,
    );
  }

  private async duplicate(id: Types.ObjectId): Promise<AppealSourceResult> {
    const item = await this.locModel.findById(id).lean().exec();
    if (!item) return this.fail(404, 'Không tìm thấy địa điểm');
    if (item.status !== LocationStatus.HIDDEN || !item.isDuplicate) {
      return this.fail(409, 'Địa điểm không thể kháng cáo trùng lặp');
    }
    const log = await this.audit('locations', id, 'LOCATION_HIDE_DUPLICATE');
    if (!log) return this.fail(404, 'Không tìm thấy quyết định gốc');
    return this.ok(
      'locations',
      item.ownerId ?? item.submittedBy,
      this.createdAt(log),
      log.actorId,
      log.reason,
    );
  }

  private async ownership(id: Types.ObjectId): Promise<AppealSourceResult> {
    const item = await this.disputeModel.findById(id).lean().exec();
    if (!item) return this.fail(404, 'Không tìm thấy tranh chấp');
    const decision = item.adminDecision;
    if (item.status !== DisputeStatus.RESOLVED_REVOKE || !decision?.decidedAt) {
      return this.fail(409, 'Quyết định sở hữu không thể kháng cáo');
    }
    const log = await this.audit('disputes', id, 'DISPUTE_REVOKE');
    const oldOwner = log?.diff?.ownerId as { from?: string } | undefined;
    if (!oldOwner?.from) return this.fail(404, 'Không tìm thấy chủ cũ');
    return this.ok(
      'disputes',
      oldOwner.from,
      decision.decidedAt,
      decision.decidedBy,
      decision.reason,
    );
  }

  private async review(id: Types.ObjectId): Promise<AppealSourceResult> {
    const item = await this.reviewModel.findById(id).lean().exec();
    if (!item) return this.fail(404, 'Không tìm thấy đánh giá');
    if (item.status !== ReviewStatus.REMOVED_BY_ADMIN) {
      return this.fail(409, 'Đánh giá không thể kháng cáo');
    }
    const log = await this.audit('reviews', id, 'REVIEW_REMOVED_BY_ADMIN');
    if (!log) return this.fail(404, 'Không tìm thấy quyết định gốc');
    return this.ok(
      'reviews',
      item.userId,
      this.createdAt(log),
      log.actorId,
      log.reason,
    );
  }

  private async user(
    id: Types.ObjectId,
    type: AppealType.USER_BANNED | AppealType.USER_WARNED,
  ): Promise<AppealSourceResult> {
    const item = await this.userModel.findById(id).lean().exec();
    if (!item) return this.fail(404, 'Không tìm thấy người dùng');
    const status =
      type === AppealType.USER_BANNED ? UserStatus.BANNED : UserStatus.WARNED;
    if (item.status !== status) {
      return this.fail(409, 'Tài khoản không thể kháng cáo');
    }
    const log = await this.audit('users', id, `update_user_status:${status}`);
    const decidedAt = log ? this.createdAt(log) : item.updatedAt;
    if (!decidedAt) return this.fail(404, 'Không tìm thấy quyết định gốc');
    return this.ok(
      'users',
      id,
      decidedAt,
      log?.actorId,
      log?.reason,
    );
  }

  private audit(collection: string, id: Types.ObjectId, action: string) {
    return this.logModel
      .findOne({ targetCollection: collection, targetId: id, action })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  private createdAt(log: AuditLogDocument | Record<string, unknown>) {
    return new Date((log as { createdAt: Date }).createdAt);
  }

  private ok(
    targetCollection: string,
    affectedUserId: Types.ObjectId | string,
    decidedAt: Date,
    deciderId?: Types.ObjectId | string,
    reason?: string,
  ): AppealSourceResult {
    return {
      success: true,
      targetCollection,
      affectedUserId: String(affectedUserId),
      decidedAt: new Date(decidedAt),
      deciderId: deciderId ? String(deciderId) : undefined,
      reason,
    };
  }

  private fail(statusCode: number, message: string): AppealSourceResult {
    return { success: false, statusCode, message };
  }
}
