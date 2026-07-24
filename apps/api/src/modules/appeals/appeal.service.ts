import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  NOTIFICATION_PORT,
  NotificationPort,
} from 'src/common/contracts/notification.port';
import { AuditService } from 'src/common/services/audit.service';
import { Appeal, AppealDocument } from 'src/common/schemas/appeal.schema';
import {
  AppealStatus,
  AppealType,
  DisputeStatus,
  RequestAccessStatus,
} from 'src/common/schemas/common.enums';
import { Dispute, DisputeDocument } from 'src/common/schemas/dispute.schema';
import {
  RequestAccess,
  RequestAccessDocument,
} from 'src/common/schemas/request-access.schema';
import { AppealRestoreService } from './appeal-restore.service';
import { AppealSourceService } from './appeal-source.service';
import { ListAppealsDTO } from './dto/list-appeals.dto';
import { AdminListView } from 'src/common/dto/admin-list-view.dto';
import { ResolveAppealDTO } from './dto/resolve-appeal.dto';
import { SubmitAppealDTO } from './dto/submit-appeal.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
const APPEAL_DAYS = 14;

@Injectable()
export class AppealService {
  private readonly logger = new Logger(AppealService.name);

  constructor(
    @InjectModel(Appeal.name)
    private readonly appealModel: Model<AppealDocument>,
    @InjectModel(RequestAccess.name)
    private readonly reqModel: Model<RequestAccessDocument>,
    @InjectModel(Dispute.name)
    private readonly disputeModel: Model<DisputeDocument>,
    private readonly source: AppealSourceService,
    private readonly restore: AppealRestoreService,
    private readonly audit: AuditService,
    @Inject(NOTIFICATION_PORT)
    private readonly notification: NotificationPort,
  ) {}

  async submit(userId: string, dto: SubmitAppealDTO) {
    try {
      if (
        !Types.ObjectId.isValid(userId) ||
        !Types.ObjectId.isValid(dto.targetId)
      ) {
        return this.fail(400, 'ID kháng cáo không hợp lệ');
      }
      const targetId = new Types.ObjectId(dto.targetId);
      const source = await this.source.load(dto.type, targetId);
      if (!source.success) return source;
      if (source.affectedUserId !== userId) {
        return this.fail(403, 'Bạn không có quyền kháng cáo quyết định này');
      }
      const deadline = new Date(
        source.decidedAt.getTime() + APPEAL_DAYS * DAY_MS,
      );
      if (Date.now() > deadline.getTime()) {
        return this.fail(410, 'Đã quá hạn kháng cáo 14 ngày');
      }
      const existed = await this.appealModel
        .findOne({ targetCollection: source.targetCollection, targetId })
        .lean()
        .exec();
      if (existed) return this.fail(409, 'Quyết định này đã được kháng cáo');

      const additionalEvidenceFiles = dto.additionalEvidenceFiles.map(
        (file) => ({
          ...file,
          capturedAt: file.capturedAt ? new Date(file.capturedAt) : undefined,
        }),
      );
      const appeal = await this.appealModel.create({
        type: dto.type,
        targetCollection: source.targetCollection,
        targetId,
        appellantId: new Types.ObjectId(userId),
        argument: dto.argument.trim(),
        additionalEvidenceFiles,
        status: AppealStatus.PENDING,
        originalDecisionReason: source.reason,
        originalDeciderId: source.deciderId
          ? new Types.ObjectId(source.deciderId)
          : undefined,
        originalDecidedAt: source.decidedAt,
        appealDeadline: deadline,
      });
      return {
        success: true,
        message: 'Đã gửi kháng cáo',
        appeal: {
          id: appeal._id,
          status: appeal.status,
          appealDeadline: appeal.appealDeadline,
        },
      };
    } catch (err) {
      if (this.isDuplicate(err)) {
        return this.fail(409, 'Quyết định này đã được kháng cáo');
      }
      this.logger.error('Không thể gửi kháng cáo', err);
      return this.fail(500, 'Lỗi khi gửi kháng cáo');
    }
  }

