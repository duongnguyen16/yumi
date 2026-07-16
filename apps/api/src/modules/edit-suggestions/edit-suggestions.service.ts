import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AuditLog,
  AuditLogDocument,
} from 'src/common/schemas/audit-log.schema';
import {
  EditSuggestion,
  EditSuggestionDocument,
} from 'src/common/schemas/edit-suggestion.schema';
import {
  EditSuggestionStatus,
  LocationStatus,
  RoutingTarget,
  UserRole,
  UserStatus,
} from 'src/common/schemas/common.enums';
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
import { User, UserDocument } from 'src/common/schemas/user.schema';
import {
  CreateEditSuggestionDto,
  EditSuggestionChangeDto,
  EditSuggestionField,
  EditSuggestionFlag,
} from './dto/create-edit-suggestion.dto';

@Injectable()
export class EditSuggestionsService {
  constructor(
    @InjectModel(EditSuggestion.name)
    private readonly editSuggestionModel: Model<EditSuggestionDocument>,
    @InjectModel(Location.name)
    private readonly locationModel: Model<LocationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(LocationRequest.name)
    private readonly locationRequestModel: Model<LocationRequestDocument>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async create(
    userId: string,
    locationId: string,
    dto: CreateEditSuggestionDto,
  ) {
    const userObjectId = this.toObjectId(userId, 'Người dùng không hợp lệ');
    const locationObjectId = this.toObjectId(
      locationId,
      'Địa điểm không hợp lệ',
    );

    if (!dto.changes?.length) {
      throw new BadRequestException('Cần ít nhất một đề xuất chỉnh sửa');
    }

    const [user, location] = await Promise.all([
      this.userModel.findById(userObjectId).select('status').lean().exec(),
      this.locationModel.findById(locationObjectId).lean().exec(),
    ]);

    if (!user || user.status === UserStatus.BANNED) {
      throw new ForbiddenException('Tài khoản không thể gửi đề xuất');
    }
    if (!location) {
      throw new NotFoundException('Không tìm thấy địa điểm');
    }
    if (location.status !== LocationStatus.PUBLISHED) {
      throw new BadRequestException(
        'Chỉ có thể đề xuất chỉnh sửa địa điểm đang hiển thị',
      );
    }

    const routingTarget = this.getRoutingTarget(location);

    const suggestions = await this.editSuggestionModel.insertMany(
      dto.changes.map((change) => ({
        locationId: locationObjectId,
        userId: userObjectId,
        fieldName: change.fieldName,
        oldValue: this.getOldValue(location, change.fieldName),
        newValue: this.getNewValue(change, dto.note),
        routingTarget,
        status: EditSuggestionStatus.PENDING,
      })),
    );

    return {
      success: true,
      message: 'Đã gửi đề xuất chỉnh sửa',
      routingTarget,
      suggestions: suggestions.map((suggestion) =>
        this.serializeSuggestion(suggestion, location),
      ),
    };
  }

  async getAdminQueue() {
    const suggestions = await this.getPendingSuggestionsForRoute(
      RoutingTarget.ADMIN,
    );

    return {
      success: true,
      suggestions,
    };
  }

  async getVendorInbox(userId: string) {
    const userObjectId = this.toObjectId(userId, 'Người dùng không hợp lệ');
    const suggestions = await this.getPendingSuggestionsForRoute(
      RoutingTarget.VENDOR,
      userObjectId,
    );

    return {
      success: true,
      suggestions,
    };
  }

  async apply(userId: string, suggestionId: string, reason?: string) {
    const reviewerObjectId = this.toObjectId(
      userId,
      'Người duyệt không hợp lệ',
    );
    const suggestionObjectId = this.toObjectId(
      suggestionId,
      'Đề xuất không hợp lệ',
    );

    const { suggestion, location, reviewer, currentRoute } =
      await this.loadReviewContext(reviewerObjectId, suggestionObjectId);

    await this.assertCanReview(reviewer, location, currentRoute);

    if (location.status !== LocationStatus.PUBLISHED) {
      return this.discardUnavailableSuggestion(
        suggestion,
        reviewerObjectId,
        location,
        'Địa điểm không còn hiển thị để áp dụng đề xuất',
      );
    }

    const oldStatus = location.status;
    const applyResult = await this.applySuggestionToLocation(
      suggestion,
      location,
      reviewerObjectId,
      reason,
    );

    suggestion.status = EditSuggestionStatus.APPLIED;
    suggestion.reviewedBy = reviewerObjectId;
    suggestion.reviewedAt = new Date();
    suggestion.reviewReason = reason;
    suggestion.routingTarget = currentRoute;

    await Promise.all([
      suggestion.save(),
      this.auditLogModel.create({
        actorId: reviewerObjectId,
        action: 'EDIT_SUGGESTION_APPLIED',
        targetCollection: 'edit_suggestions',
        targetId: suggestion._id,
        reason,
        diff: {
          locationId: location._id,
          fieldName: suggestion.fieldName,
          oldValue: suggestion.oldValue,
          newValue: suggestion.newValue,
          status: { from: oldStatus, to: location.status },
          result: applyResult,
        },
      }),
      this.notificationModel.create({
        userId: suggestion.userId,
        type: 'EDIT_SUGGESTION_APPLIED',
        refCollection: 'edit_suggestions',
        refId: suggestion._id,
        title: 'Đề xuất chỉnh sửa đã được áp dụng',
        body: 'Đề xuất chỉnh sửa của bạn đã được duyệt.',
      }),
    ]);

    return {
      success: true,
      message: applyResult.message,
      suggestion: this.serializeSuggestion(suggestion, location),
      result: applyResult,
    };
  }

  async discard(userId: string, suggestionId: string, reason?: string) {
    const reviewerObjectId = this.toObjectId(
      userId,
      'Người duyệt không hợp lệ',
    );
    const suggestionObjectId = this.toObjectId(
      suggestionId,
      'Đề xuất không hợp lệ',
    );

    const { suggestion, location, reviewer, currentRoute } =
      await this.loadReviewContext(reviewerObjectId, suggestionObjectId);

    await this.assertCanReview(reviewer, location, currentRoute);

    suggestion.status = EditSuggestionStatus.DISCARDED;
    suggestion.reviewedBy = reviewerObjectId;
    suggestion.reviewedAt = new Date();
    suggestion.reviewReason = reason;
    suggestion.routingTarget = currentRoute;

    await Promise.all([
      suggestion.save(),
      this.auditLogModel.create({
        actorId: reviewerObjectId,
        action: 'EDIT_SUGGESTION_DISCARDED',
        targetCollection: 'edit_suggestions',
        targetId: suggestion._id,
        reason,
        diff: {
          locationId: location._id,
          fieldName: suggestion.fieldName,
        },
      }),
      this.notificationModel.create({
        userId: suggestion.userId,
        type: 'EDIT_SUGGESTION_DISCARDED',
        refCollection: 'edit_suggestions',
        refId: suggestion._id,
        title: 'Đề xuất chỉnh sửa đã bị từ chối',
        body: 'Đề xuất chỉnh sửa của bạn chưa được áp dụng.',
      }),
    ]);

    return {
      success: true,
      message: 'Đã bỏ qua đề xuất chỉnh sửa',
      suggestion: this.serializeSuggestion(suggestion, location),
    };
  }

  private getOldValue(
    location: Location & { _id: Types.ObjectId },
    fieldName: EditSuggestionField,
  ) {
    switch (fieldName) {
      case EditSuggestionField.NAME:
        return location.name ?? null;
      case EditSuggestionField.ADDRESS:
        return location.address ?? null;
      case EditSuggestionField.OPENING_HOURS:
        return location.openingHours ?? null;
      case EditSuggestionField.PHONE:
        return location.phone ?? null;
      case EditSuggestionField.GEO:
        return {
          latitude: location.geo.coordinates[1],
          longitude: location.geo.coordinates[0],
          accuracyMeters: location.accuracyMeters ?? null,
        };
      case EditSuggestionField.FLAG:
        return null;
      default:
        return null;
    }
  }

  private getNewValue(change: EditSuggestionChangeDto, note?: string) {
    switch (change.fieldName) {
      case EditSuggestionField.NAME:
      case EditSuggestionField.ADDRESS:
      case EditSuggestionField.OPENING_HOURS:
      case EditSuggestionField.PHONE:
        return { value: change.textValue?.trim(), note };
      case EditSuggestionField.GEO:
        return { ...change.geoValue, note };
      case EditSuggestionField.FLAG:
        return { value: change.flagValue, note };
      default:
        return { note };
    }
  }

  private async getPendingSuggestionsForRoute(
    target: RoutingTarget,
    vendorId?: Types.ObjectId,
  ) {
    const pendingSuggestions = await this.editSuggestionModel
      .find({ status: EditSuggestionStatus.PENDING })
      .sort({ createdAt: -1 })
      .populate('userId', 'fullName email avatarUrl')
      .lean()
      .exec();

    const locationIds = [
      ...new Set(
        pendingSuggestions.map((suggestion) => String(suggestion.locationId)),
      ),
    ];

    const locations = await this.locationModel
      .find({ _id: { $in: locationIds.map((id) => new Types.ObjectId(id)) } })
      .lean()
      .exec();
    const locationById = new Map(
      locations.map((location) => [String(location._id), location]),
    );

    const routeUpdates: Promise<unknown>[] = [];
    const routed = pendingSuggestions.filter((suggestion) => {
      const location = locationById.get(String(suggestion.locationId));
      if (!location) {
        return false;
      }

      const currentRoute = this.getRoutingTarget(location);
      if (suggestion.routingTarget !== currentRoute) {
        routeUpdates.push(
          this.editSuggestionModel
            .updateOne(
              { _id: suggestion._id },
              { $set: { routingTarget: currentRoute } },
            )
            .exec(),
        );
      }

      if (currentRoute !== target) {
        return false;
      }

      if (
        target === RoutingTarget.VENDOR &&
        (!vendorId || !location.ownerId?.equals(vendorId))
      ) {
        return false;
      }

      return true;
    });

    if (routeUpdates.length) {
      await Promise.all(routeUpdates);
    }

    return routed.map((suggestion) =>
      this.serializeSuggestion(
        { ...suggestion, routingTarget: target },
        locationById.get(String(suggestion.locationId)),
      ),
    );
  }

  private async loadReviewContext(
    reviewerId: Types.ObjectId,
    suggestionId: Types.ObjectId,
  ) {
    const [suggestion, reviewer] = await Promise.all([
      this.editSuggestionModel.findById(suggestionId).exec(),
      this.userModel.findById(reviewerId).select('role status').exec(),
    ]);

    if (!reviewer || reviewer.status === UserStatus.BANNED) {
      throw new ForbiddenException('Tài khoản không thể duyệt đề xuất');
    }

    if (!suggestion) {
      throw new NotFoundException('Không tìm thấy đề xuất chỉnh sửa');
    }

    if (suggestion.status !== EditSuggestionStatus.PENDING) {
      throw new BadRequestException('Đề xuất này đã được xử lý');
    }

    const location = await this.locationModel
      .findById(suggestion.locationId)
      .exec();

    if (!location) {
      throw new NotFoundException('Không tìm thấy địa điểm');
    }

    const currentRoute = this.getRoutingTarget(location);
    if (suggestion.routingTarget !== currentRoute) {
      suggestion.routingTarget = currentRoute;
      await suggestion.save();
    }

    return { suggestion, location, reviewer, currentRoute };
  }

  private async assertCanReview(
    reviewer: UserDocument,
    location: LocationDocument,
    currentRoute: RoutingTarget,
  ) {
    if (currentRoute === RoutingTarget.ADMIN) {
      if (reviewer.role !== UserRole.ADMIN) {
        throw new ForbiddenException(
          'Chỉ Admin được duyệt đề xuất của địa điểm chưa có chủ',
        );
      }
      return;
    }

    if (
      !location.ownerId ||
      !location.ownerId.equals(reviewer._id as Types.ObjectId)
    ) {
      throw new ForbiddenException(
        'Chỉ Vendor sở hữu địa điểm mới được duyệt đề xuất này',
      );
    }
  }

  private async applySuggestionToLocation(
    suggestion: EditSuggestionDocument,
    location: LocationDocument,
    reviewerId: Types.ObjectId,
    reason?: string,
  ) {
    switch (suggestion.fieldName) {
      case EditSuggestionField.NAME:
      case EditSuggestionField.ADDRESS:
        return this.createReApprovalRequest(
          suggestion,
          location,
          reviewerId,
          reason,
        );
      case EditSuggestionField.OPENING_HOURS:
        location.openingHours = this.getSuggestedTextValue(suggestion);
        await location.save();
        return { action: 'UPDATED', message: 'Đã cập nhật giờ mở cửa' };
      case EditSuggestionField.PHONE:
        location.phone = this.getSuggestedTextValue(suggestion);
        await location.save();
        return { action: 'UPDATED', message: 'Đã cập nhật số điện thoại' };
      case EditSuggestionField.GEO:
        return this.applyGeoSuggestion(suggestion, location);
      case EditSuggestionField.FLAG:
        return this.applyFlagSuggestion(suggestion, location);
      default:
        throw new BadRequestException('Trường đề xuất không hợp lệ');
    }
  }

  private async createReApprovalRequest(
    suggestion: EditSuggestionDocument,
    location: LocationDocument,
    reviewerId: Types.ObjectId,
    reason?: string,
  ) {
    const fieldName = suggestion.fieldName as EditSuggestionField;
    const nextValue = this.getSuggestedTextValue(suggestion);
    if (!nextValue) {
      throw new BadRequestException('Giá trị đề xuất không hợp lệ');
    }
    const previousValue =
      fieldName === EditSuggestionField.NAME ? location.name : location.address;

    const oldData: Record<string, unknown> = {
      [fieldName]: previousValue,
    };
    const newData: Record<string, unknown> = {
      [fieldName]: nextValue,
      sourceEditSuggestionId: suggestion._id,
    };

    const existingPendingUpdate = await this.locationRequestModel
      .findOne({
        locationId: location._id,
        type: LocationRequestType.UPDATE,
        status: LocationRequestStatus.PENDING,
      })
      .lean()
      .exec();

    if (existingPendingUpdate) {
      throw new BadRequestException(
        'Địa điểm đang có yêu cầu duyệt lại thông tin nhạy cảm',
      );
    }

    await this.locationRequestModel.create({
      type: LocationRequestType.UPDATE,
      status: LocationRequestStatus.PENDING,
      submittedBy: reviewerId,
      locationId: location._id,
      oldData,
      newData,
      reviewNote: reason,
    });

    location.status = LocationStatus.PENDING_RE_APPROVAL;
    await location.save();

    return {
      action: 'PENDING_RE_APPROVAL',
      message: 'Đề xuất đã được đưa vào hàng chờ duyệt lại',
    };
  }

  private async applyGeoSuggestion(
    suggestion: EditSuggestionDocument,
    location: LocationDocument,
  ) {
    const geoValue = suggestion.newValue as {
      latitude?: number;
      longitude?: number;
      accuracyMeters?: number;
    };

    if (
      typeof geoValue.latitude !== 'number' ||
      typeof geoValue.longitude !== 'number'
    ) {
      throw new BadRequestException('Tọa độ đề xuất không hợp lệ');
    }

    location.geo = {
      type: 'Point',
      coordinates: [geoValue.longitude, geoValue.latitude],
    };
    location.accuracyMeters = geoValue.accuracyMeters;
    await location.save();

    return { action: 'UPDATED', message: 'Đã cập nhật tọa độ' };
  }

  private async applyFlagSuggestion(
    suggestion: EditSuggestionDocument,
    location: LocationDocument,
  ) {
    const flagValue = (suggestion.newValue as { value?: EditSuggestionFlag })
      .value;

    if (flagValue === EditSuggestionFlag.DUPLICATE) {
      location.isSuspectedDuplicate = true;
      await location.save();
      return {
        action: 'PUSHED_TO_DUPLICATE_REVIEW',
        message: 'Đã chuyển sang luồng xác nhận trùng lặp',
      };
    }

    if (
      flagValue === EditSuggestionFlag.PERMANENTLY_CLOSED ||
      flagValue === EditSuggestionFlag.NON_EXISTENT
    ) {
      location.status = LocationStatus.HIDDEN;
      await location.save();
      return {
        action: 'HIDDEN',
        message: 'Đã ẩn địa điểm theo cờ trạng thái',
      };
    }

    throw new BadRequestException('Cờ đề xuất không hợp lệ');
  }

  private async discardUnavailableSuggestion(
    suggestion: EditSuggestionDocument,
    reviewerId: Types.ObjectId,
    location: LocationDocument,
    reason: string,
  ) {
    suggestion.status = EditSuggestionStatus.DISCARDED;
    suggestion.reviewedBy = reviewerId;
    suggestion.reviewedAt = new Date();
    suggestion.reviewReason = reason;
    suggestion.routingTarget = this.getRoutingTarget(location);

    await Promise.all([
      suggestion.save(),
      this.auditLogModel.create({
        actorId: reviewerId,
        action: 'EDIT_SUGGESTION_AUTO_DISCARDED',
        targetCollection: 'edit_suggestions',
        targetId: suggestion._id,
        reason,
        diff: {
          locationId: location._id,
          locationStatus: location.status,
        },
      }),
    ]);

    return {
      success: true,
      message: reason,
      suggestion: this.serializeSuggestion(suggestion, location),
    };
  }

  private getSuggestedTextValue(suggestion: EditSuggestionDocument) {
    return (suggestion.newValue as { value?: string }).value?.trim();
  }

  private getRoutingTarget(location: Pick<Location, 'ownerId'>) {
    return location.ownerId ? RoutingTarget.VENDOR : RoutingTarget.ADMIN;
  }

  private serializeSuggestion(
    suggestion: Partial<EditSuggestion> & { _id: Types.ObjectId },
    location?: Partial<Location> & { _id?: Types.ObjectId },
  ) {
    return {
      id: String(suggestion._id),
      locationId: String(suggestion.locationId),
      location: location
        ? {
            id: String(location._id),
            name: location.name,
            address: location.address,
            status: location.status,
            ownerId: location.ownerId ? String(location.ownerId) : null,
          }
        : null,
      user: suggestion.userId,
      fieldName: suggestion.fieldName,
      oldValue: suggestion.oldValue,
      newValue: suggestion.newValue,
      status: suggestion.status,
      routingTarget: suggestion.routingTarget,
      reviewedBy: suggestion.reviewedBy
        ? String(suggestion.reviewedBy)
        : undefined,
      reviewedAt: suggestion.reviewedAt,
      reviewReason: suggestion.reviewReason,
    };
  }

  private toObjectId(value: string, message: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(message);
    }
    return new Types.ObjectId(value);
  }
}
