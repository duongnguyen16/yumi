import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
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
import { User, UserDocument } from 'src/common/schemas/user.schema';
import { SmsService } from '../auth/services/sms.service';
import { ImagesService } from '../images/images.service';
import { LocationGeoService } from '../location-geo/location-geo.service';
import { CreateLocationDto } from './dto/vendor-register-location.dto';
import { CreateLocationRequestDataDto } from './dto/vendor-register-location-request.dto';
import { UpdateLocationDto } from './dto/vendor-update-location.dto';

type ReviewRequiredData = {
  name?: string | null;
  address?: string | null;
  pinLocation?: GeoPoint | null;
  deviceLocation?: GeoPoint | null;
  deviceDistanceMeters?: number | null;
};

@Injectable()
export class VendorLocationsService {
  constructor(
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
    @InjectModel(LocationRequest.name)
    private locationRequestModel: Model<LocationRequestDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Otp.name) private otpModel: Model<OtpDocument>,
    private readonly imagesService: ImagesService,
    private readonly smsService: SmsService,
    private readonly locationGeoService: LocationGeoService,
  ) {}

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
      if (!location.ownerId || !location.ownerId.equals(new Types.ObjectId(userId))) {
        return {
          success: false,
          message: 'Bạn không có quyền chỉnh sửa địa điểm này',
          statusCode: 403,
        };
      }
      let reviewRequiredData: ReviewRequiredData = {};
      if (updateData?.name || updateData?.address) {
        reviewRequiredData = {
          name: updateData.name ?? null,
          address: updateData.address ?? null,
          pinLocation:
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
        }
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
          changedFields: Object.keys(cleanData),
          deviceLocation: reviewRequiredData.deviceLocation ?? null,
          pinLocation: reviewRequiredData.pinLocation ?? null,
          deviceDistanceMeters:
            reviewRequiredData.deviceDistanceMeters ?? null,
          verificationProof: {
            proofUrls: urls.map((url) => url.url),
            capturedAt: now,
          },
        });
      }
      const nonReviewData = {
        openingHours: updateData.openingHours ?? null,
        description: updateData.description ?? null,
        categoryId: updateData.categoryId ?? null,
        subCategoryIds: updateData.subCategoryIds ?? null,
        phone: updateData.phone ?? null,
      };
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
        deviceDistanceMeters: this.locationGeoService.getDistanceMeters(
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
