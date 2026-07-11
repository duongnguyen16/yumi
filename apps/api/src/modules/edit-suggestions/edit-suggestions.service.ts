import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
import {
  Location,
  LocationDocument,
} from 'src/common/schemas/location.schema';
import { User, UserDocument } from 'src/common/schemas/user.schema';
import {
  CreateEditSuggestionDto,
  EditSuggestionChangeDto,
  EditSuggestionField,
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

    const routingTarget = location.ownerId
      ? RoutingTarget.VENDOR
      : RoutingTarget.ADMIN;

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
      suggestions: suggestions.map((suggestion) => ({
        id: String(suggestion._id),
        locationId,
        fieldName: suggestion.fieldName,
        oldValue: suggestion.oldValue,
        newValue: suggestion.newValue,
        status: suggestion.status,
        routingTarget: suggestion.routingTarget,
      })),
    };
  }

  private getOldValue(
    location: Location & { _id: Types.ObjectId },
    fieldName: EditSuggestionField,
  ) {
    switch (fieldName) {
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

  private toObjectId(value: string, message: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(message);
    }
    return new Types.ObjectId(value);
  }
}
