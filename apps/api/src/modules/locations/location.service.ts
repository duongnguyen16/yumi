import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from 'src/common/schemas/category.schema';
import {
  LocationView,
  LocationViewDocument,
} from 'src/common/schemas/location-view';
import {
  LocationRequest,
  LocationRequestDocument,
  LocationRequestStatus,
  LocationRequestType,
} from 'src/common/schemas/location-request';
import {
  LocationSource,
  LocationStatus,
  TrustEventType,
  TrustLevel,
  UserRole,
  UserStatus,
} from 'src/common/schemas/common.enums';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import {
  AuditLog,
  AuditLogDocument,
} from 'src/common/schemas/audit-log.schema';
import {
  Notification,
  NotificationDocument,
} from 'src/common/schemas/notification.schema';
import { Review, ReviewDocument } from 'src/common/schemas/review.schema';
import {
  SubCategory,
  SubCategoryDocument,
} from 'src/common/schemas/sub-category.schema';
import { User, UserDocument } from 'src/common/schemas/user.schema';
import { AnalyzeLocationDraftDto } from './dto/analyze-location-draft.dto';
import { SubmitLocationRequestDto } from './dto/submit-location-request.dto';
import { ValidateLocationPositionDto } from './dto/validate-location-position.dto';
import { UpdateLocationDto } from './dto/vendor-update-location.dto';
import { ImagesService } from '../images/images.service';
import { TrustEngineService } from '../trust-engine/trust-engine.service';
import { generateSystemCode } from 'src/common/func/generate-code';
import { CreateLocationDto } from './dto/vendor-register-location.dto';
import { CreateLocationRequestDataDto } from './dto/vendor-register-location-request.dto';

const DUPLICATE_DISTANCE_METERS = 50;
const DUPLICATE_SIMILARITY_THRESHOLD = 0.8;
const CONTRIBUTION_DAILY_LIMIT = 3;

type LocationRating = {
  _id: unknown;
  avgRating?: number;
  reviewCount: number;
};

type DuplicateLocationPreview = {
  id: string;
  name: string;
  address: string;
  distanceMeters?: number | null;
  similarity?: number;
  status: LocationStatus;
};

@Injectable()
export class LocationService {
  constructor(
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(LocationView.name)
    private locationViewModel: Model<LocationViewDocument>,
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
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
    private readonly imagesService: ImagesService,
    private readonly trustEngineService: TrustEngineService,
  ) {}

