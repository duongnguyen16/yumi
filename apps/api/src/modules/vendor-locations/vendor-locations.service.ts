import {
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcryptjs';
import { ClientSession, Model, Types, Connection } from 'mongoose';
import { generateSystemCode } from 'src/common/func/generate-code';
import {
  LocationSource,
  LocationStatus,
  ReviewStatus,
  UserRole,
} from 'src/common/schemas/common.enums';
import { GeoPoint } from 'src/common/schemas/common.embedded';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import {
  LocationRequest,
  LocationRequestDocument,
  LocationRequestStatus,
  LocationRequestType,
} from 'src/common/schemas/location-request';
import {
  Otp,
  OtpChannel,
  OtpDocument,
  OtpPurpose,
  OtpStatus,
} from 'src/common/schemas/otp.schema';
import { User } from 'src/common/schemas/user.schema';
import { SmsService } from '../auth/services/sms.service';
import { ImagesService } from '../images/images.service';
import { DuplicateDetectionService } from '../duplicate-detection/duplicate-detection.service';
import { LocationGeoService } from '../location-geo/location-geo.service';
import { CreateLocationDto } from './dto/vendor-register-location.dto';
import { CreateLocationRequestDataDto } from './dto/vendor-register-location-request.dto';
import { UpdateLocationDto } from './dto/vendor-update-location.dto';
import { isUnderHold } from 'src/common/ownership/hold.util';
import { Review, ReviewDocument } from 'src/common/schemas/review.schema';
import {
  Notification,
  NotificationDocument,
} from 'src/common/schemas/notification.schema';

type ReviewRequiredData = {
  name?: string | null;
  address?: string | null;
  geo?: GeoPoint | null;
  deviceLocation?: GeoPoint | null;
  deviceDistanceMeters?: number | null;
  isPotentialDuplicate?: boolean;
  suspectedDuplicateLocationIds?: Types.ObjectId[];
};

type LocationImageManagementError = {
  success: false;
  message: string;
  statusCode: number;
};

type LocationImageManagementResult =
  | LocationImageManagementError
  | {
      success: true;
      message: string;
      images?: Array<{ url: string; isCover: boolean; uploadedAt: Date }>;
      imageUrl?: string;
    };

type OwnedLocationResult =
  { location: LocationDocument } | { error: LocationImageManagementError };

const PENDING_SENSITIVE_UPDATE_MESSAGE =
  'Địa điểm đang có yêu cầu duyệt lại thông tin nhạy cảm';

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}

