import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  NOTIFICATION_PORT,
  NotificationPort,
} from 'src/common/contracts/notification.port';
import {
  AuditLog,
  AuditLogDocument,
} from 'src/common/schemas/audit-log.schema';
import {
  ClaimRequest,
  ClaimRequestDocument,
} from 'src/common/schemas/claim-request.schema';
import {
  ClaimRequestStatus,
  TrustEventType,
} from 'src/common/schemas/common.enums';
import { EvidenceFile } from 'src/common/schemas/common.embedded';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import { TrustEngineService } from '../trust-engine/trust-engine.service';
import { ListClaimsDTO } from './dto/list-claims.dto';

type ClaimData = {
  otpVerified?: boolean;
  evidenceFiles?: EvidenceFile[];
  licenseUrl?: string;
};

type LoadResult =
  | {
      success: true;
      claim: ClaimRequestDocument;
      loc: LocationDocument;
    }
  | {
      success: false;
      statusCode: number;
      message: string;
    };

@Injectable()
export class AdminClaimService {
  private readonly logger = new Logger(AdminClaimService.name);

  constructor(
    @InjectModel(ClaimRequest.name)
    private readonly claimModel: Model<ClaimRequestDocument>,
    @InjectModel(Location.name)
    private readonly locModel: Model<LocationDocument>,
    @InjectModel(AuditLog.name)
    private readonly logModel: Model<AuditLogDocument>,
    private readonly trust: TrustEngineService,
    @Inject(NOTIFICATION_PORT)
    private readonly notification: NotificationPort,
  ) {}

