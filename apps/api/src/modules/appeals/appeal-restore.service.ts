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
import { Review, ReviewDocument } from 'src/common/schemas/review.schema';
import { User, UserDocument } from 'src/common/schemas/user.schema';
import { TrustEngineService } from 'src/modules/trust-engine/trust-engine.service';

export interface RestoreResult {
  success: boolean;
  message: string;
  diff?: Record<string, unknown>;
}

@Injectable()
export class AppealRestoreService {
  constructor(
    @InjectModel(LocationRequest.name)
    private readonly reqModel: Model<LocationRequestDocument>,
    @InjectModel(Location.name)
    private readonly locModel: Model<LocationDocument>,
    @InjectModel(ClaimRequest.name)
    private readonly claimModel: Model<ClaimRequestDocument>,
    @InjectModel(Dispute.name)
    private readonly disputeModel: Model<DisputeDocument>,
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(AuditLog.name)
    private readonly logModel: Model<AuditLogDocument>,
    private readonly trust: TrustEngineService,
  ) {}

  async restore(type: AppealType, id: Types.ObjectId): Promise<RestoreResult> {
    if (type === AppealType.LOCATION_REJECTED) return this.restoreLocation(id);
    if (type === AppealType.CLAIM_REJECTED) return this.restoreClaim(id);
    if (type === AppealType.DUPLICATE_HIDDEN) return this.restoreDuplicate(id);
    if (type === AppealType.OWNERSHIP_REVOKED) return this.restoreOwner(id);
    if (type === AppealType.REVIEW_REMOVED) return this.restoreReview(id);
    if (type === AppealType.USER_BANNED || type === AppealType.USER_WARNED) {
      return this.restoreUser(id, type);
    }
    return { success: false, message: 'Loại kháng cáo không hỗ trợ khôi phục' };
  }

  private async restoreLocation(id: Types.ObjectId) {
    const req = await this.reqModel.findById(id).exec();
    if (!req) return this.fail('Không tìm thấy yêu cầu địa điểm');
    if (req.status !== LocationRequestStatus.REJECTED) {
      return this.fail('Yêu cầu địa điểm không còn bị từ chối');
    }
    if (!req.locationId) return this.fail('Yêu cầu không có địa điểm liên kết');
    const loc = await this.locModel.findById(req.locationId).exec();
    if (!loc) return this.fail('Không tìm thấy địa điểm');
    if (loc.status !== LocationStatus.REJECTED) {
      return this.fail('Địa điểm không còn ở trạng thái bị từ chối');
    }
    req.status = LocationRequestStatus.APPROVED;
    loc.status = LocationStatus.PUBLISHED;
    await Promise.all([req.save(), loc.save()]);
    return {
      success: true,
      message: 'Đã khôi phục địa điểm',
      diff: {
        requestStatus: {
          from: LocationRequestStatus.REJECTED,
          to: LocationRequestStatus.APPROVED,
        },
        locationStatus: {
          from: LocationStatus.REJECTED,
          to: LocationStatus.PUBLISHED,
        },
      },
    };
  }

  private async restoreClaim(id: Types.ObjectId) {
    const claim = await this.claimModel.findById(id).exec();
    if (!claim) return this.fail('Không tìm thấy claim');
    if (claim.status !== ClaimRequestStatus.REJECTED) {
      return this.fail('Claim không còn ở trạng thái bị từ chối');
    }
    claim.status = ClaimRequestStatus.PENDING;
    claim.adminDecision = undefined;
    await claim.save();
    return {
      success: true,
      message: 'Đã đưa claim về hàng đợi',
      diff: {
        claimStatus: {
          from: ClaimRequestStatus.REJECTED,
          to: ClaimRequestStatus.PENDING,
        },
      },
    };
  }

