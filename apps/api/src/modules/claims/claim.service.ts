import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
import {
  ClaimRequestStatus,
  ClaimRequestType,
  LocationStatus,
  RequestAccessStatus,
  UserRole,
  UserStatus,
} from 'src/common/schemas/common.enums';
import {
  ClaimRequest,
  ClaimRequestDocument,
} from 'src/common/schemas/claim-request.schema';
import {
  ClaimVerificationSession,
  ClaimVerificationSessionDocument,
} from 'src/common/schemas/claim-verification-session.schema';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import {
  RequestAccess,
  RequestAccessDocument,
} from 'src/common/schemas/request-access.schema';
import { User, UserDocument } from 'src/common/schemas/user.schema';
import {
  NOTIFICATION_PORT,
  NotificationPort,
} from 'src/common/contracts/notification.port';
import { SmsService } from '../auth/services/sms.service';
import { SubmitClaimDto } from './dto/submit-claim.dto';

const SESSION_TTL_MINUTES = 30;
const MAX_OTP_ATTEMPTS = 5;

@Injectable()
export class ClaimService {
  private readonly logger = new Logger(ClaimService.name);

  constructor(
    @InjectModel(Location.name)
    private readonly locationModel: Model<LocationDocument>,
    @InjectModel(ClaimRequest.name)
    private readonly claimModel: Model<ClaimRequestDocument>,
    @InjectModel(RequestAccess.name)
    private readonly requestAccessModel: Model<RequestAccessDocument>,
    @InjectModel(ClaimVerificationSession.name)
    private readonly sessionModel: Model<ClaimVerificationSessionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @Inject(NOTIFICATION_PORT)
    private readonly notification: NotificationPort,
    private readonly sms: SmsService,
  ) {}

  // bắt đầu, nói chung là có sdt thì cần otp, ko thì th

