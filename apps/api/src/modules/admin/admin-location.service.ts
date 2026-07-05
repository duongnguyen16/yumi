import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AuditLog,
  AuditLogDocument,
} from 'src/common/schemas/audit-log.schema';
import {
  LocationRequest,
  LocationRequestDocument,
  LocationRequestStatus,
} from 'src/common/schemas/location-request';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import {
  LocationStatus,
  TrustEventType,
} from 'src/common/schemas/common.enums';
import { TrustEngineService } from '../trust-engine/trust-engine.service';
import {
  NOTIFICATION_PORT,
  NotificationPort,
} from 'src/common/contracts/notification.port';
import { ListPendingRequestsDTO } from './dto/list-pending-requests.dto';

const MAX_DIS = 50; // mét — BR-42/59, chốt số với team

@Injectable()
export class AdminLocationService {
  constructor(
    @InjectModel(LocationRequest.name)
    private reqModel: Model<LocationRequestDocument>,
    @InjectModel(Location.name)
    private locModel: Model<LocationDocument>,
    @InjectModel(AuditLog.name)
    private logModel: Model<AuditLogDocument>,
    private readonly trust: TrustEngineService,
    @Inject(NOTIFICATION_PORT) private notification: NotificationPort,
  ) {}

  async getList(q: ListPendingRequestsDTO) {
    try {
      const page = q.page ?? 1,
        limit = q.limit ?? 30;
      const filter = { status: LocationRequestStatus.PENDING };

      const [list, total] = await Promise.all([
        this.reqModel
          .find(filter)
          .sort({ isPotentialDuplicate: -1, createdAt: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('submittedBy', 'fullName email')
          .populate('locationId', 'name address status')
          .lean()
          .exec(),
        this.reqModel.countDocuments(filter).exec(),
      ]);

      const data = (list as any[]).map((r: any) => ({
        ...r,
        flags: {
          suspectedDuplicate: r.isPotentialDuplicate === true,
          suspectedDuplicateLocationIds: r.suspectedDuplicateLocationIds ?? [],
          farPin:
            typeof r.deviceDistanceMeters === 'number' &&
            r.deviceDistanceMeters > MAX_DIS,
        },
      }));

      return {
        success: true,
        total,
        page,
        limit,
        items: data,
      };
    } catch (err) {
      console.log(`get list err: ${err}`);
      return {
        success: false,
        statusCode: 500,
        message: 'Đang có xíu lỗi khi lấy danh sách',
      };
    }
  }

  approve(id: string, adminId: string) {
    return this.decide(id, adminId, 'APPROVE');
  }

  reject(id: string, adminId: string, reason: string, dupId?: string) {
    return this.decide(id, adminId, 'REJECT', reason, dupId);
  }

  private async decide(
    requestId: string,
    adminId: string,
    action: 'APPROVE' | 'REJECT',
    reason?: string,
    duplicateOfLocationId?: string,
  ) {
    try {
      if (!Types.ObjectId.isValid(requestId)) {
        return {
          success: false,
          statusCode: 400,
          message: 'ID phiếu không hợp lệ',
        };
      }

      const req = await this.reqModel.findById(requestId).exec();
      if (!req) {
        return {
          success: false,
          statusCode: 404,
          message: 'Không tìm thấy phiếu duyệt',
        };
      }
      if (req.status !== LocationRequestStatus.PENDING) {
        return {
          success: false,
          statusCode: 409,
          message: `Phiếu đang ở trạng thái ${req.status}, không thể duyệt`,
        };
      }

      const location = await this.locModel.findById(req.locationId).exec();
      if (!location) {
        return {
          success: false,
          statusCode: 404,
          message: 'Không tìm thấy địa điểm liên kết',
        };
      }
      const fromLocStatus = location.status;

      req.reviewerId = new Types.ObjectId(adminId);
      req.reviewedAt = new Date();

      if (action === 'APPROVE') {
        req.status = LocationRequestStatus.APPROVED;
        // Áp dữ liệu đề xuất vào bản chính rồi công khai.
        // SEAM (tùy F13/F32 tạo snapshot): copy field từ req.submittedDataSnapshot vào location.
        // Object.assign(location, pickAllowedFields(req.submittedDataSnapshot));
        location.status = LocationStatus.PUBLISHED;
        location.rejectionReason = undefined;
      } else {
        req.status = LocationRequestStatus.REJECTED;
        req.rejectReason = duplicateOfLocationId
          ? `${reason} (trùng với địa điểm ${duplicateOfLocationId})`
          : (reason ?? null);
        // Không áp snapshot. Địa điểm mới → để REJECTED; edit (Location đang PUBLISHED) → giữ nguyên bản cũ.
        if (location.status !== LocationStatus.PUBLISHED) {
          location.status = LocationStatus.REJECTED;
          location.rejectionReason = req.rejectReason ?? undefined;
        }
      }

      await req.save();
      await location.save();

      // (1) Trust — CHỈ khi duyệt (I8). Từ chối KHÔNG trừ trust (đã chốt) → không gọi recordEvent.
      if (action === 'APPROVE') {
        await this.trust.recordEvent({
          userId: String(req.submittedBy),
          type: TrustEventType.LOCATION_APPROVED,
          reason: 'Địa điểm được duyệt',
          refCollection: 'location_requests',
          refId: String(req._id),
        });
      }

      // (2) Notification — stub M3
      await this.notification.notify({
        userId: String(req.submittedBy),
        type: action === 'APPROVE' ? 'LOCATION_APPROVED' : 'LOCATION_REJECTED',
        title:
          action === 'APPROVE'
            ? 'Địa điểm của bạn đã được duyệt'
            : 'Địa điểm của bạn bị từ chối',
        body:
          action === 'APPROVE'
            ? `"${location.name}" đã được công khai.`
            : `"${location.name}" bị từ chối. Lý do: ${reason}`,
        refCollection: 'location_requests',
        refId: String(req._id),
      });

      // (3) Audit (I4)
      await this.logModel.create({
        actorId: new Types.ObjectId(adminId),
        action: action === 'APPROVE' ? 'LOCATION_APPROVE' : 'LOCATION_REJECT',
        targetCollection: 'location_requests',
        targetId: req._id,
        reason,
        diff: {
          requestStatus: {
            from: LocationRequestStatus.PENDING,
            to: req.status,
          },
          locationStatus: { from: fromLocStatus, to: location.status },
        },
      });

      return {
        success: true,
        message:
          action === 'APPROVE' ? 'Đã duyệt địa điểm' : 'Đã từ chối địa điểm',
        request: { id: req._id, status: req.status },
        location: { id: location._id, status: location.status },
      };
    } catch (err) {
      console.log(`decide err: ${err}`);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi xử lý duyệt địa điểm',
      };
    }
  }
}
