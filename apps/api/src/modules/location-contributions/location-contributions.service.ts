import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from 'src/common/schemas/category.schema';
import {
  LocationSource,
  LocationStatus,
  TrustLevel,
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
import {
  SubCategory,
  SubCategoryDocument,
} from 'src/common/schemas/sub-category.schema';
import { User, UserDocument } from 'src/common/schemas/user.schema';
import { DuplicateDetectionService } from '../duplicate-detection/duplicate-detection.service';
import { LocationGeoService } from '../location-geo/location-geo.service';
import { AnalyzeLocationDraftDto } from './dto/analyze-location-draft.dto';
import { SubmitLocationRequestDto } from './dto/submit-location-request.dto';
import { ValidateLocationPositionDto } from './dto/validate-location-position.dto';

const CONTRIBUTION_DAILY_LIMIT = 3;

@Injectable()
export class LocationContributionsService {
  constructor(
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
    @InjectModel(SubCategory.name)
    private subCategoryModel: Model<SubCategoryDocument>,
    @InjectModel(LocationRequest.name)
    private locationRequestModel: Model<LocationRequestDocument>,
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private readonly duplicateDetectionService: DuplicateDetectionService,
    private readonly locationGeoService: LocationGeoService,
  ) {}

  async getContributionOptions() {
    const [categories, subCategories] = await Promise.all([
      this.categoryModel
        .find({ isActive: true })
        .sort({ name: 1 })
        .lean()
        .exec(),
      this.subCategoryModel
        .find({ isActive: true })
        .sort({ name: 1 })
        .lean()
        .exec(),
    ]);

    const subsByCategory = new Map<
      string,
      Array<{ id: string; name: string }>
    >();
    for (const sub of subCategories) {
      const key = String(sub.categoryId);
      const current = subsByCategory.get(key) ?? [];
      current.push({ id: String(sub._id), name: sub.name });
      subsByCategory.set(key, current);
    }

    return {
      success: true,
      categories: categories.map((category) => ({
        id: String(category._id),
        name: category.name,
        description: category.description ?? null,
        tags: subsByCategory.get(String(category._id)) ?? [],
      })),
    };
  }

  async analyzeDraft(dto: AnalyzeLocationDraftDto) {
    const similarLocations =
      await this.duplicateDetectionService.findPossibleDuplicates(
        dto.name,
        dto.latitude,
        dto.longitude,
        dto.categoryId,
      );

    return {
      success: true,
      duplicateWarning: similarLocations.length > 0,
      similarLocations,
    };
  }

  validateContributionPosition(dto: ValidateLocationPositionDto) {
    return this.locationGeoService.validatePinDistance({
      pinLatitude: dto.pinLatitude,
      pinLongitude: dto.pinLongitude,
      deviceLatitude: dto.deviceLatitude,
      deviceLongitude: dto.deviceLongitude,
      accuracyMeters: dto.accuracyMeters,
    });
  }

  async submitContribution(userId: string, dto: SubmitLocationRequestDto) {
    const user = await this.userModel.findById(userId).exec();
    if (!user || user.status === UserStatus.BANNED) {
      throw new BadRequestException('Tai khoan khong the gui dia diem');
    }

    if (user.trustLevel === TrustLevel.RESTRICTED) {
      throw new BadRequestException(
        'Tai khoan dang bi gioi han nen khong the gui dia diem',
      );
    }

    const submittedToday = await this.locationModel.countDocuments({
      submittedBy: new Types.ObjectId(userId),
      source: LocationSource.CUSTOMER,
      submittedAt: { $gte: getStartOfVietnamDay() },
      status: { $in: [LocationStatus.SUBMITTED, LocationStatus.PUBLISHED] },
    });
    if (submittedToday >= CONTRIBUTION_DAILY_LIMIT) {
      throw new BadRequestException(
        'Ban chi duoc gui toi da 3 dia diem moi ngay',
      );
    }

    const category = await this.categoryModel
      .findOne({ _id: dto.categoryId, isActive: true })
      .exec();
    if (!category) {
      throw new BadRequestException('Danh mục không hợp lệ');
    }

    if (dto.tagIds?.length) {
      const tagCount = await this.subCategoryModel.countDocuments({
        _id: { $in: dto.tagIds.map((id) => new Types.ObjectId(id)) },
        categoryId: category._id,
        isActive: true,
      });

      if (tagCount !== dto.tagIds.length) {
        throw new BadRequestException('Danh sách tag không hợp lệ');
      }
    }

    const positionValidation = this.validateContributionPosition({
      pinLatitude: dto.latitude,
      pinLongitude: dto.longitude,
      deviceLatitude: dto.deviceLatitude,
      deviceLongitude: dto.deviceLongitude,
      accuracyMeters: dto.accuracyMeters,
      address: dto.address,
    });

    const duplicateCandidates =
      await this.duplicateDetectionService.findPossibleDuplicates(
        dto.name,
        dto.latitude,
        dto.longitude,
        dto.categoryId,
      );
    const suspectedDuplicateIds = duplicateCandidates.map(
      (item) => new Types.ObjectId(item.id),
    );

    const location = await this.locationModel.create({
      submittedBy: new Types.ObjectId(userId),
      name: dto.name.trim(),
      description: dto.description.trim(),
      address: dto.address.trim(),
      geo: {
        type: 'Point',
        coordinates: [dto.longitude, dto.latitude],
      },
      accuracyMeters: dto.accuracyMeters,
      status: LocationStatus.SUBMITTED,
      isDuplicate: false,
      isSuspectedDuplicate: duplicateCandidates.length > 0,
      source: LocationSource.CUSTOMER,
      categoryId: category._id,
      subCategoryIds: (dto.tagIds ?? []).map((id) => new Types.ObjectId(id)),
      imagesUrls: dto.imageUrls.map((url, index) => ({
        url,
        isCover: index === 0,
        uploadedAt: new Date(),
      })),
      submittedAt: new Date(),
    });

    const newData = {
      name: dto.name,
      description: dto.description,
      categoryId: dto.categoryId,
      tagIds: dto.tagIds ?? [],
      latitude: dto.latitude,
      longitude: dto.longitude,
      address: dto.address,
      imageUrls: dto.imageUrls,
    };

    const request = await this.locationRequestModel.create({
      type: LocationRequestType.CREATE,
      submittedBy: new Types.ObjectId(userId),
      locationId: location._id,
      status: LocationRequestStatus.PENDING,
      oldData: null,
      newData,
      changedFields: Object.keys(newData),
      imageUrls: dto.imageUrls,
      pinLocation: {
        type: 'Point',
        coordinates: [dto.longitude, dto.latitude],
      },
      deviceLocation: {
        type: 'Point',
        coordinates: [dto.deviceLongitude, dto.deviceLatitude],
      },
      deviceDistanceMeters: positionValidation.distanceMeters,
      isPotentialDuplicate: duplicateCandidates.length > 0,
      suspectedDuplicateLocationIds: suspectedDuplicateIds,
    });

    await this.notificationModel.create({
      userId: new Types.ObjectId(userId),
      type: 'LOCATION_REQUEST_PENDING',
      refCollection: 'location_requests',
      refId: request._id,
      title: 'Địa điểm đang chờ phê duyệt',
      body: 'Địa điểm của bạn đang chờ phê duyệt.',
    });

    return {
      success: true,
      message: 'Gửi địa điểm để duyệt thành công',
      request: {
        id: String(request._id),
        status: request.status,
        duplicateWarning: duplicateCandidates.length > 0,
      },
      location: {
        id: String(location._id),
        status: location.status,
      },
    };
  }
}

function getStartOfVietnamDay() {
  const now = new Date();
  const vietnamDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  return new Date(`${vietnamDate}T00:00:00+07:00`);
}
