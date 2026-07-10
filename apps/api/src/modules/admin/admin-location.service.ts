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
  LocationRequestType,
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

const FAR_PIN_THRESHOLD = 50; // mét — BR-42/59

// Trạng thái phiếu mà admin được phép xử lý (PENDING = tạo mới, PENDING_RE_APPROVAL = sửa BR-30).
const REVIEWABLE_STATUSES: LocationRequestStatus[] = [
  LocationRequestStatus.PENDING,
  LocationRequestStatus.PENDING_RE_APPROVAL,
];

// Các field của Location được phép cập nhật từ newData (allow-list).
// Loại trừ các field hệ thống (submittedBy, ownerId, status, source, viewCount, isDuplicate, ...).
const ALLOWED_SNAPSHOT_FIELDS = new Set([
  'name',
  'description',
  'address',
  'geo',
  'accuracyMeters',
  'openingHours',
  'phone',
  'categoryId',
  'subCategoryIds',
  'tagIds',
  'imagesUrls',
  'imageUrls',
  'latitude',
  'longitude',
  'pinLatitude',
  'pinLongitude',
]);

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
      const filter = { status: { $in: REVIEWABLE_STATUSES } };

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
            r.deviceDistanceMeters > FAR_PIN_THRESHOLD,
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
      const fromReqStatus = req.status;
      if (!REVIEWABLE_STATUSES.includes(req.status)) {
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
        req.reviewNote = null;
        // Áp newData (snapshot đề xuất) vào bản chính rồi công khai.
        this.applySnapshot(location, req.newData, req.type);
        location.status = LocationStatus.PUBLISHED;
      } else {
        const note = duplicateOfLocationId
          ? `${reason} (trùng với địa điểm ${duplicateOfLocationId})`
          : (reason ?? null);
        req.status = LocationRequestStatus.REJECTED;
        req.reviewNote = note;
        if (location.status !== LocationStatus.PUBLISHED) {
          location.status = LocationStatus.REJECTED;
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
          requestStatus: { from: fromReqStatus, to: req.status },
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
  private applySnapshot(
    location: LocationDocument,
    snapshot: Record<string, any> | null | undefined,
    type: LocationRequestType,
  ) {
    if (!snapshot || typeof snapshot !== 'object') return;

    for (const key of Object.keys(snapshot)) {
      if (!ALLOWED_SNAPSHOT_FIELDS.has(key)) continue;
      const value = snapshot[key];

      switch (key) {
        case 'name':
          if (typeof value === 'string') location.name = value.trim();
          break;
        case 'description':
          if (typeof value === 'string') location.description = value.trim();
          break;
        case 'address':
          if (typeof value === 'string') location.address = value.trim();
          break;
        case 'openingHours':
          if (typeof value === 'string') location.openingHours = value;
          break;
        case 'phone':
          if (typeof value === 'string') location.phone = value;
          break;
        case 'accuracyMeters':
          if (typeof value === 'number') location.accuracyMeters = value;
          break;
        case 'categoryId':
          if (value) location.categoryId = new Types.ObjectId(String(value));
          break;
        case 'subCategoryIds':
        case 'tagIds': {
          if (Array.isArray(value)) {
            location.subCategoryIds = value.map((id: any) =>
              new Types.ObjectId(String(id)),
            );
          }
          break;
        }
        case 'geo':
          if (value?.coordinates) location.geo = value;
          break;
        case 'latitude':
        case 'pinLatitude': {
          const lat = value;
          const lng =
            snapshot.longitude ?? snapshot.pinLongitude;
          if (typeof lat === 'number' && typeof lng === 'number') {
            location.geo = { type: 'Point', coordinates: [lng, lat] };
          }
          break;
        }
        case 'imagesUrls':
        case 'imageUrls': {
          if (Array.isArray(value)) {
            location.imagesUrls = value.map((url: string, i: number) => ({
              url,
              isCover: i === 0,
              uploadedAt: new Date(),
            }));
          }
          break;
        }
      }
    }

  }
}