  async getQueue(q: ListClaimsDTO) {
    try {
      const page = q.page ?? 1;
      const limit = q.limit ?? 20;
      const filter = { status: q.status ?? ClaimRequestStatus.PENDING };
      const [items, total] = await Promise.all([
        this.claimModel
          .find(filter)
          .sort({ otpVerified: -1, createdAt: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('vendorId', 'fullName email phone')
          .populate('locationId', 'name address ownerId status phone')
          .lean()
          .exec(),
        this.claimModel.countDocuments(filter).exec(),
      ]);

      return {
        success: true,
        total,
        page,
        limit,
        items: items.map((item) => ({
          ...item,
          flags: this.getFlags(item),
        })),
      };
    } catch (err) {
      this.logger.error('Không thể lấy hàng đợi claim', err);
      return this.fail(500, 'Lỗi khi lấy hàng đợi claim');
    }
  }

  async approve(id: string, adminId: string, reason?: string) {
    try {
      const data = await this.load(id);
      if (!data.success) return data;
      const { claim, loc } = data;
      const flags = this.getFlags(claim);

      if (!flags.eligibleForApprove) {
        return this.fail(
          422,
          'Claim cần xác minh OTP hoặc kiểm tra no-phone, kèm ảnh hiện trường có mã, vị trí và thời gian.',
        );
      }

      if (loc.ownerId && String(loc.ownerId) !== String(claim.vendorId)) {
        return this.redirectToAccess(claim, loc, adminId);
      }

      const oldOwner = loc.ownerId ? String(loc.ownerId) : null;
      loc.ownerId = claim.vendorId;
      await loc.save();

      claim.status = ClaimRequestStatus.APPROVED;
      claim.adminDecision = {
        decidedBy: new Types.ObjectId(adminId),
        reason: reason?.trim() || 'Đủ điều kiện xác minh sở hữu',
        decidedAt: new Date(),
      };
      await claim.save();

      await this.trust.recordEvent({
        userId: claim.vendorId,
        type: TrustEventType.LOCATION_APPROVED,
        reason: 'Claim địa điểm được duyệt',
        refCollection: 'claim_requests',
        refId: claim._id,
      });
      await this.notification.notify({
        userId: String(claim.vendorId),
        type: 'CLAIM_APPROVED',
        title: 'Yêu cầu sở hữu đã được duyệt',
        body: `Bạn đã trở thành chủ sở hữu của "${loc.name}".`,
        refCollection: 'claim_requests',
        refId: String(claim._id),
      });
      await this.writeLog(adminId, 'CLAIM_APPROVE', claim._id, reason, {
        claimStatus: {
          from: ClaimRequestStatus.PENDING,
          to: ClaimRequestStatus.APPROVED,
        },
        ownerId: { from: oldOwner, to: String(claim.vendorId) },
        locationId: String(loc._id),
      });

      return {
        success: true,
        message: 'Đã duyệt claim và gán chủ sở hữu',
        claim: { id: claim._id, status: claim.status },
        location: { id: loc._id, ownerId: loc.ownerId },
      };
    } catch (err) {
      this.logger.error('Không thể duyệt claim', err);
      return this.fail(500, 'Lỗi khi duyệt claim');
    }
  }

  async reject(id: string, adminId: string, reason: string) {
    try {
      const data = await this.load(id);
      if (!data.success) return data;
      const { claim, loc } = data;

      claim.status = ClaimRequestStatus.REJECTED;
      claim.adminDecision = {
        decidedBy: new Types.ObjectId(adminId),
        reason: reason.trim(),
        decidedAt: new Date(),
      };
      await claim.save();

      await this.notification.notify({
        userId: String(claim.vendorId),
        type: 'CLAIM_REJECTED',
        title: 'Yêu cầu sở hữu bị từ chối',
        body: `Yêu cầu sở hữu "${loc.name}" bị từ chối. Lý do: ${reason.trim()}`,
        refCollection: 'claim_requests',
        refId: String(claim._id),
      });
      await this.writeLog(adminId, 'CLAIM_REJECT', claim._id, reason.trim(), {
        claimStatus: {
          from: ClaimRequestStatus.PENDING,
          to: ClaimRequestStatus.REJECTED,
        },
      });

      return {
        success: true,
        message: 'Đã từ chối claim',
        claim: { id: claim._id, status: claim.status },
      };
    } catch (err) {
      this.logger.error('Không thể từ chối claim', err);
      return this.fail(500, 'Lỗi khi từ chối claim');
    }
  }

  async requestEvidence(id: string, adminId: string, message: string) {
    try {
      const data = await this.load(id);
      if (!data.success) return data;
      const { claim, loc } = data;
      const text = message.trim();

      await this.notification.notify({
        userId: String(claim.vendorId),
        type: 'CLAIM_NEEDS_MORE_EVIDENCE',
        title: 'Cần bổ sung bằng chứng',
        body: `Claim cho "${loc.name}" cần bổ sung: ${text}`,
        refCollection: 'claim_requests',
        refId: String(claim._id),
      });
      await this.writeLog(adminId, 'CLAIM_REQUEST_EVIDENCE', claim._id, text, {
        claimStatus: ClaimRequestStatus.PENDING,
      });

      return {
        success: true,
        message: 'Đã gửi yêu cầu bổ sung bằng chứng',
        claim: { id: claim._id, status: claim.status },
      };
    } catch (err) {
      this.logger.error('Không thể yêu cầu thêm bằng chứng', err);
      return this.fail(500, 'Lỗi khi yêu cầu bổ sung bằng chứng');
    }
  }

  private async redirectToAccess(
    claim: ClaimRequestDocument,
    loc: LocationDocument,
    adminId: string,
  ) {
    const reason = 'Địa điểm đã có chủ, hãy gửi RequestAccess';
    claim.status = ClaimRequestStatus.REJECTED;
    claim.adminDecision = {
      decidedBy: new Types.ObjectId(adminId),
      reason,
      decidedAt: new Date(),
    };
    await claim.save();
    await this.notification.notify({
      userId: String(claim.vendorId),
      type: 'CLAIM_REDIRECTED_TO_REQUEST_ACCESS',
      title: 'Hãy gửi yêu cầu chuyển quyền',
      body: `"${loc.name}" đã có chủ. Bạn có thể gửi RequestAccess để yêu cầu quyền quản lý.`,
      refCollection: 'claim_requests',
      refId: String(claim._id),
    });
    await this.writeLog(adminId, 'CLAIM_REDIRECT_TO_REQUEST_ACCESS', claim._id, reason, {
      claimStatus: {
        from: ClaimRequestStatus.PENDING,
        to: ClaimRequestStatus.REJECTED,
      },
      locationId: String(loc._id),
    });
    return {
      success: true,
      redirectToRequestAccess: true,
      message: reason,
      claim: { id: claim._id, status: claim.status },
    };
  }

  private getFlags(claim: ClaimData) {
    const files = claim.evidenceFiles ?? [];
    const hasOnSiteProof = files.some(
      (file) =>
        file.fileType === 'IMAGE' &&
        file.geo?.coordinates.length === 2 &&
        Boolean(file.capturedAt),
    );
    const hasSiteCode = files.some(
      (file) => typeof file.metadata?.siteCode === 'string',
    );
    const needsAdminScrutiny = files.some(
      (file) => file.metadata?.adminScrutiny === 'NO_PHONE_HIGHER_SCRUTINY',
    );
    const otpVerified = claim.otpVerified === true;

    return {
      otpVerified,
      needsAdminScrutiny,
      hasOnSiteProof,
      hasSiteCode,
      hasLicense: Boolean(claim.licenseUrl),
      eligibleForApprove:
        (otpVerified || needsAdminScrutiny) && hasOnSiteProof && hasSiteCode,
    };
  }

  private async load(id: string): Promise<LoadResult> {
    if (!Types.ObjectId.isValid(id)) {
      return this.fail(400, 'ID claim không hợp lệ');
    }
    const claim = await this.claimModel.findById(id).exec();
    if (!claim) return this.fail(404, 'Không tìm thấy claim');
    if (claim.status !== ClaimRequestStatus.PENDING) {
      return this.fail(
        409,
        `Claim đang ở trạng thái ${claim.status}, không thể xử lý`,
      );
    }
    const loc = await this.locModel.findById(claim.locationId).exec();
    if (!loc) return this.fail(404, 'Không tìm thấy địa điểm của claim');
    return { success: true, claim, loc };
  }

  private async writeLog(
    adminId: string,
    action: string,
    targetId: Types.ObjectId,
    reason?: string,
    diff?: Record<string, unknown>,
  ) {
    await this.logModel.create({
      actorId: new Types.ObjectId(adminId),
      action,
      targetCollection: 'claim_requests',
      targetId,
      reason,
      diff,
    });
  }

  private fail(statusCode: number, message: string) {
    return { success: false as const, statusCode, message };
  }
}