  async listMine(userId: string) {
    if (!Types.ObjectId.isValid(userId))
      return this.fail(400, 'ID không hợp lệ');
    const items = await this.appealModel
      .find({ appellantId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return { success: true, items };
  }

  async getMine(id: string, userId: string) {
    if (!Types.ObjectId.isValid(id)) return this.fail(400, 'ID không hợp lệ');
    const appeal = await this.appealModel.findById(id).lean().exec();
    if (!appeal) return this.fail(404, 'Không tìm thấy kháng cáo');
    if (String(appeal.appellantId) !== userId) {
      return this.fail(403, 'Bạn không có quyền xem kháng cáo này');
    }
    const dispute = await this.disputeModel
      .findOne({ requestAccessId: appeal.targetId })
      .lean()
      .exec();
    return { success: true, appeal, disputeId: dispute?._id ?? null };
  }

  async getQueue(query: ListAppealsDTO) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const isHistory = query.view === AdminListView.HISTORY;
    const historyStatuses = [
      AppealStatus.ACCEPTED_TO_DISPUTE,
      AppealStatus.OVERTURNED,
      AppealStatus.UPHELD,
    ];
    let statusFilter: AppealStatus | { $in: AppealStatus[] } =
      AppealStatus.PENDING;
    if (query.status) {
      statusFilter = query.status;
    } else if (isHistory) {
      statusFilter = { $in: historyStatuses };
    }
    const filter: Record<string, unknown> = {
      status: statusFilter,
    };
    if (query.type) filter.type = query.type;
    const sort: Record<string, 1 | -1> = isHistory
      ? {
          'adminDecision.decidedAt': -1 as const,
          updatedAt: -1 as const,
          createdAt: -1 as const,
        }
      : { createdAt: 1 as const };
    const [items, total] = await Promise.all([
      this.appealModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('appellantId', 'fullName email')
        .lean()
        .exec(),
      this.appealModel.countDocuments(filter).exec(),
    ]);
    return { success: true, items, total, page, limit };
  }

  async getDetail(id: string) {
    if (!Types.ObjectId.isValid(id)) return this.fail(400, 'ID không hợp lệ');
    const appeal = await this.appealModel
      .findById(id)
      .populate('appellantId', 'fullName email')
      .lean()
      .exec();
    if (!appeal) return this.fail(404, 'Không tìm thấy kháng cáo');
    return { success: true, appeal };
  }

  async resolve(id: string, adminId: string, dto: ResolveAppealDTO) {
    try {
      if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(adminId)) {
        return this.fail(400, 'ID không hợp lệ');
      }
      const appeal = await this.appealModel.findById(id).exec();
      if (!appeal) return this.fail(404, 'Không tìm thấy kháng cáo');
      if (appeal.status !== AppealStatus.PENDING) {
        return this.fail(409, 'Kháng cáo đã được xử lý');
      }
      const isRequestAccessAppeal =
        appeal.type === AppealType.REQUEST_ACCESS_REJECTED;
      const originalDeciderId = appeal.originalDeciderId
        ? String(appeal.originalDeciderId)
        : null;
      const sameAdmin = originalDeciderId === adminId;
      if (!isRequestAccessAppeal && sameAdmin) {
        return this.fail(403, 'Admin ra quyết định gốc không được tự xét lại');
      }

      let dispute: DisputeDocument | null = null;
      let diff: Record<string, unknown> | undefined;
      if (dto.decision === AppealStatus.ACCEPTED_TO_DISPUTE) {
        if (appeal.type !== AppealType.REQUEST_ACCESS_REJECTED) {
          return this.fail(400, 'Loại kháng cáo này không thể mở tranh chấp');
        }
        const result = await this.escalateRequest(appeal);
        if (!result.success) return result;
        dispute = result.dispute;
        diff = result.diff;
      }
      if (dto.decision === AppealStatus.OVERTURNED) {
        if (appeal.type === AppealType.REQUEST_ACCESS_REJECTED) {
          return this.fail(400, 'Kháng cáo RequestAccess phải mở tranh chấp');
        }
        const result = await this.restore.restore(appeal.type, appeal.targetId);
        if (!result.success) return this.fail(409, result.message);
        diff = result.diff;
      }

      appeal.status = dto.decision;
      appeal.adminDecision = {
        decidedBy: new Types.ObjectId(adminId),
        reason: dto.reason.trim(),
        decidedAt: new Date(),
      };
      await appeal.save();

      await this.audit.log({
        actorId: adminId,
        action: `APPEAL_${dto.decision}`,
        targetCollection: 'appeals',
        targetId: appeal._id,
        reason: dto.reason.trim(),
        diff: {
          appealStatus: { from: AppealStatus.PENDING, to: dto.decision },
          restored: diff,
        },
      });
      await this.notification.notify({
        userId: String(appeal.appellantId),
        type: `APPEAL_${dto.decision}`,
        title: 'Kháng cáo đã được xử lý',
        body: dto.reason.trim(),
        refCollection: 'appeals',
        refId: String(appeal._id),
      });
      return {
        success: true,
        message: 'Đã xử lý kháng cáo',
        appeal: { id: appeal._id, status: appeal.status },
        dispute: dispute ? { id: dispute._id, status: dispute.status } : null,
      };
    } catch (err) {
      if (this.isDuplicate(err)) {
        return this.fail(409, 'RequestAccess đã có tranh chấp');
      }
      this.logger.error('Không thể xử lý kháng cáo', err);
      return this.fail(500, 'Lỗi khi xử lý kháng cáo');
    }
  }

  private async escalateRequest(appeal: AppealDocument) {
    const req = await this.reqModel.findById(appeal.targetId).exec();
    if (!req) return this.fail(404, 'Không tìm thấy RequestAccess');
    if (req.status !== RequestAccessStatus.REJECTED) {
      return this.fail(409, 'RequestAccess không còn ở trạng thái bị từ chối');
    }
    if (String(req.requesterId) !== String(appeal.appellantId)) {
      return this.fail(403, 'Người kháng cáo không phải người gửi yêu cầu');
    }
    const existed = await this.disputeModel
      .findOne({ requestAccessId: req._id })
      .lean()
      .exec();
    if (existed) return this.fail(409, 'RequestAccess đã có tranh chấp');

    const evidenceB = [
      ...(req.evidenceFiles ?? []),
      ...(appeal.additionalEvidenceFiles ?? []),
    ];
    const dispute = await this.disputeModel.create({
      requestAccessId: req._id,
      locationId: req.locationId,
      vendorAId: req.currentOwnerId,
      vendorBId: req.requesterId,
      evidenceA: [],
      evidenceB,
      status: DisputeStatus.OPEN,
    });
    req.status = RequestAccessStatus.ESCALATED;
    await req.save();
    return {
      success: true as const,
      dispute,
      diff: {
        requestStatus: {
          from: RequestAccessStatus.REJECTED,
          to: RequestAccessStatus.ESCALATED,
        },
        disputeId: String(dispute._id),
      },
    };
  }

  private isDuplicate(err: unknown) {
    if (!err || typeof err !== 'object') return false;
    if (!('code' in err)) return false;
    return err.code === 11000;
  }

  private fail(statusCode: number, message: string) {
    return { success: false as const, statusCode, message };
  }
}