@Injectable()
export class VendorLocationsService {
  constructor(
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
    @InjectModel(LocationRequest.name)
    private locationRequestModel: Model<LocationRequestDocument>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    @InjectModel(Otp.name) private otpModel: Model<OtpDocument>,
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    private readonly imagesService: ImagesService,
    private readonly smsService: SmsService,
    private readonly locationGeoService: LocationGeoService,
    private readonly duplicateDetectionService: DuplicateDetectionService,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  //kiểm tra số điện thoại đã xác minh otp chưa bằng cách check trong schema otp, thêm validate khoảng cách 50m khi cập nhập vị trí
  async updateLocation(
    id: string,
    updateData: UpdateLocationDto,
    userId: string,
    files?: Express.Multer.File[],
  ) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        await session.abortTransaction();
        return {
          success: false,
          message: 'Người dùng không tồn tại',
          statusCode: 404,
        };
      }
      const location = await this.locationModel.findById(id).exec();
      if (!location) {
        await session.abortTransaction();
        return {
          success: false,
          message: 'Không tìm thấy địa điểm',
          statusCode: 404,
        };
      }
      if (
        !location.ownerId ||
        !location.ownerId.equals(new Types.ObjectId(userId))
      ) {
        await session.abortTransaction();
        return {
          success: false,
          message: 'Bạn không có quyền chỉnh sửa địa điểm này',
          statusCode: 403,
        };
      }
      const isHold = isUnderHold(location.toObject());
      const changesCoreInfo =
        updateData.name !== undefined ||
        updateData.address !== undefined ||
        updateData.categoryId !== undefined ||
        updateData.subCategoryIds !== undefined;
      if (isHold && changesCoreInfo) {
        await session.abortTransaction();
        return {
          success: false,
          message:
            'Địa điểm đang bị tạm giữ, không thể thay đổi thông tin cốt lõi',
          statusCode: 403,
        };
      }
      const requiresReapproval = Boolean(
        updateData?.name || updateData?.address,
      );
      let reviewRequiredData: ReviewRequiredData = {};
      if (requiresReapproval) {
        const existingPendingUpdate = await this.locationRequestModel
          .findOne({
            locationId: new Types.ObjectId(id),
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
          await session.abortTransaction();
          return {
            success: false,
            message: PENDING_SENSITIVE_UPDATE_MESSAGE,
            statusCode: 409,
          };
        }
        reviewRequiredData = {
          name: updateData.name ?? null,
          address: updateData.address ?? null,
          geo:
            updateData.pinLatitude && updateData.pinLongitude
              ? {
                  type: 'Point',
                  coordinates: [
                    updateData.pinLongitude,
                    updateData.pinLatitude,
                  ],
                }
              : null,
          deviceLocation:
            updateData.deviceLatitude && updateData.deviceLongitude
              ? {
                  type: 'Point',
                  coordinates: [
                    updateData.deviceLongitude,
                    updateData.deviceLatitude,
                  ],
                }
              : null,
        };
        if (updateData?.address) {
          reviewRequiredData.deviceDistanceMeters =
            this.locationGeoService.getDistanceMeters(
              updateData.deviceLatitude ?? 0,
              updateData.deviceLongitude ?? 0,
              updateData.pinLatitude ?? 0,
              updateData.pinLongitude ?? 0,
            );
          if (reviewRequiredData.deviceDistanceMeters > 200) {
            await session.abortTransaction();
            return {
              success: false,
              message:
                'Bạn phải đứng trong phạm vi 200m mới được cập nhật địa điểm',
              statusCode: 400,
            };
          }
        }
        const checkDuplicate =
          await this.duplicateDetectionService.findPossibleDuplicates(
            updateData?.name || location.name,
            updateData?.pinLatitude || location.geo.coordinates[1],
            updateData?.pinLongitude || location.geo.coordinates[0],
            updateData?.categoryId || location.categoryId.toString(),
          );
        if (checkDuplicate.length > 0) {
          reviewRequiredData.isPotentialDuplicate = true;
          reviewRequiredData.suspectedDuplicateLocationIds = checkDuplicate.map(
            (item) => new Types.ObjectId(item.id),
          );
        }
        const cleanData = Object.fromEntries(
          Object.entries(reviewRequiredData).filter(
            ([_, value]) => value !== null && value !== undefined,
          ),
        );
        const oldData: Record<string, unknown> = {};
        if ('name' in cleanData) {
          oldData.name = location.name;
        }

        if ('address' in cleanData) {
          oldData.address = location.address;
          oldData.coordinates = location.geo.coordinates;
        }
        const urls = await this.imagesService.uploadMultiMedia(id, files ?? []);
        await this.locationRequestModel.create(
          [
            {
              type: LocationRequestType.UPDATE,
              submittedBy: userId,
              locationId: id,
              status: LocationRequestStatus.PENDING_RE_APPROVAL,
              oldData,
              newData: cleanData,
              deviceLocation: reviewRequiredData.deviceLocation ?? null,
              pinLocation: reviewRequiredData.geo ?? null,
              deviceDistanceMeters:
                reviewRequiredData.deviceDistanceMeters ?? null,
              verificationProof: {
                imageUrls: urls.map((url) => url.url),
              },
              isPotentialDuplicate:
                reviewRequiredData.isPotentialDuplicate ?? false,
              suspectedDuplicateLocationIds:
                reviewRequiredData.suspectedDuplicateLocationIds ?? [],
            },
          ],
          { session: session },
        );
      }
      const nonReviewData = {
        openingHours: updateData.openingHours ?? null,
        description: updateData.description ?? null,
        categoryId: updateData.categoryId ?? null,
        subCategoryIds: updateData.subCategoryIds ?? null,
        phone: updateData.phone ?? null,
      };
      if (nonReviewData.phone) {
        const checkPhoneVerified = await this.otpModel.findOne({
          userId: new Types.ObjectId(userId),
          purpose: OtpPurpose.CHANGE_PHONE,
          recipient: nonReviewData.phone,
          status: OtpStatus.VERIFIED,
        });
        if (!checkPhoneVerified) {
          await session.abortTransaction();
          return {
            success: false,
            message: 'Số điện thoại chưa được xác minh',
            statusCode: 400,
          };
        }
      }
      const cleanNonReviewData = Object.fromEntries(
        Object.entries(nonReviewData).filter(
          ([_, value]) => value !== null && value !== undefined,
        ),
      );
      location.set(cleanNonReviewData);
      await location.save({ session: session });
      await session.commitTransaction();
      return {
        success: true,
        requiresReapproval,
        message: requiresReapproval
          ? 'Đã gửi thay đổi để Admin duyệt. Địa điểm vẫn hiển thị thông tin cũ trong thời gian chờ duyệt.'
          : 'Cập nhật địa điểm thành công',
        location,
      };
    } catch (error) {
      await session.abortTransaction();
      if (isDuplicateKeyError(error)) {
        return {
          success: false,
          message: PENDING_SENSITIVE_UPDATE_MESSAGE,
          statusCode: 409,
        };
      }
      console.error('Error occurred at updateLocation:', error);
      return {
        success: false,
        message: 'Xảy ra lỗi khi cập nhật địa điểm',
        statusCode: 500,
      };
    } finally {
      await session.endSession();
    }
  }

  async generateSystemCode(userId: string) {
    try {
      const systemCode = generateSystemCode();
      const user = await this.userModel.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'Không tìm thấy người dùng',
          statusCode: 404,
        };
      }
      const findExits = await this.otpModel.find({
        userId: new Types.ObjectId(userId),
        purpose: OtpPurpose.VERIFY_LOCATION,
        status: OtpStatus.PENDING,
      });
      if (findExits.length > 0) {
        await this.otpModel.updateMany(
          {
            userId: new Types.ObjectId(userId),
            purpose: OtpPurpose.VERIFY_LOCATION,
            status: OtpStatus.PENDING,
          },
          {
            $set: {
              status: OtpStatus.CANCELLED,
            },
          },
        );
      }
      const otpHash = bcrypt.hashSync(systemCode, 10);
      const otpExpire = new Date(Date.now() + 10 * 60 * 1000);
      await this.otpModel.create({
        userId: new Types.ObjectId(userId),
        purpose: OtpPurpose.VERIFY_LOCATION,
        channel: OtpChannel.SYSTEM,
        recipient: user.phone,
        otpHash,
        expiresAt: otpExpire,
      });
      return {
        success: true,
        message: 'Tạo mã hệ thống thành công',
        systemCode,
      };
    } catch (error) {
      console.log('Error in generateSystemCode service:', error);
      return {
        success: false,
        message: 'Xảy ra lỗi khi tạo mã hệ thống',
        statusCode: 500,
      };
    }
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
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        await session.abortTransaction();
        return {
          success: false,
          message: 'Không tìm thấy người dùng',
          statusCode: 404,
        };
      }
      if (user.phoneVerified === false) {
        await session.abortTransaction();
        return {
          success: false,
          message: 'Số điện thoại chưa được xác minh',
          statusCode: 400,
        };
      }
      const existingRequest = await this.locationRequestModel
        .findOne({
          submittedBy: new Types.ObjectId(userId),
          ownershipRequested: true,
          status: LocationRequestStatus.PENDING,
          'verificationProof.systemCode': requestDataParsed.systemCode,
        })
        .lean()
        .exec();
      if (existingRequest) {
        await session.abortTransaction();
        return {
          success: true,
          message: 'Hồ sơ đăng ký địa điểm đã được gửi trước đó',
          statusCode: 200,
          alreadySubmitted: true,
        };
      }
      const checkOtp = await this.otpModel.findOne({
        userId: new Types.ObjectId(userId),
        purpose: OtpPurpose.VERIFY_LOCATION,
        status: OtpStatus.PENDING,
        expiresAt: { $gt: new Date() },
      });
      if (!checkOtp) {
        await session.abortTransaction();
        return {
          success: false,
          message: 'Mã hệ thống không hợp lệ hoặc đã hết hạn',
          statusCode: 400,
        };
      }
      const isMatch = await bcrypt.compare(
        requestDataParsed.systemCode,
        checkOtp.otpHash,
      );
      if (!isMatch) {
        await session.abortTransaction();
        return {
          success: false,
          message: 'Mã hệ thống không hợp lệ',
          statusCode: 400,
        };
      }
      await this.otpModel.updateOne(
        { _id: checkOtp._id },
        { verifiedAt: new Date(), status: OtpStatus.VERIFIED },
        { session: session },
      );
      const deviceDistanceMeters = this.locationGeoService.validatePinDistance({
        deviceLatitude: requestDataParsed.deviceLatitude,
        deviceLongitude: requestDataParsed.deviceLongitude,
        pinLatitude: requestDataParsed.pinLatitude,
        pinLongitude: requestDataParsed.pinLongitude,
      });
      if (!deviceDistanceMeters.withinRange) {
        await session.abortTransaction();
        return {
          success: false,
          message: 'Bạn phải đứng trong phạm vi 500m mới được đăng ký địa điểm',
          statusCode: 400,
        };
      }
      const duplicateCandidates =
        await this.duplicateDetectionService.findPossibleDuplicates(
          locationDataParsed.name,
          locationDataParsed.latitude,
          locationDataParsed.longitude,
          locationDataParsed.categoryId,
        );
      const uploadedImages = await this.imagesService.uploadMultiMedia(
        'vendor-verification',
        files?.imageFiles ?? [],
      );
      let uploadedLicenseFiles: { url: string }[] = [];
      const licenseFiles = files?.licenseFiles ?? [];
      if (licenseFiles.length > 0) {
        uploadedLicenseFiles = await this.imagesService.uploadMultiMedia(
          'vendor-verification',
          files?.licenseFiles ?? [],
        );
      }
      const uploadedVideoFiles = await this.imagesService.uploadMultiMedia(
        'vendor-verification',
        files?.videoFiles ?? [],
      );
      const location = await this.locationModel.create(
        [
          {
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
            subCategoryIds: locationDataParsed.subCategoryIds
              ? locationDataParsed.subCategoryIds.map(
                  (id) => new Types.ObjectId(id),
                )
              : [],
            submittedAt: new Date(),
          },
        ],
        { session: session },
      );
      const request = await this.locationRequestModel.create(
        [
          {
            type: LocationRequestType.CREATE,
            status: LocationRequestStatus.PENDING,
            submittedBy: new Types.ObjectId(userId),
            locationId: location[0]._id,
            ownershipRequested: true,
            newData: {
              ...locationDataParsed,
            },
            isPotentialDuplicate: duplicateCandidates.length > 0,
            suspectedDuplicateLocationIds: duplicateCandidates.map(
              (item) => new Types.ObjectId(item.id),
            ),
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
            deviceDistanceMeters: deviceDistanceMeters.distanceMeters,
            verificationProof: {
              imageUrls: uploadedImages.map((d) => d.url),
              videoUrls: uploadedVideoFiles.map((d) => d.url),
              licenseUrls: (uploadedLicenseFiles || []).map((url) => url.url),
              systemCode: requestDataParsed.systemCode,
            },
          },
        ],
        { session: session },
      );
      await this.notificationModel.create(
        [
          {
            userId: new Types.ObjectId(userId),
            type: 'LOCATION_REQUEST_PENDING',
            refCollection: 'location_requests',
            refId: request[0]._id,
            title: 'Địa điểm đang chờ phê duyệt',
            body: 'Địa điểm của bạn đang chờ phê duyệt.',
          },
        ],
        { session },
      );
      await session.commitTransaction();
      return {
        success: true,
        message: 'Gửi địa điểm để duyệt thành công',
        statusCode: 200,
      };
    } catch (error) {
      await session.abortTransaction();
      console.error('Error in registerLocation service:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Xảy ra lỗi khi đăng ký địa điểm');
    } finally {
      await session.endSession();
    }
  }

  async listOwnedLocations(userId: string) {
    try {
      const locations = await this.locationModel
        .find({ ownerId: new Types.ObjectId(userId) })
        .sort({ updatedAt: -1 })
        .lean()
        .exec();
      return {
        success: true,
        data: locations,
      };
    } catch (error) {
      console.error('Error in listOwnedLocations:', error);
      return {
        success: false,
        message: 'Xảy ra lỗi khi lấy danh sách địa điểm',
        statusCode: 500,
      };
    }
  }

  async sendOtpUpdatePhone(
    userId: string,
    locationId: string,
    newPhone: string,
  ) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'Không tìm thấy người dùng',
          statusCode: 404,
        };
      }
      const location = await this.locationModel.findById(locationId);
      if (!location) {
        return {
          success: false,
          message: 'Không tìm thấy địa điểm',
          statusCode: 404,
        };
      }
      if (
        !location.ownerId ||
        !location.ownerId.equals(new Types.ObjectId(userId))
      ) {
        return {
          success: false,
          message: 'Bạn không có quyền chỉnh sửa địa điểm này',
          statusCode: 403,
        };
      }
      const twoMinuteAgo = new Date(Date.now() - 2 * 60 * 1000);
      const checkLimit = await this.otpModel.find({
        userId: userId,
        createdAt: { $gte: twoMinuteAgo, $lte: new Date() },
      });
      if (checkLimit.length > 0) {
        return {
          success: false,
          message: 'Vui lòng thử lại sau 2 phút',
          statusCode: 429,
        };
      }
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpire = new Date(Date.now() + 5 * 60 * 1000);
      const otpHash = await bcrypt.hash(otp, 10);
      await this.otpModel.create({
        userId: new Types.ObjectId(userId),
        purpose: OtpPurpose.CHANGE_PHONE,
        channel: OtpChannel.SMS,
        recipient: newPhone,
        otpHash,
        expiresAt: otpExpire,
      });
      await this.smsService.sendOtp(newPhone, otp);
      return {
        success: true,
        message: 'OTP đã được gửi thành công',
      };
    } catch (error) {
      console.error('Error in sendOtpUpdatePhone service:', error);
      return {
        success: false,
        message: 'Xảy ra lỗi khi gửi OTP',
        statusCode: 500,
      };
    }
  }

  async verifyOtpUpdatePhone(userId: string, locationId: string, otp: string) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'Không tìm thấy người dùng',
          statusCode: 404,
        };
      }
      const location = await this.locationModel.findById(locationId);
      if (!location) {
        return {
          success: false,
          statusCode: 404,
          message: 'Không tìm thấy địa điểm',
        };
      }
      if (
        !location.ownerId ||
        !location.ownerId.equals(new Types.ObjectId(userId))
      ) {
        return {
          success: false,
          statusCode: 403,
          message: 'Bạn không có quyền chỉnh sửa địa điểm này',
        };
      }
      const otpRecord = await this.otpModel
        .findOne({
          userId: userId,
          purpose: OtpPurpose.CHANGE_PHONE,
          status: OtpStatus.PENDING,
        })
        .sort({ createdAt: -1 });
      if (!otpRecord) {
        return {
          success: false,
          message: 'Không tìm thấy OTP',
          statusCode: 404,
        };
      }
      if (otpRecord.expiresAt < new Date()) {
        return {
          success: false,
          message: 'OTP đã hết hạn',
          statusCode: 400,
        };
      }
      const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
      if (!isMatch) {
        return {
          success: false,
          message: 'OTP không hợp lệ',
          statusCode: 400,
        };
      }
      await this.otpModel.updateOne(
        { _id: otpRecord._id },
        { verifiedAt: new Date(), status: OtpStatus.VERIFIED },
      );
      return {
        success: true,
        message: 'OTP đã được xác thực thành công',
      };
    } catch (error) {
      console.error('Error in verifyOtpUpdatePhone service:', error);
      return {
        success: false,
        message: 'Xảy ra lỗi khi xác thực OTP',
        statusCode: 500,
      };
    }
  }

  async replyReview(vendorId: string, content: string, reviewId: string) {
    try {
      const user = await this.userModel.findById(vendorId);
      if (!user) {
        return {
          success: false,
          message: 'Không tìm thấy người dùng',
          statusCode: 404,
        };
      }
      const review = await this.reviewModel.findById(reviewId);

      if (!review) {
        return {
          success: false,
          message: 'Không tìm thấy đánh giá',
          statusCode: 404,
        };
      }
      if (review.status !== ReviewStatus.PUBLISHED) {
        return {
          success: false,
          message: 'Đánh giá chưa được xuất bản',
          statusCode: 400,
        };
      }
      if (review.reply) {
        return {
          success: false,
          message: 'Đánh giá đã có phản hồi',
          statusCode: 400,
        };
      }
      if (!review.locationId) {
        return {
          success: false,
          message: 'Đánh giá không có địa điểm liên quan',
          statusCode: 400,
        };
      }
      const location = await this.locationModel.findById(review?.locationId);
      if (!location) {
        return {
          success: false,
          message: 'Không tìm thấy địa điểm liên quan đến đánh giá',
          statusCode: 404,
        };
      }
      if (!location?.ownerId) {
        return {
          success: false,
          message: 'Bạn không có quyền trả lời đánh giá cho địa điểm này',
          statusCode: 400,
        };
      }
      if (!location.ownerId.equals(new Types.ObjectId(vendorId))) {
        return {
          success: false,
          message: 'Bạn không có quyền trả lời đánh giá cho địa điểm này',
          statusCode: 403,
        };
      }
      review.reply = {
        vendorId: new Types.ObjectId(vendorId),
        content,
      };
      await review.save();
      return {
        success: true,
        message: 'Trả lời đánh giá thành công',
      };
    } catch (error) {
      console.error('Error in replyReview service:', error);
      return {
        success: false,
        message: 'Xảy ra lỗi khi trả lời đánh giá',
        statusCode: 500,
      };
    }
  }

  async editReply(vendorId: string, content: string, reviewId: string) {
    try {
      const user = await this.userModel.findById(vendorId);
      if (!user) {
        return {
          success: false,
          message: 'Không tìm thấy người dùng',
          statusCode: 404,
        };
      }
      const review = await this.reviewModel.findById(reviewId);

      if (!review) {
        return {
          success: false,
          message: 'Không tìm thấy đánh giá',
          statusCode: 404,
        };
      }
      if (review.status !== ReviewStatus.PUBLISHED) {
        return {
          success: false,
          message: 'Đánh giá chưa được xuất bản',
          statusCode: 400,
        };
      }
      if (!review.reply) {
        return {
          success: false,
          message: 'Đánh giá chưa có phản hồi',
          statusCode: 400,
        };
      }
      if (!review.reply.vendorId.equals(new Types.ObjectId(vendorId))) {
        return {
          success: false,
          message: 'Bạn chỉ được chỉnh sửa phản hồi của mình',
          statusCode: 403,
        };
      }
      review.reply.content = content;
      await review.save();
      return {
        success: true,
        message: 'Cập nhật phản hồi thành công',
      };
    } catch (error) {
      console.error('Error in editReply service:', error);
      return {
        success: false,
        message: 'Xảy ra lỗi khi cập nhật phản hồi',
        statusCode: 500,
      };
    }
  }

  async addImagesToLocation(
    locationId: string,
    vendorId: string,
    files: Express.Multer.File[],
  ): Promise<LocationImageManagementResult> {
    try {
      const owned = await this.findOwnedLocation(locationId, vendorId);
      if ('error' in owned) {
        return owned.error;
      }
      const uploaded = await this.imagesService.uploadMultiMedia(
        `location-images/${locationId}`,
        files,
      );

      return this.connection.transaction(async (session) => {
        const current = await this.findOwnedLocation(
          locationId,
          vendorId,
          session,
        );
        if ('error' in current) {
          return current.error;
        }

        const existingImages = current.location.imagesUrls ?? [];
        const hasCover = existingImages.some((image) => image.isCover);
        const images = uploaded.map((image, index) => ({
          url: image.url,
          isCover: !hasCover && index === 0,
          uploadedAt: new Date(),
        }));

        current.location.imagesUrls ??= [];
        current.location.imagesUrls.push(...images);
        await current.location.save({ session });

        return {
          success: true,
          message: 'Đã thêm ảnh vào địa điểm',
          images,
        };
      });
    } catch (error) {
      console.error('Error in addImagesToLocation service:', error);
      return {
        success: false,
        message: 'Xảy ra lỗi khi thêm ảnh vào địa điểm',
        statusCode: 500,
      };
    }
  }

  async setLocationCoverImage(
    locationId: string,
    vendorId: string,
    imageUrl: string,
  ): Promise<LocationImageManagementResult> {
    try {
      return this.connection.transaction(async (session) => {
        const owned = await this.findOwnedLocation(
          locationId,
          vendorId,
          session,
        );
        if ('error' in owned) {
          return owned.error;
        }

        const selected = owned.location.imagesUrls.find(
          (image) => image.url === imageUrl,
        );
        if (!selected) {
          return {
            success: false,
            message: 'Ảnh không thuộc địa điểm này',
            statusCode: 400,
          };
        }

        owned.location.imagesUrls.forEach((image) => {
          image.isCover = image === selected;
        });
        await owned.location.save({ session });

        return {
          success: true,
          message: 'Đã đặt ảnh bìa',
          imageUrl,
        };
      });
    } catch (error) {
      console.error('Error in setLocationCoverImage service:', error);
      return {
        success: false,
        message: 'Xảy ra lỗi khi đặt ảnh bìa',
        statusCode: 500,
      };
    }
  }

  private async findOwnedLocation(
    locationId: string,
    vendorId: string,
    session?: ClientSession,
  ): Promise<OwnedLocationResult> {
    const query = this.locationModel.findById(locationId);
    const location = session
      ? await query.session(session).exec()
      : await query.exec();
    if (!location) {
      return {
        error: {
          success: false,
          message: 'Không tìm thấy địa điểm',
          statusCode: 404,
        },
      };
    }

    if (!location.ownerId || location.ownerId.toString() !== vendorId) {
      return {
        error: {
          success: false,
          message: 'Bạn không có quyền quản lý ảnh của địa điểm này',
          statusCode: 403,
        },
      };
    }

    return { location };
  }

  async addImageToLocation(locationId: string, file: Express.Multer.File) {
    try {
      const location = await this.locationModel.findById(locationId).exec();
      const uploadedImage = await this.imagesService.uploadMultiMedia(
        `location-images/${locationId}`,
        [file],
      );
      const data = uploadedImage.map((img, index) => ({
        url: img.url,
        isCover: index === 0,
        uploadedAt: new Date(),
      }));
      location?.imagesUrls.push(...data);
      await location?.save();
      return {
        success: true,
        message: 'Thêm ảnh vào địa điểm thành công',
        imageUrl: uploadedImage[0].url,
      };
    } catch (error) {
      console.error('Error in addImageToLocation service:', error);
      return {
        success: false,
        message: 'Xảy ra lỗi khi thêm ảnh vào địa điểm',
        statusCode: 500,
      };
    }
  }
}
