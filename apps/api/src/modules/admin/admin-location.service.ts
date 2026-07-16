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
import { AdminListView } from 'src/common/dto/admin-list-view.dto';

const FAR_PIN_THRESHOLD = 500; 

const REVIEWABLE_STATUSES: LocationRequestStatus[] = [
  LocationRequestStatus.PENDING,
  LocationRequestStatus.PENDING_RE_APPROVAL,
];

const HISTORY_STATUSES: LocationRequestStatus[] = [
  LocationRequestStatus.APPROVED,
  LocationRequestStatus.REJECTED,
  LocationRequestStatus.CANCELLED,
];

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

type LocationRequestQueueItem = {
  isPotentialDuplicate?: boolean;
  suspectedDuplicateLocationIds?: Types.ObjectId[];
  deviceDistanceMeters?: number | null;
  [key: string]: unknown;
};

function isGeoPoint(value: unknown): value is {
  coordinates: [number, number];
} {
  if (!value || typeof value !== 'object' || !('coordinates' in value)) {
    return false;
  }

  const coordinates = value.coordinates;
  return (
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    coordinates.every((coordinate) => typeof coordinate === 'number')
  );
}

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
      const isHistory = q.view === AdminListView.HISTORY;
      const filter = {
        status: { $in: isHistory ? HISTORY_STATUSES : REVIEWABLE_STATUSES },
      };
      const sort: Record<string, 1 | -1> = isHistory
        ? {
            reviewedAt: -1 as const,
            updatedAt: -1 as const,
            createdAt: -1 as const,
          }
        : { isPotentialDuplicate: -1 as const, createdAt: 1 as const };

      const [list, total] = await Promise.all([
        this.reqModel
          .find(filter)
          .sort(sort)
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('submittedBy', 'fullName email')
          .populate('locationId', 'name address status')
          .lean()
          .exec(),
        this.reqModel.countDocuments(filter).exec(),
      ]);

      const data = (list as unknown as LocationRequestQueueItem[]).map((r) => ({
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

      // reject nmak lý do

      const rejectionReason = reason?.trim();
      if (
        action === 'REJECT' &&
        (!rejectionReason || rejectionReason.length < 5)
      ) {
        return {
          success: false,
          statusCode: 400,
          message: 'Lý do từ chối phải có ít nhất 5 ký tự',
        };
      }

      // k thấy request id 

      const req = await this.reqModel.findById(requestId).exec();
      if (!req) {
        return {
          success: false,
          statusCode: 404,
          message: 'Không tìm thấy phiếu duyệt',
        };
      }

      const fromReqStatus = req.status;
      
      // status cấm duyệt

      if (!REVIEWABLE_STATUSES.includes(req.status)) {
        return {
          success: false,
          statusCode: 409,
          message: `Phiếu đang ở trạng thái ${req.status}, không thể duyệt`,
        };
      }

      // bắt đầu thay đổi

      const location = await this.locModel.findById(req.locationId).exec();

      // k thấy location để đổi

      if (!location) {
        return {
          success: false,
          statusCode: 404,
          message: 'Không tìm thấy địa điểm liên kết',
        };
      }

      // check trạng thái cũ

      const fromLocStatus = location.status;

      req.reviewerId = new Types.ObjectId(adminId);
      req.reviewedAt = new Date();

      // cập nhật trạng thái req và location
      
      if (action === 'APPROVE') {
        req.status = LocationRequestStatus.APPROVED;
        req.reviewNote = null;
        this.applySnapshot(location, req.newData);
        location.status = LocationStatus.PUBLISHED;
      } else {

        const note = duplicateOfLocationId
          ? `${rejectionReason} (trùng với địa điểm ${duplicateOfLocationId})`
          : rejectionReason;
        req.status = LocationRequestStatus.REJECTED;
        req.reviewNote = note;
        if (location.status !== LocationStatus.PUBLISHED) {
          location.status = LocationStatus.REJECTED;
        }
      }

      // lưu db
      await req.save();
      await location.save();

      // update cho user trust và notification

      if (action === 'APPROVE') {
        await this.trust.recordEvent({
          userId: String(req.submittedBy),
          type: TrustEventType.LOCATION_APPROVED,
          reason: 'Địa điểm được duyệt',
          refCollection: 'location_requests',
          refId: String(req._id),
        });
      }

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
            : `"${location.name}" bị từ chối. Lý do: ${req.reviewNote}`,
        refCollection: 'location_requests',
        refId: String(req._id),
      });

      // log tí cho bt ai vs ai

      await this.logModel.create({
        actorId: new Types.ObjectId(adminId),
        action: action === 'APPROVE' ? 'LOCATION_APPROVE' : 'LOCATION_REJECT',
        targetCollection: 'location_requests',
        targetId: req._id,
        reason: action === 'REJECT' ? (req.reviewNote ?? undefined) : undefined,
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

  // apply cái thay đổi vào db chính

  private applySnapshot(
    location: LocationDocument,
    snapshot: Record<string, unknown> | null | undefined,
  ) {
    // k có snapshot thì th
    if (!snapshot || typeof snapshot !== 'object') return;

    // apply các attribute vào locaiton th

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
          if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
            location.categoryId = new Types.ObjectId(value);
          }
          break;
        case 'subCategoryIds':
        case 'tagIds': {
          if (Array.isArray(value)) {
            location.subCategoryIds = value
              .filter(
                (id): id is string =>
                  typeof id === 'string' && Types.ObjectId.isValid(id),
              )
              .map((id) => new Types.ObjectId(id));
          }
          break;
        }
        case 'geo':
          if (isGeoPoint(value)) {
            location.geo = { type: 'Point', coordinates: value.coordinates };
          }
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
            location.imagesUrls = value
              .filter((url): url is string => typeof url === 'string')
              .map((url, i) => ({
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
