import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  NOTIFICATION_PORT,
  NotificationPort,
} from 'src/common/contracts/notification.port';
import { AuditService } from 'src/common/services/audit.service';
import { DisputeStatus } from 'src/common/schemas/common.enums';
import { Dispute, DisputeDocument } from 'src/common/schemas/dispute.schema';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import { ListDisputesDTO } from './dto/list-disputes.dto';
import { AdminListView } from 'src/common/dto/admin-list-view.dto';
import { DisputeOutcome, ResolveDisputeDTO } from './dto/resolve-dispute.dto';
import { AddDisputeEvidenceDTO } from './dto/add-dispute-evidence.dto';

@Injectable()
export class DisputeService {
  private readonly logger = new Logger(DisputeService.name);

  constructor(
    @InjectModel(Dispute.name)
    private readonly disputeModel: Model<DisputeDocument>,
    @InjectModel(Location.name)
    private readonly locModel: Model<LocationDocument>,
    private readonly audit: AuditService,
    @Inject(NOTIFICATION_PORT)
    private readonly notification: NotificationPort,
  ) {}

  // list disputes của user
  async listMine(userId: string) {
    if (!Types.ObjectId.isValid(userId))
      return this.fail(400, 'ID không hợp lệ');
    const id = new Types.ObjectId(userId);
    const items = await this.disputeModel
      .find({ $or: [{ vendorAId: id }, { vendorBId: id }] })
      .sort({ createdAt: -1 })
      .populate('locationId', 'name address ownerId')
      .lean()
      .exec();
    return { success: true, items };
  }

  // get detail tranh chấp của user
  async getForUser(id: string, userId: string) {
    if (!Types.ObjectId.isValid(id)) return this.fail(400, 'ID không hợp lệ');
    const item = await this.disputeModel
      .findById(id)
      .populate('locationId', 'name address ownerId')
      .populate('vendorAId', 'fullName email')
      .populate('vendorBId', 'fullName email')
      .lean()
      .exec();
    if (!item) return this.fail(404, 'Không tìm thấy tranh chấp');
    // k thuộc bên nào thì k cho xem
    if (!this.isParty(item, userId)) {
      return this.fail(403, 'Bạn không có quyền xem tranh chấp này');
    }
    return { success: true, dispute: item };
  }

