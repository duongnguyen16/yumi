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
  UserStatus,
} from 'src/common/schemas/common.enums';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import {
  Notification,
  NotificationDocument,
} from 'src/common/schemas/notification.schema';
import { User, UserDocument } from 'src/common/schemas/user.schema';
import {
  CreateEditSuggestionDto,
  EditSuggestionChangeDto,
  EditSuggestionField,
} from './dto/create-edit-suggestion.dto';
import { EditSuggestionApplyService } from './edit-suggestion-apply.service';
import { EditSuggestionRoutingService } from './edit-suggestion-routing.service';

@Injectable()
export class EditSuggestionsService {
  constructor(
    @InjectModel(EditSuggestion.name)
    private readonly editSuggestionModel: Model<EditSuggestionDocument>,
    @InjectModel(Location.name)
    private readonly locationModel: Model<LocationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
    private readonly routingService: EditSuggestionRoutingService,
    private readonly applyService: EditSuggestionApplyService,
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

    const routingTarget = this.routingService.getRoutingTarget(location);

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
    const routedSuggestions =
      await this.routingService.getPendingSuggestionsForRoute(
        RoutingTarget.ADMIN,
      );

    return {
      success: true,
      suggestions: routedSuggestions.map(({ suggestion, location }) =>
        this.serializeSuggestion(suggestion, location),
      ),
    };
  }

  async getVendorInbox(userId: string) {
    const userObjectId = this.toObjectId(userId, 'Người dùng không hợp lệ');
    const routedSuggestions =
      await this.routingService.getPendingSuggestionsForRoute(
        RoutingTarget.VENDOR,
        userObjectId,
      );

    return {
      success: true,
      suggestions: routedSuggestions.map(({ suggestion, location }) =>
        this.serializeSuggestion(suggestion, location),
      ),
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
      await this.routingService.loadReviewContext(
        reviewerObjectId,
        suggestionObjectId,
      );

    this.routingService.assertCanReview(reviewer, location, currentRoute);

    if (location.status !== LocationStatus.PUBLISHED) {
      return this.discardUnavailableSuggestion(
        suggestion,
        reviewerObjectId,
        location,
        'Địa điểm không còn hiển thị để áp dụng đề xuất',
      );
    }

    const oldStatus = location.status;
    const applyResult = await this.applyService.applySuggestionToLocation(
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
      await this.routingService.loadReviewContext(
        reviewerObjectId,
        suggestionObjectId,
      );

    this.routingService.assertCanReview(reviewer, location, currentRoute);

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
    suggestion.routingTarget = this.routingService.getRoutingTarget(location);

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
