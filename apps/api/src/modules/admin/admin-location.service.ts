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

const FAR_PIN_THRESHOLD = 50;

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

// check tọa độ hợp lệ oke k

function isGeoPoint(value: unknown): value is {
  coordinates: [number, number];
} {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (!('coordinates' in value)) {
    return false;
  }

  const coordinates = value.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return false;
  }

  return coordinates.every((coordinate) => typeof coordinate === 'number');
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

  // lấy ds
  async getList(q: ListPendingRequestsDTO) {
    try {
      const page = q.page ?? 1;
      const limit = q.limit ?? 30;
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
          .lean<LocationRequestQueueItem[]>()
          .exec(),
        this.reqModel.countDocuments(filter).exec(),
      ]);

      const data = list.map((request) => {
        const distance = request.deviceDistanceMeters;
        const hasDistance = typeof distance === 'number';
        const farPin = hasDistance && distance > FAR_PIN_THRESHOLD;

        return {
          ...request,
          flags: {
            suspectedDuplicate: request.isPotentialDuplicate === true,
            suspectedDuplicateLocationIds:
              request.suspectedDuplicateLocationIds ?? [],
            farPin,
          },
        };
      });

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

  async confirmDuplicateLocation(
    locationId: string,
    adminId: string,
    reason: string,
    duplicateOfLocationId?: string,
  ) {
    try {
      if (!Types.ObjectId.isValid(locationId)) {
        return {
          success: false,
          statusCode: 400,
          message: 'ID địa điểm không hợp lệ',
        };
      }

      const decisionReason = reason?.trim();
      if (!decisionReason || decisionReason.length < 5) {
        return {
          success: false,
          statusCode: 400,
          message: 'Lý do xác nhận trùng lặp phải có ít nhất 5 ký tự',
        };
      }

      if (
        duplicateOfLocationId &&
        !Types.ObjectId.isValid(duplicateOfLocationId)
      ) {
        return {
          success: false,
          statusCode: 400,
          message: 'ID địa điểm gốc không hợp lệ',
        };
      }

      const location = await this.locModel.findById(locationId).exec();
      if (!location) {
        return {
          success: false,
          statusCode: 404,
          message: 'Không tìm thấy địa điểm',
        };
      }

      if (location.isDuplicate && location.status === LocationStatus.HIDDEN) {
        return {
          success: false,
          statusCode: 409,
          message: 'Địa điểm đã được xác nhận trùng lặp',
        };
      }

      const fromLocStatus = location.status;
      const previousDuplicate = location.isDuplicate;
      const previousSuspected = location.isSuspectedDuplicate;
      const affectedUserId = String(location.ownerId ?? location.submittedBy);

      location.status = LocationStatus.HIDDEN;
      location.isDuplicate = true;
      location.isSuspectedDuplicate = false;
      await location.save();

      await this.logModel.create({
        actorId: new Types.ObjectId(adminId),
        action: 'LOCATION_HIDE_DUPLICATE',
        targetCollection: 'locations',
        targetId: location._id,
        reason: decisionReason,
        diff: {
          duplicateOfLocationId,
          locationStatus: { from: fromLocStatus, to: LocationStatus.HIDDEN },
          isDuplicate: { from: previousDuplicate, to: true },
          isSuspectedDuplicate: { from: previousSuspected, to: false },
        },
      });

      await this.notification.notify({
        userId: affectedUserId,
        type: 'LOCATION_DUPLICATE_HIDDEN',
        title: 'Địa điểm bị ẩn vì trùng lặp',
        body: `"${location.name}" đã bị xác nhận là địa điểm trùng lặp. Bạn có thể gửi kháng cáo nếu có bằng chứng địa điểm độc lập.`,
        refCollection: 'locations',
        refId: String(location._id),
      });

      return {
        success: true,
        message: 'Đã xác nhận trùng lặp và ẩn địa điểm',
        location: {
          id: location._id,
          status: location.status,
          isDuplicate: location.isDuplicate,
        },
      };
    } catch (err) {
      console.log(`confirm duplicate err: ${err}`);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi xác nhận địa điểm trùng lặp',
      };
    }
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

      const approved = action === 'APPROVE';
      const notificationType = approved
        ? 'LOCATION_APPROVED'
        : 'LOCATION_REJECTED';
      const notificationTitle = approved
        ? 'Địa điểm của bạn đã được duyệt'
        : 'Địa điểm của bạn bị từ chối';
      const notificationBody = approved
        ? `"${location.name}" đã được công khai.`
        : `"${location.name}" bị từ chối. Lý do: ${req.reviewNote}`;

      await this.notification.notify({
        userId: String(req.submittedBy),
        type: notificationType,
        title: notificationTitle,
        body: notificationBody,
        refCollection: 'location_requests',
        refId: String(req._id),
      });

      // log tí cho bt ai vs ai

      const logAction = approved ? 'LOCATION_APPROVE' : 'LOCATION_REJECT';
      let logReason: string | undefined;
      if (!approved) {
        logReason = req.reviewNote ?? undefined;
      }
      await this.logModel.create({
        actorId: new Types.ObjectId(adminId),
        action: logAction,
        targetCollection: 'location_requests',
        targetId: req._id,
        reason: logReason,
        diff: {
          requestStatus: { from: fromReqStatus, to: req.status },
          locationStatus: { from: fromLocStatus, to: location.status },
        },
      });

      const message = approved ? 'Đã duyệt địa điểm' : 'Đã từ chối địa điểm';
      return {
        success: true,
        message,
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
    if (!snapshot || typeof snapshot !== 'object') return;

    for (const key of Object.keys(snapshot)) {
      if (!ALLOWED_SNAPSHOT_FIELDS.has(key)) continue;

      const value = snapshot[key];

      if (key === 'name') {
        if (typeof value === 'string') {
          location.name = value.trim();
        }
      }

      if (key === 'description') {
        if (typeof value === 'string') {
          location.description = value.trim();
        }
      }

      if (key === 'address') {
        if (typeof value === 'string') {
          location.address = value.trim();
        }
      }

      if (key === 'openingHours') {
        if (typeof value === 'string') {
          location.openingHours = value;
        }
      }

      if (key === 'phone') {
        if (typeof value === 'string') {
          location.phone = value;
        }
      }

      if (key === 'accuracyMeters') {
        if (typeof value === 'number') {
          location.accuracyMeters = value;
        }
      }

      if (key === 'categoryId') {
        if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
          location.categoryId = new Types.ObjectId(value);
        }
      }

      if (key === 'subCategoryIds') {
        if (Array.isArray(value)) {
          location.subCategoryIds = value
            .filter((id): id is string => typeof id === 'string' && Types.ObjectId.isValid(id))
            .map((id) => new Types.ObjectId(id));
        }
      }

      if (key === 'geo') {
        if (isGeoPoint(value)) {
          location.geo = { type: 'Point', coordinates: value.coordinates };
        }
      }

      if (key === 'latitude' || key === 'pinLatitude') {
        const lat = value;
        const lng = snapshot.longitude ?? snapshot.pinLongitude;
        if (typeof lat === 'number' && typeof lng === 'number') {
          location.geo = { type: 'Point', coordinates: [lng, lat] };
        }
      }

      if (key === 'imagesUrls' || key === 'imageUrls') {
        if (Array.isArray(value)) {
          location.imagesUrls = value
            .filter((url): url is string => typeof url === 'string')
            .map((url, i) => ({
              url,
              isCover: i === 0,
              uploadedAt: new Date(),
            }));
        }
      }
    }
  }
}