  async addEvidence(id: string, userId: string, dto: AddDisputeEvidenceDTO) {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) {
      return this.fail(400, 'ID không hợp lệ');
    }
    const item = await this.disputeModel.findById(id).exec();
    if (!item) return this.fail(404, 'Không tìm thấy tranh chấp');
    if (item.status !== DisputeStatus.OPEN) {
      return this.fail(
        409,
        'Chỉ có thể thêm bằng chứng khi tranh chấp đang mở',
      );
    }
    const side = this.sideOf(item, userId);
    if (!side) {
      return this.fail(403, 'Bạn không có quyền thêm bằng chứng');
    }
    if (side === 'A') {
      item.evidenceA.push(...dto.evidenceFiles);
    } else {
      item.evidenceB.push(...dto.evidenceFiles);
    }
    await item.save();
    return {
      success: true,
      message: 'Đã thêm bằng chứng tranh chấp',
      dispute: {
        id: item._id,
        evidenceA: item.evidenceA.length,
        evidenceB: item.evidenceB.length,
      },
    };
  }

  // list tranh chấp cho admin
  async getQueue(query: ListDisputesDTO) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const isHistory = query.view === AdminListView.HISTORY;
    // keep: giữ nguyên, transfer: chuyển quyền sở hữu, revoke: thu hồi quyền sở hữu
    const historyStatuses = [
      DisputeStatus.RESOLVED_KEEP,
      DisputeStatus.RESOLVED_TRANSFER,
      DisputeStatus.RESOLVED_REVOKE,
    ];
    let statusFilter: DisputeStatus | { $in: DisputeStatus[] } =
      DisputeStatus.OPEN;
    if (query.status) {
      statusFilter = query.status;
    } else if (isHistory) {
      statusFilter = { $in: historyStatuses };
    }
    const filter = { status: statusFilter };
    const sort: Record<string, 1 | -1> = isHistory
      ? {
          'adminDecision.decidedAt': -1 as const,
          updatedAt: -1 as const,
          createdAt: -1 as const,
        }
      : { createdAt: 1 as const };
    const [items, total] = await Promise.all([
      this.disputeModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('locationId', 'name address ownerId')
        .populate('vendorAId', 'fullName email')
        .populate('vendorBId', 'fullName email')
        .lean()
        .exec(),
      this.disputeModel.countDocuments(filter).exec(),
    ]);
    return { success: true, items, total, page, limit };
  }

  async getDetail(id: string) {
    if (!Types.ObjectId.isValid(id)) return this.fail(400, 'ID không hợp lệ');
    const item = await this.disputeModel
      .findById(id)
      .populate('locationId', 'name address ownerId holdExpiresAt')
      .populate('vendorAId', 'fullName email phone trustLevel')
      .populate('vendorBId', 'fullName email phone trustLevel')
      .lean()
      .exec();
    if (!item) return this.fail(404, 'Không tìm thấy tranh chấp');
    return { success: true, dispute: item };
  }

  async resolve(id: string, adminId: string, dto: ResolveDisputeDTO) {
    try {
      if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(adminId)) {
        return this.fail(400, 'ID không hợp lệ');
      }
      const item = await this.disputeModel.findById(id).exec();
      if (!item) return this.fail(404, 'Không tìm thấy tranh chấp');
      if (item.status !== DisputeStatus.OPEN) {
        return this.fail(409, 'Tranh chấp đã được xử lý');
      }
      const loc = await this.locModel.findById(item.locationId).exec();
      if (!loc) return this.fail(404, 'Không tìm thấy địa điểm');
      if (String(loc.ownerId ?? '') !== String(item.vendorAId)) {
        return this.fail(409, 'Chủ địa điểm đã thay đổi');
      }
      // giải quyết tranh chấp
      const oldOwner = String(item.vendorAId);

      let newOwner: Types.ObjectId | undefined = item.vendorAId;
      let status = DisputeStatus.RESOLVED_KEEP;

      if (dto.outcome === DisputeOutcome.TRANSFER) {
        newOwner = item.vendorBId;
        status = DisputeStatus.RESOLVED_TRANSFER;
        loc.holdExpiresAt = undefined;
      }
      if (dto.outcome === DisputeOutcome.REVOKE) {
        newOwner = undefined;
        status = DisputeStatus.RESOLVED_REVOKE;
        loc.holdExpiresAt = undefined;
      }
      loc.ownerId = newOwner;
      await loc.save();

      item.status = status;
      item.adminDecision = {
        decidedBy: new Types.ObjectId(adminId),
        reason: dto.reason.trim(),
        decidedAt: new Date(),
      };
      await item.save();

      await this.audit.log({
        actorId: adminId,
        action: `DISPUTE_${dto.outcome}`,
        targetCollection: 'disputes',
        targetId: item._id,
        reason: dto.reason.trim(),
        diff: {
          disputeStatus: { from: DisputeStatus.OPEN, to: status },
          ownerId: { from: oldOwner, to: newOwner ? String(newOwner) : null },
        },
      });
      await Promise.all(
        [item.vendorAId, item.vendorBId].map((userId) =>
          this.notification.notify({
            userId: String(userId),
            type: 'DISPUTE_RESOLVED',
            title: 'Tranh chấp đã được xử lý',
            body: `Kết quả tranh chấp "${loc.name}": ${dto.outcome}.`,
            refCollection: 'disputes',
            refId: String(item._id),
          }),
        ),
      );
      return {
        success: true,
        message: 'Đã xử lý tranh chấp',
        dispute: { id: item._id, status: item.status },
        location: {
          id: loc._id,
          ownerId: loc.ownerId ?? null,
          holdExpiresAt: loc.holdExpiresAt ?? null,
        },
      };
    } catch (err) {
      this.logger.error('Không thể xử lý tranh chấp', err);
      return this.fail(500, 'Lỗi khi xử lý tranh chấp');
    }
  }

  private isParty(item: Dispute, userId: string) {
    return Boolean(this.sideOf(item, userId));
  }

  private sideOf(item: Dispute, userId: string) {
    if (this.participantId(item.vendorAId) === userId) return 'A';
    if (this.participantId(item.vendorBId) === userId) return 'B';
    return null;
  }

  private participantId(participant: unknown) {
    if (!participant || typeof participant !== 'object') {
      return String(participant);
    }

    if ('_id' in participant) {
      return String((participant as { _id: unknown })._id);
    }
    return String(participant);
  }

  private fail(statusCode: number, message: string) {
    return { success: false as const, statusCode, message };
  }
}