  private async restoreDuplicate(id: Types.ObjectId) {
    const loc = await this.locModel.findById(id).exec();
    if (!loc) return this.fail('Không tìm thấy địa điểm');
    if (loc.status !== LocationStatus.HIDDEN || !loc.isDuplicate) {
      return this.fail('Địa điểm không còn ở trạng thái trùng lặp bị ẩn');
    }
    loc.status = LocationStatus.PUBLISHED;
    loc.isDuplicate = false;
    await loc.save();
    return {
      success: true,
      message: 'Đã khôi phục địa điểm trùng lặp',
      diff: {
        locationStatus: {
          from: LocationStatus.HIDDEN,
          to: LocationStatus.PUBLISHED,
        },
        isDuplicate: { from: true, to: false },
      },
    };
  }

  private async restoreOwner(id: Types.ObjectId) {
    const dispute = await this.disputeModel.findById(id).exec();
    if (!dispute) return this.fail('Không tìm thấy tranh chấp');
    if (dispute.status !== DisputeStatus.RESOLVED_REVOKE) {
      return this.fail('Tranh chấp không có quyết định thu hồi');
    }
    const log = await this.logModel
      .findOne({
        targetCollection: 'disputes',
        targetId: id,
        action: 'DISPUTE_REVOKE',
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const oldOwner = log?.diff?.ownerId as { from?: string } | undefined;
    if (!oldOwner?.from || !Types.ObjectId.isValid(oldOwner.from)) {
      return this.fail('Không tìm thấy chủ cũ trong audit');
    }
    const loc = await this.locModel.findById(dispute.locationId).exec();
    if (!loc) return this.fail('Không tìm thấy địa điểm');
    if (loc.ownerId) return this.fail('Địa điểm đã có chủ mới');
    loc.ownerId = new Types.ObjectId(oldOwner.from);
    await loc.save();
    return {
      success: true,
      message: 'Đã khôi phục chủ sở hữu',
      diff: { ownerId: { from: null, to: oldOwner.from } },
    };
  }

  private async restoreReview(id: Types.ObjectId) {
    const review = await this.reviewModel.findById(id).exec();
    if (!review) return this.fail('Không tìm thấy đánh giá');
    if (review.status !== ReviewStatus.REMOVED_BY_ADMIN) {
      return this.fail('Đánh giá không còn ở trạng thái bị gỡ');
    }
    review.status = ReviewStatus.PUBLISHED;
    await review.save();
    return {
      success: true,
      message: 'Đã khôi phục đánh giá',
      diff: {
        reviewStatus: {
          from: ReviewStatus.REMOVED_BY_ADMIN,
          to: ReviewStatus.PUBLISHED,
        },
      },
    };
  }

  private async restoreUser(
    id: Types.ObjectId,
    type: AppealType.USER_BANNED | AppealType.USER_WARNED,
  ) {
    const user = await this.userModel.findById(id).exec();
    if (!user) return this.fail('Không tìm thấy người dùng');
    const status =
      type === AppealType.USER_BANNED ? UserStatus.BANNED : UserStatus.WARNED;
    if (user.status !== status) {
      return this.fail('Trạng thái người dùng đã thay đổi');
    }
    const log = await this.logModel
      .findOne({
        targetCollection: 'users',
        targetId: id,
        action: `update_user_status:${status}`,
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    const oldStatus = log?.diff?.oldStatus;
    if (!Object.values(UserStatus).includes(oldStatus as UserStatus)) {
      return this.fail('Không tìm thấy trạng thái cũ trong audit');
    }
    if (type === AppealType.USER_BANNED) {
      await this.trust.unbanUser(id);
    }
    if (type === AppealType.USER_WARNED || oldStatus !== UserStatus.ACTIVE) {
      await this.userModel
        .updateOne({ _id: id }, { $set: { status: oldStatus } })
        .exec();
    }
    return {
      success: true,
      message: 'Đã khôi phục trạng thái người dùng',
      diff: { userStatus: { from: status, to: oldStatus } },
    };
  }

  private fail(message: string): RestoreResult {
    return { success: false, message };
  }
}
