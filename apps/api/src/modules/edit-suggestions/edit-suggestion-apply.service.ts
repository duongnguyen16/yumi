import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LocationStatus } from 'src/common/schemas/common.enums';
import { EditSuggestionDocument } from 'src/common/schemas/edit-suggestion.schema';
import {
  LocationRequest,
  LocationRequestDocument,
  LocationRequestStatus,
  LocationRequestType,
} from 'src/common/schemas/location-request';
import { LocationDocument } from 'src/common/schemas/location.schema';
import {
  EditSuggestionField,
  EditSuggestionFlag,
} from './dto/create-edit-suggestion.dto';

@Injectable()
export class EditSuggestionApplyService {
  constructor(
    @InjectModel(LocationRequest.name)
    private readonly locationRequestModel: Model<LocationRequestDocument>,
  ) {}

  async applySuggestionToLocation(
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
        status: {
          $in: [
            LocationRequestStatus.PENDING,
            LocationRequestStatus.PENDING_RE_APPROVAL,
          ],
        },
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
      status: LocationRequestStatus.PENDING_RE_APPROVAL,
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

  private getSuggestedTextValue(suggestion: EditSuggestionDocument) {
    return (suggestion.newValue as { value?: string }).value?.trim();
  }
}
