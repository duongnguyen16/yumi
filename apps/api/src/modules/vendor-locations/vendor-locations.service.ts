import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcryptjs';
import { Model, Types, Connection } from 'mongoose';
import { generateSystemCode } from 'src/common/func/generate-code';
import {
  LocationSource,
  LocationStatus,
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

type ReviewRequiredData = {
  name?: string | null;
  address?: string | null;
  geo?: GeoPoint | null;
  deviceLocation?: GeoPoint | null;
  deviceDistanceMeters?: number | null;
  isPotentialDuplicate?: boolean;
  suspectedDuplicateLocationIds?: Types.ObjectId[];
};

@Injectable()
export class VendorLocationsService {
  constructor(
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
    @InjectModel(LocationRequest.name)
    private locationRequestModel: Model<LocationRequestDocument>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    @InjectModel(Otp.name) private otpModel: Model<OtpDocument>,
    private readonly imagesService: ImagesService,
    private readonly smsService: SmsService,
    private readonly locationGeoService: LocationGeoService,
    private readonly duplicateDetectionService: DuplicateDetectionService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  //kiểm tra số điện thoại đã xác minh otp chưa bằng cách check trong schema otp, thêm validate khoảng cách 50m khi cập nhập vị trí
  async updateLocation(
    id: string,
    updateData: UpdateLocationDto,
    userId: string,
    files?: Express.Multer.File[],
  ) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'Người dùng không tồn tại',
          statusCode: 404,
        };
      }
      const location = await this.locationModel.findById(id).exec();
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
      const isHold = isUnderHold(location.toObject());
      const changesCoreInfo =
        updateData.name !== undefined ||
        updateData.address !== undefined ||
        updateData.categoryId !== undefined ||
        updateData.subCategoryIds !== undefined;
      if (isHold && changesCoreInfo) {
        return {
          success: false,
          message:
            'Địa điểm đang bị tạm giữ, không thể thay đổi thông tin cốt lõi',
          statusCode: 403,
        };
      }
      let reviewRequiredData: ReviewRequiredData = {};
      if (updateData?.name || updateData?.address) {
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
          if (reviewRequiredData.deviceDistanceMeters > 500) {
            return {
              success: false,
              message:
                'Bạn phải đứng trong phạm vi 50m mới được cập nhật địa điểm',
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
        const now = new Date();
        const urls = await this.imagesService.uploadMultiMedia(id, files ?? []);
        await this.locationRequestModel.create({
          type: LocationRequestType.UPDATE,
          submittedBy: userId,
          locationId: id,
          status: LocationRequestStatus.PENDING_RE_APPROVAL,
          oldData,
          newData: cleanData,
          deviceLocation: reviewRequiredData.deviceLocation ?? null,
          pinLocation: reviewRequiredData.geo ?? null,
          deviceDistanceMeters: reviewRequiredData.deviceDistanceMeters ?? null,
          verificationProof: {
            proofUrls: urls.map((url) => url.url),
            capturedAt: now,
          },
          isPotentialDuplicate:
            reviewRequiredData.isPotentialDuplicate ?? false,
          suspectedDuplicateLocationIds:
            reviewRequiredData.suspectedDuplicateLocationIds ?? [],
        });
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
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'Không tìm thấy người dùng',
          statusCode: 404,
        };
      }
      if (user.phoneVerified === false) {
        return {
          success: false,
          message: 'Số điện thoại chưa được xác minh',
          statusCode: 400,
        };
      }
      const checkOtp = await this.otpModel.findOne({
        userId: new Types.ObjectId(userId),
        purpose: OtpPurpose.VERIFY_LOCATION,
        status: OtpStatus.PENDING,
        expiresAt: { $gt: new Date() },
      });
      if (!checkOtp) {
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
        return {
          success: false,
          message: 'Mã hệ thống không hợp lệ',
          statusCode: 400,
        };
      }
      await this.otpModel.updateOne(
        { _id: checkOtp._id },
        { verifiedAt: new Date(), status: OtpStatus.VERIFIED },
      );
      const deviceDistanceMeters = this.locationGeoService.getDistanceMeters(
        requestDataParsed.deviceLatitude,
        requestDataParsed.deviceLongitude,
        requestDataParsed.pinLatitude,
        requestDataParsed.pinLongitude,
      );
      if (deviceDistanceMeters > 50) {
        throw new BadRequestException(
          'Bạn phải đứng trong phạm vi 50m mới được tạo địa điểm',
        );
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
        subCategoryIds: locationDataParsed.subCategoryIds
          ? locationDataParsed.subCategoryIds.map(
              (id) => new Types.ObjectId(id),
            )
          : [],
        submittedAt: new Date(),
      });
      await this.locationRequestModel.create({
        type: LocationRequestType.CREATE,
        status: LocationRequestStatus.PENDING,
        submittedBy: new Types.ObjectId(userId),
        locationId: location._id,
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
        deviceDistanceMeters,
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
        statusCode: 200,
      };
    } catch (error) {
      console.error('Error in registerLocation service:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Xảy ra lỗi khi đăng ký địa điểm');
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
}