  async start(locationId: string, vendorId: string) {
    try {
      // id k hle
      if (
        !Types.ObjectId.isValid(locationId) ||
        !Types.ObjectId.isValid(vendorId)
      ) {
        return this.failure(400, 'ID địa điểm hoặc người yêu cầu không hợp lệ');
      }
      // kiểm tra tính khả thi? tk có phải vendor ko, tk có bị banned k

      const eligibilityFailure = await this.getEligibilityFailure(vendorId);
      if (eligibilityFailure) return eligibilityFailure;

      // xử lý location
      const location = await this.locationModel
        .findById(locationId)
        .lean()
        .exec();

      if (!location) return this.failure(404, 'Không tìm thấy địa điểm');

      if (location.status !== LocationStatus.PUBLISHED) {
        return this.failure(409, 'Chỉ có thể claim địa điểm đã được công khai');
      }

      if (location.ownerId) {
        return this.failure(
          409,
          'Địa điểm này đã có chủ sở hữu. Nếu thông tin sai, hãy gửi báo cáo.',
        );
      }

      if (await this.hasPendingSlot(locationId)) {
        return this.failure(
          409,
          'Địa điểm đang có yêu cầu claim hoặc xin quyền chờ xử lý.',
        );
      }

      // lấy số điện thoại
      const phone = location.phone?.trim() || undefined;
      
      // có sdt thì yêu cầu otp
      const otpRequired = Boolean(phone);
      const otp = otpRequired ? this.generateOtp() : undefined;
      const siteCode = this.generateSiteCode();
      const expiresAt = new Date(Date.now() + SESSION_TTL_MINUTES * 60_000);

      // gửi mã
      if (otp && phone) await this.sms.sendOtp(phone, otp);

      await this.sessionModel.findOneAndUpdate(
        {
          vendorId: new Types.ObjectId(vendorId),
          locationId: new Types.ObjectId(locationId),
        },
        {
          vendorId: new Types.ObjectId(vendorId),
          locationId: new Types.ObjectId(locationId),
          siteCode,
          otpHash: otp ? await bcrypt.hash(otp, 10) : null,
          otpRequired,
          otpVerified: false,
          attempts: 0,
          expiresAt,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      return {
        success: true,
        otpRequired,
        siteCode,
        message: otpRequired
          ? 'Đã gửi OTP tới số điện thoại của địa điểm'
          : 'Địa điểm chưa có số điện thoại; vẫn phải nộp ảnh hiện trường hợp lệ',
      };
    } catch (error) {
      this.logError('start claim', error);
      return this.failure(500, 'Lỗi khi bắt đầu yêu cầu claim');
    }
  }

  // xác minh otp
  async verifyOtp(locationId: string, vendorId: string, otp: string) {
    try {
      if (
        !Types.ObjectId.isValid(locationId) ||
        !Types.ObjectId.isValid(vendorId)
      ) {
        return this.failure(400, 'ID địa điểm hoặc người yêu cầu không hợp lệ');
      }
      
      const eligibilityFailure = await this.getEligibilityFailure(vendorId);
      if (eligibilityFailure) return eligibilityFailure;
      const session = await this.sessionModel
        .findOne({
          vendorId: new Types.ObjectId(vendorId),
          locationId: new Types.ObjectId(locationId),
        })
        .exec();
      if (!session) {
        return this.failure(
          410,
          'Phiên xác minh không tồn tại hoặc đã hết hạn',
        );
      }
      if (!session.otpRequired) {
        return { success: true, message: 'Địa điểm không yêu cầu OTP' };
      }
      if (session.attempts >= MAX_OTP_ATTEMPTS) {
        return this.failure(429, 'Bạn đã nhập sai OTP quá nhiều lần');
      }
      // so sánh otp, trùng thì ngon luôn
      const matched = session.otpHash
        ? await bcrypt.compare(otp, session.otpHash)
        : false;

      if (!matched) {
        session.attempts += 1;
        await session.save();
        return this.failure(
          400,
          `Mã OTP không đúng, còn ${MAX_OTP_ATTEMPTS - session.attempts} lần thử`,
        );
      }

      session.otpVerified = true;
      await session.save();
      return { success: true, message: 'Xác minh OTP thành công' };
    } catch (error) {
      this.logError('verify claim OTP', error);
      return this.failure(500, 'Lỗi khi xác minh OTP');
    }
  }

  async submit(dto: SubmitClaimDto, vendorId: string) {
    try {
      if (
        !Types.ObjectId.isValid(dto.locationId) ||
        !Types.ObjectId.isValid(vendorId)
      ) {
        return this.failure(400, 'ID địa điểm hoặc người yêu cầu không hợp lệ');
      }
      const eligibilityFailure = await this.getEligibilityFailure(vendorId);
      if (eligibilityFailure) return eligibilityFailure;
      const location = await this.locationModel
        .findById(dto.locationId)
        .lean()
        .exec();
      if (!location) return this.failure(404, 'Không tìm thấy địa điểm');
      if (location.ownerId)
        return this.failure(409, 'Địa điểm này đã có chủ sở hữu');
      if (location.status !== LocationStatus.PUBLISHED) {
        return this.failure(409, 'Chỉ có thể claim địa điểm đã được công khai');
      }

      const session = await this.sessionModel
        .findOne({
          vendorId: new Types.ObjectId(vendorId),
          locationId: new Types.ObjectId(dto.locationId),
        })
        .exec();
      if (!session) return this.failure(410, 'Phiên xác minh đã hết hạn');
      if (session.otpRequired && !session.otpVerified) {
        return this.failure(
          400,
          'Bạn cần xác minh OTP trước khi nộp bằng chứng',
        );
      }

      // ảnh phải có vị trí và thời điểm chụp, và phải có ảnh cho thấy mã siteCode
      const hasGeoPhoto = dto.evidenceFiles.some((file) => {
        if (file.fileType !== 'IMAGE') return false;
        if (file.geo?.coordinates.length !== 2) return false;
        return Boolean(file.capturedAt);
      });
      if (!hasGeoPhoto) {
        return this.failure(
          400,
          'Cần ít nhất một ảnh hiện trường có vị trí và thời điểm chụp',
        );
      }
      // ảnh phải có siteCode, siteCode là gì ?
      // siteCode là cái code mà hệ thống cấp cho vendor để chụp ảnh, để chứng minh rằng vendor đã đến địa điểm đó, và ảnh phải có siteCode này trong metadata. siteCode này lấy ở đâu?
      const siteCodeSeen = dto.evidenceFiles.some(
        (file) => file.metadata?.siteCode === session.siteCode,
      );
      if (!siteCodeSeen) {
        return this.failure(400, 'Ảnh phải cho thấy mã hệ thống đã cấp');
      }
      if (await this.hasPendingSlot(dto.locationId)) {
        return this.failure(409, 'Địa điểm đang có yêu cầu chờ xử lý');
      }

      // tạo claim request
      const evidenceFiles = dto.evidenceFiles.map((file) => ({
        ...file,
        capturedAt: file.capturedAt ? new Date(file.capturedAt) : undefined,
        metadata: {
          ...(file.metadata ?? {}),
          ...(session.otpRequired
            ? {}
            : { adminScrutiny: 'NO_PHONE_HIGHER_SCRUTINY' }),
        },
      }));
      // tạo claim request
      let claim: ClaimRequestDocument;
      try {
        claim = await this.claimModel.create({
          vendorId: new Types.ObjectId(vendorId),
          locationId: new Types.ObjectId(dto.locationId),
          type: ClaimRequestType.CLAIM_EXISTING_LOCATION,
          evidenceFiles,
          licenseUrl: dto.licenseUrl,
          otpVerified: session.otpVerified,
          otpVerifiedAt: session.otpVerified ? new Date() : undefined,
          status: ClaimRequestStatus.PENDING,
        });
      } catch (error) {
        if (this.isDuplicateKeyError(error)) {
          return this.failure(409, 'Địa điểm vừa có yêu cầu chờ xử lý');
        }
        throw error;
      }

      // xóa session, vì đã nộp claim rồi
      await this.sessionModel.deleteOne({ _id: session._id }).exec();
      await this.notification.notify({
        userId: vendorId,
        type: 'CLAIM_SUBMITTED',
        title: 'Đã nhận yêu cầu xác nhận sở hữu',
        body: `Yêu cầu claim cho "${location.name}" đang chờ admin duyệt.`,
        refCollection: 'claim_requests',
        refId: String(claim._id),
      });

      return {
        success: true,
        message: 'Đã gửi yêu cầu claim, vui lòng chờ admin xét duyệt',
        claim: { id: claim._id, status: claim.status },
      };
    } catch (error) {
      this.logError('submit claim', error);
      return this.failure(500, 'Lỗi khi nộp yêu cầu claim');
    }
  }

  // ktra xem có cái pending claim hay request access nào chưa, nếu có thì ko cho tạo mới
  private async hasPendingSlot(locationId: string) {
    const id = new Types.ObjectId(locationId);
    const [claim, requestAccess] = await Promise.all([
      this.claimModel.exists({
        locationId: id,
        status: ClaimRequestStatus.PENDING,
      }),
      this.requestAccessModel.exists({
        locationId: id,
        status: RequestAccessStatus.PENDING,
      }),
    ]);

    if (claim || requestAccess) return true;
    return false;
  }


  private async getEligibilityFailure(vendorId: string) {
    const user = await this.userModel.findById(vendorId).lean().exec();
    if (!user || user.role !== UserRole.VENDOR) {
      return this.failure(
        403,
        'Chỉ tài khoản Vendor mới có thể claim địa điểm',
      );
    }
    if (user.status !== UserStatus.ACTIVE) {
      return this.failure(403, 'Tài khoản Vendor không ở trạng thái hoạt động');
    }
    if (user.phoneVerified !== true) {
      return this.failure(
        403,
        'Vendor phải xác minh số điện thoại trước khi claim địa điểm',
      );
    }
    return null;
  }

  private generateOtp() {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  private generateSiteCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const code = Array.from(
      { length: 6 },
      () => alphabet[randomInt(0, alphabet.length)],
    ).join('');
    return `CLG-${code}`;
  }

  private failure(statusCode: number, message: string) {
    return { success: false, statusCode, message };
  }

  private isDuplicateKeyError(error: unknown): error is { code: number } {
    if (!error || typeof error !== 'object') return false;
    if (!('code' in error)) return false;
    return error.code === 11000;
  }

  private logError(context: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`${context}: ${message}`);
  }
}