  async getAllLocations() {
    try {
      const locations = await this.locationModel
        .find({ status: LocationStatus.PUBLISHED })
        .exec();
      const geoJson = {
        type: 'FeatureCollection',
        features: locations.map((location) => ({
          type: 'Feature',
          id: location._id,
          geometry: {
            type: 'Point',
            coordinates: [
              location.geo.coordinates[0],
              location.geo.coordinates[1],
            ],
          },
          properties: {
            id: location._id,
            name: location.name,
          },
        })),
      };
      if (!locations || locations.length === 0) {
        return {
          success: false,
          statusCode: 404,
        };
      }
      return {
        success: true,
        locations: geoJson,
      };
    } catch (error) {
      console.log('Error retrieving locations:', error);
      return {
        success: false,
        statusCode: 500,
        message: 'Xảy ra lỗi khi lấy địa điểm',
      };
    }
  }

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
    const similarLocations = await this.findPossibleDuplicates(
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
    const distanceMeters = getDistanceMeters(
      dto.deviceLatitude,
      dto.deviceLongitude,
      dto.pinLatitude,
      dto.pinLongitude,
    );

    return {
      success: true,
      distanceMeters,
      withinRange: distanceMeters <= 50,
      requiresManualPin: (dto.accuracyMeters ?? 0) > 50,
    };
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

    const duplicateCandidates = await this.findPossibleDuplicates(
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

    request.status = LocationRequestStatus.APPROVED;
    request.reviewerId = new Types.ObjectId(reviewerId);
    request.reviewedAt = new Date();
    request.reviewNote = null;

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
            from: LocationStatus.SUBMITTED,
            to: LocationStatus.PUBLISHED,
          },
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

  async getLocationById(locationId: string, userId: string) {
    void userId;
    try {
      const location = await this.locationModel
        .findById(locationId)
        .populate('subCategoryIds')
        .populate('categoryId')
        .exec();
      if (!location) {
        return {
          success: false,
          message: 'Không tìm thấy địa điểm',
          statusCode: 404,
        };
      }
      const rating = await this.reviewModel.aggregate<LocationRating>([
        {
          $match: { locationId: location._id },
        },
        {
          $group: {
            _id: '$locationId',
            avgRating: { $avg: '$rating' },
            reviewCount: { $sum: 1 },
          },
        },
      ]);
      return {
        success: true,
        location: {
          ...location.toObject(),
          rating: rating[0],
        },
      };
    } catch (error) {
      console.log('Error retrieving location by ID:', error);
      return {
        success: false,
        message: 'Xảy ra lỗi khi lấy thông tin địa điểm',
        statusCode: 500,
      };
    }
  }

  async viewCount(userId: string, locationId: string) {
    try {
      const now = new Date();
      const viewDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now);
      await this.locationViewModel.create({
        locationId,
        userId,
        viewDate,
        viewedAt: now,
      });
      await this.locationModel.findByIdAndUpdate(locationId, {
        $inc: { viewCount: 1 },
      });
      return {
        success: true,
        counted: true,
      };
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return {
          success: true,
          counted: false,
        };
      }
      throw error;
    }
  }

  async searchLocation(
    limit: number,
    page: number,
    lat: number,
    lng: number,
    keyword?: string,
    categoryId?: string,
    subCategoryId?: string,
  ) {
    try {
      const filter: any = {
        status: 'PUBLISHED',
      };
      if (keyword) {
        const regex = keyword.trim();
        filter.$or = [
          { name: { $regex: regex, $options: 'i' } },
          { description: { $regex: regex, $options: 'i' } },
          { address: { $regex: regex, $options: 'i' } },
        ];
      }
      if (categoryId) {
        filter.categoryId = new Types.ObjectId(categoryId);
      }
      if (subCategoryId) {
        const ids = subCategoryId
          .split(',')
          .map((id) => new Types.ObjectId(id));
        if (ids.length > 0) {
          filter.subCategoryIds = {
            $in: ids,
          };
        }
      }
      console.log(filter);
      const skip = (page - 1) * limit;
      const result = await this.locationModel.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [lng, lat],
            },
            distanceField: 'distance',
            spherical: true,
            query: filter,
          },
        },

        {
          $facet: {
            locations: [{ $skip: skip }, { $limit: limit }],
            total: [{ $count: 'count' }],
          },
        },
      ]);
      const locations = result[0].locations || [];
      const total = result[0].total[0]?.count || 0;

      return {
        success: true,
        locations,
        total,
        page,
        limit,
        hasMore: page * limit < total,
      };
    } catch (error) {
      console.log('Error occur at searchLocation: ', error);
    }
  }

  private async findPossibleDuplicates(
    name: string,
    latitude?: number,
    longitude?: number,
    categoryId?: string,
  ): Promise<DuplicateLocationPreview[]> {
    const query: Record<string, unknown> = {
      status: { $in: [LocationStatus.PUBLISHED, LocationStatus.SUBMITTED] },
    };

    if (categoryId) {
      query.categoryId = new Types.ObjectId(categoryId);
    }

    if (latitude !== undefined && longitude !== undefined) {
      query.geo = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: DUPLICATE_DISTANCE_METERS,
        },
      };
    } else {
      query.name = { $regex: escapeRegex(name.trim()), $options: 'i' };
    }

    const locations = await this.locationModel
      .find(query)
      .limit(20)
      .lean()
      .exec();

    return locations
      .map((location) => {
        const distanceMeters =
          latitude !== undefined && longitude !== undefined
            ? getDistanceMeters(
                latitude,
                longitude,
                location.geo.coordinates[1],
                location.geo.coordinates[0],
              )
            : null;
        const similarity = getNameSimilarity(name, location.name);

        return {
          id: String(location._id),
          name: location.name,
          address: location.address,
          status: location.status,
          distanceMeters,
          similarity,
        };
      })
      .filter(
        (location) =>
          location.similarity >= DUPLICATE_SIMILARITY_THRESHOLD &&
          (location.distanceMeters === null ||
            location.distanceMeters <= DUPLICATE_DISTANCE_METERS),
      )
      .slice(0, 5);
  }

  async updateLocation(
    id: string,
    updateData: UpdateLocationDto,
    userId: string,
    files?: Express.Multer.File[],
  ) {
    try {
      const location = await this.locationModel.findById(id).exec();
      if (!location) {
        return {
          success: false,
          message: 'Không tìm thấy địa điểm',
          statusCode: 404,
        };
      }
      let reviewRequiredData = {};
      let nonReviewData = {};
      if (updateData?.name || updateData?.address) {
        reviewRequiredData = {
          name: updateData.name ?? null,
          address: updateData.address ?? null,
          geo: updateData.coordinates ?? null,
        };
        const cleanData = Object.fromEntries(
          Object.entries(updateData).filter(
            ([_, value]) => value !== null && value !== undefined,
          ),
        );
        const oldData: Record<string, unknown> = {};
        if ('name' in cleanData) {
          oldData.name = location.name;
        }

        if ('address' in cleanData) {
          oldData.address = location.address;
        }

        if ('coordinates' in cleanData) {
          oldData.coordinates = location.geo.coordinates;
        }
        const now = new Date();
        const urls = await this.imagesService.uploadMultiMedia(id, files ?? []);
        const locationRequest = await this.locationRequestModel.create({
          type: LocationRequestType.UPDATE,
          submittedBy: userId,
          locationId: id,
          status: LocationRequestStatus.PENDING_RE_APPROVAL,
          oldData,
          newData: cleanData,
          changedFields: Object.keys(cleanData),
          verificationProof: {
            proofUrls: urls.map((url) => url.url),
            capturedAt: now,
          },
        });
      }
      nonReviewData = {
        openingHours: updateData.openingHours ?? null,
        description: updateData.description ?? null,
        categoryId: updateData.categoryId ?? null,
        subCategoryIds: updateData.subCategoryIds ?? null,
      };
      console.log('nonReviewData:', nonReviewData);
      const cleanNonReviewData = Object.fromEntries(
        Object.entries(nonReviewData).filter(
          ([_, value]) => value !== null && value !== undefined,
        ),
      );
      location.set(cleanNonReviewData);
      await location.save();
      return {
        success: true,
        message: 'Cập nhật địa điểm thành công',
        location,
      };
    } catch (error) {
      console.error('Error occurred at updateLocation:', error);
      return {
        success: false,
        message: 'Xảy ra lỗi khi cập nhật địa điểm',
        statusCode: 500,
      };
    }
  }
  generateSystemCode() {
    return generateSystemCode();
  }

  async registerLocation(
    userId: string,
    requestDataParsed: CreateLocationRequestDataDto,
    locationDataParsed: CreateLocationDto,
    files?: {
      videoFiles?: Express.Multer.File[];
      licenseFiles?: Express.Multer.File[];
      imageFiles?: Express.Multer.File[];
    },
  ) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng');
      }
      const uploadedImages = await this.imagesService.uploadMultiMedia(
        'vendor-verification',
        files?.imageFiles ?? [],
      );
      const uploadedLicenseFiles = await this.imagesService.uploadMultiMedia(
        'vendor-verification',
        files?.licenseFiles ?? [],
      );
      const uploadedVideoFiles = await this.imagesService.uploadMultiMedia(
        'vendor-verification',
        files?.videoFiles ?? [],
      );
      const location = await this.locationModel.create({
        submittedBy: new Types.ObjectId(userId),
        name: locationDataParsed.name,
        description: locationDataParsed.description,
        address: locationDataParsed.address,
        geo: {
          type: 'Point',
          coordinates: [
            locationDataParsed.longitude,
            locationDataParsed.latitude,
          ],
        },
        accuracyMeters: locationDataParsed.accuracyMeters,
        openingHours: locationDataParsed.openingHours,
        status: LocationStatus.SUBMITTED,
        source:
          user.role === UserRole.VENDOR
            ? LocationSource.VENDOR
            : LocationSource.CUSTOMER,
        categoryId: new Types.ObjectId(locationDataParsed.categoryId),
        subCategoryIds: locationDataParsed.tagIds
          ? locationDataParsed.tagIds.map((id) => new Types.ObjectId(id))
          : [],
        submittedAt: new Date(),
      });
      const locationRequest = await this.locationRequestModel.create({
        type: LocationRequestType.CREATE,
        status: LocationRequestStatus.PENDING,
        submittedBy: new Types.ObjectId(userId),
        locationId: location._id,
        newData: requestDataParsed.newData,
        isPotentialDuplicate: requestDataParsed.isPotentialDuplicate,
        suspectedDuplicateLocationIds:
          requestDataParsed?.suspectedDuplicateLocationIds
            ? requestDataParsed.suspectedDuplicateLocationIds.map(
                (id) => new Types.ObjectId(id),
              )
            : [],
        pinLocation: {
          type: 'Point',
          coordinates: [
            requestDataParsed.pinLongitude,
            requestDataParsed.pinLatitude,
          ],
        },
        deviceLocation: {
          type: 'Point',
          coordinates: [
            requestDataParsed.deviceLongitude,
            requestDataParsed.deviceLatitude,
          ],
        },
        deviceDistanceMeters: getDistanceMeters(
          requestDataParsed.deviceLatitude,
          requestDataParsed.deviceLongitude,
          requestDataParsed.pinLatitude,
          requestDataParsed.pinLongitude,
        ),
        verificationProof: {
          proofUrls: [
            ...uploadedImages.map((url) => url.url),
            ...uploadedVideoFiles.map((url) => url.url),
          ],
          licenseUrls: (uploadedLicenseFiles || []).map((url) => url.url),
          systemCode: requestDataParsed.systemCode,
          capturedAt: requestDataParsed.captureAt,
        },
      });
      return {
        success: true,
        message: 'Gửi địa điểm để duyệt thành công',
      };
    } catch (error) {
      console.error('Error in registerLocation service:', error);
      return {
        success: false,
        message: 'Xảy ra lỗi khi đăng ký địa điểm',
        statusCode: 500,
      };
    }
  }
}

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadius * c);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function normalizePlaceName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getNameSimilarity(left: string, right: string) {
  const first = normalizePlaceName(left);
  const second = normalizePlaceName(right);

  if (!first || !second) {
    return 0;
  }

  if (first === second) {
    return 1;
  }

  const distance = getLevenshteinDistance(first, second);
  return 1 - distance / Math.max(first.length, second.length);
}

function getLevenshteinDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= right.length; j += 1) {
      const substitutionCost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + substitutionCost,
      );
    }

    for (let j = 0; j <= right.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[right.length];
}
