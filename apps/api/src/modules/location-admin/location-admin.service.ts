import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  LocationStatus,
  TrustEventType,
} from 'src/common/schemas/common.enums';
import {
  AuditLog,
  AuditLogDocument,
} from 'src/common/schemas/audit-log.schema';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import {
  LocationRequest,
  LocationRequestDocument,
  LocationRequestStatus,
  LocationRequestType,
} from 'src/common/schemas/location-request';
import {
  Notification,
  NotificationDocument,
} from 'src/common/schemas/notification.schema';
import { TrustEngineService } from '../trust-engine/trust-engine.service';

@Injectable()
export class LocationAdminService {
  constructor(
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
    @InjectModel(LocationRequest.name)
    private locationRequestModel: Model<LocationRequestDocument>,
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
    private readonly trustEngineService: TrustEngineService,
  ) {}

  async getPendingRequests(status?: LocationRequestStatus) {
    const queryStatus = status ?? LocationRequestStatus.PENDING;
    const requests = await this.locationRequestModel
      .find({ status: queryStatus })
      .sort({ createdAt: -1 })
      .populate('submittedBy', 'fullName email avatarUrl')
      .populate('locationId')
      .exec();

    return {
      success: true,
      requests,
    };
  }

  async getRequestDetail(requestId: string) {
    const request = await this.locationRequestModel
      .findById(requestId)
      .populate('submittedBy', 'fullName email avatarUrl')
      .populate('locationId')
      .populate('suspectedDuplicateLocationIds')
      .exec();

    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu địa điểm');
    }

    return {
      success: true,
      request,
    };
  }

  async approveRequest(requestId: string, reviewerId: string) {
    const request = await this.locationRequestModel.findById(requestId).exec();
    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu địa điểm');
    }

    const location = await this.locationModel
      .findById(request.locationId)
      .exec();
    if (!location) {
      throw new NotFoundException('Không tìm thấy địa điểm liên kết');
    }

    const previousLocationStatus = location.status;

    request.status = LocationRequestStatus.APPROVED;
    request.reviewerId = new Types.ObjectId(reviewerId);
    request.reviewedAt = new Date();
    request.reviewNote = null;

    if (request.type === LocationRequestType.UPDATE) {
      const cleanNewData = Object.fromEntries(
        Object.entries(request.newData ?? {}).filter(
          ([key, value]) =>
            key !== 'sourceEditSuggestionId' &&
            value !== null &&
            value !== undefined,
        ),
      );
      location.set(cleanNewData);
    }

    location.status = LocationStatus.PUBLISHED;
    request.reviewNote = undefined;
    await Promise.all([
      request.save(),
      location.save(),
      this.trustEngineService.recordEvent({
        userId: request.submittedBy,
        type: TrustEventType.LOCATION_APPROVED,
        reason: 'Location contribution approved',
        refCollection: 'location_requests',
        refId: request._id,
      }),
      this.auditLogModel.create({
        actorId: new Types.ObjectId(reviewerId),
        action: 'LOCATION_REQUEST_APPROVED',
        targetCollection: 'location_requests',
        targetId: request._id,
        diff: {
          locationId: request.locationId,
          status: {
            from: previousLocationStatus,
            to: LocationStatus.PUBLISHED,
          },
          newData: request.newData,
        },
      }),
      this.notificationModel.create({
        userId: request.submittedBy,
        type: 'LOCATION_REQUEST_APPROVED',
        refCollection: 'location_requests',
        refId: request._id,
        title: 'Địa điểm đã được phê duyệt',
        body: 'Địa điểm của bạn đã được phê duyệt.',
      }),
    ]);

    return {
      success: true,
      message: 'Phê duyệt địa điểm thành công',
    };
  }

  async rejectRequest(
    requestId: string,
    reviewerId: string,
    rejectReason: string,
  ) {
    const request = await this.locationRequestModel.findById(requestId).exec();
    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu địa điểm');
    }

    const location = await this.locationModel
      .findById(request.locationId)
      .exec();
    if (!location) {
      throw new NotFoundException('Không tìm thấy địa điểm liên kết');
    }

    request.status = LocationRequestStatus.REJECTED;
    request.reviewerId = new Types.ObjectId(reviewerId);
    request.reviewedAt = new Date();
    request.reviewNote = rejectReason;

    location.status = LocationStatus.REJECTED;

    await Promise.all([
      request.save(),
      location.save(),
      this.auditLogModel.create({
        actorId: new Types.ObjectId(reviewerId),
        action: 'LOCATION_REQUEST_REJECTED',
        targetCollection: 'location_requests',
        targetId: request._id,
        reason: rejectReason,
        diff: {
          locationId: request.locationId,
          status: {
            from: LocationStatus.SUBMITTED,
            to: LocationStatus.REJECTED,
          },
        },
      }),
      this.notificationModel.create({
        userId: request.submittedBy,
        type: 'LOCATION_REQUEST_REJECTED',
        refCollection: 'location_requests',
        refId: request._id,
        title: 'Địa điểm bị từ chối',
        body: 'Địa điểm của bạn đã bị từ chối.',
      }),
    ]);

    return {
      success: true,
      message: 'Từ chối địa điểm thành công',
    };
  }
}
