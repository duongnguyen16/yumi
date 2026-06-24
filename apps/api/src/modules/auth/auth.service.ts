import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserDocument } from '../users/schemas/user.schema';
import { VendorProfileDocument } from '../vendors/schemas/vendor-profile.schema';
import { PendingVendorRegistrationDocument } from '../vendors/schemas/pending-vendor-registration.schema';
import { RegisterDTO } from './dto/register.dto';
import { RequestVendorOtpDTO } from './dto/request-vendor-otp.dto';
import { VerifyVendorOtpDTO } from './dto/verify-vendor-otp.dto';
import { SmsService } from './services/sms.service';
import { JwtPayLoad } from '../../types/jwt.types';

const OTP_TTL_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;

@Injectable()
export default class AuthService {
  constructor(
    @InjectModel('User') private userModel: Model<UserDocument>,
    @InjectModel('VendorProfile') private vendorProfileModel: Model<VendorProfileDocument>,
    @InjectModel('PendingVendorRegistration')
    private pendingVendorModel: Model<PendingVendorRegistrationDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private smsService: SmsService,
  ) {}

  async login(email: string, password: string) {
    try {
      const user = await this.userModel.findOne({ email });
      if (!user) {
        return { success: false, message: 'Sai mật khẩu hoặc email', statusCode: 401 };
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return { success: false, message: 'Sai mật khẩu hoặc email', statusCode: 401 };
      }

      if (user.status === 'banned') {
        return { success: false, message: 'Tài khoản của bạn đã bị cấm', statusCode: 403 };
      }

      const { accessToken, refreshToken } = this.generateTokens(String(user._id));
      return { success: true, user, accessToken, refreshToken };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Đã xảy ra lỗi khi đăng nhập', statusCode: 500 };
    }
  }

  async register(dto: RegisterDTO) {
    try {
      const existingUser = await this.userModel.findOne({ email: dto.email });
      if (existingUser) {
        return { success: false, message: 'Email đã được sử dụng', statusCode: 409 };
      }

      const passwordHash = await bcrypt.hash(dto.password, 10);
      const newUser = await this.userModel.create({
        email: dto.email,
        password_hash: passwordHash,
        name: dto.name,
        role: 'user',
        status: 'active',
      });

      const { accessToken, refreshToken } = this.generateTokens(String(newUser._id));
      return { success: true, message: 'Đăng ký thành công', user: newUser, accessToken, refreshToken };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: 'Đã xảy ra lỗi khi đăng ký', statusCode: 500 };
    }
  }

  async refresh(refreshToken: string) {
    try {
      let payload: JwtPayLoad;
      try {
        payload = await this.jwtService.verifyAsync<JwtPayLoad>(refreshToken, {
          secret: this.configService.get('REFRESH_TOKEN_SECRET'),
        });
      } catch (error) {
        return {
          success: false,
          message: 'Refresh token không hợp lệ hoặc đã hết hạn',
          statusCode: 401,
        };
      }

      const user = await this.userModel.findById(payload.userId);
      if (!user) {
        return { success: false, message: 'Không tìm thấy người dùng', statusCode: 401 };
      }

      if (user.status === 'banned') {
        return { success: false, message: 'Tài khoản của bạn đã bị cấm', statusCode: 403 };
      }

      const tokens = this.generateTokens(String(user._id));
      return { success: true, ...tokens };
    } catch (error) {
      console.error('Refresh error:', error);
      return { success: false, message: 'Đã xảy ra lỗi khi làm mới token', statusCode: 500 };
    }
  }

  /**
   * Bước 1 của đăng ký vendor: validate thông tin, sinh OTP, lưu tạm,
   * KHÔNG tạo User ở bước này.
   */
  async requestVendorOtp(dto: RequestVendorOtpDTO) {
    try {
      const existingUser = await this.userModel.findOne({ email: dto.email });
      if (existingUser) {
        return { success: false, message: 'Email đã được sử dụng', statusCode: 409 };
      }

      const passwordHash = await bcrypt.hash(dto.password, 10);
      const otp = this.generateOtp();
      const otpHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

      // upsert theo email: nếu vendor bấm "gửi lại OTP", ghi đè bản ghi cũ
      // thay vì tạo mới (tránh lỗi duplicate key vì email/phone đang unique)
      await this.pendingVendorModel.findOneAndUpdate(
        { email: dto.email },
        {
          email: dto.email,
          phone: dto.phone,
          password_hash: passwordHash,
          name: dto.name,
          business_name: dto.business_name,
          business_phone: dto.business_phone,
          business_address: dto.business_address ?? null,
          otp_hash: otpHash,
          attempts: 0,
          expires_at: expiresAt,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      await this.smsService.sendOtp(dto.phone, otp);

      return {
        success: true,
        message: `Mã OTP đã được gửi tới số điện thoại của bạn, có hiệu lực trong ${OTP_TTL_MINUTES} phút`,
      };
    } catch (error) {
      console.error('RequestVendorOtp error:', error);
      return { success: false, message: 'Đã xảy ra lỗi khi gửi OTP', statusCode: 500 };
    }
  }

  /**
   * Bước 2: verify OTP. Nếu đúng -> tạo User (role: vendor) + VendorProfile,
   * xoá bản ghi tạm, trả token để đăng nhập luôn.
   */
  async verifyVendorOtp(dto: VerifyVendorOtpDTO) {
    try {
      const pending = await this.pendingVendorModel.findOne({ email: dto.email });
      if (!pending) {
        return {
          success: false,
          message: 'Không tìm thấy yêu cầu đăng ký hoặc OTP đã hết hạn, vui lòng đăng ký lại',
          statusCode: 404,
        };
      }

      if (pending.attempts >= MAX_OTP_ATTEMPTS) {
        return {
          success: false,
          message: 'Bạn đã nhập sai quá nhiều lần, vui lòng yêu cầu OTP mới',
          statusCode: 429,
        };
      }

      const isOtpValid = await bcrypt.compare(dto.otp, pending.otp_hash);
      if (!isOtpValid) {
        pending.attempts += 1;
        await pending.save();
        const remaining = MAX_OTP_ATTEMPTS - pending.attempts;
        return {
          success: false,
          message: `Mã OTP không đúng, còn ${remaining} lần thử`,
          statusCode: 400,
        };
      }

      // Email đã được check trùng ở bước request-otp, nhưng check lại
      // để tránh race condition nếu user đăng ký bằng email khác trong lúc chờ OTP
      const existingUser = await this.userModel.findOne({ email: pending.email });
      if (existingUser) {
        await this.pendingVendorModel.deleteOne({ email: pending.email });
        return { success: false, message: 'Email đã được sử dụng', statusCode: 409 };
      }

      const newUser = await this.userModel.create({
        email: pending.email,
        password_hash: pending.password_hash,
        name: pending.name,
        phone: pending.phone,
        phone_verified: true,
        role: 'vendor',
        status: 'active',
      });

      await this.vendorProfileModel.create({
        user_id: newUser._id,
        business_name: pending.business_name,
        business_phone: pending.business_phone,
        business_address: pending.business_address,
        verification_status: 'pending',
      });

      await this.pendingVendorModel.deleteOne({ email: pending.email });

      const { accessToken, refreshToken } = this.generateTokens(String(newUser._id));

      return {
        success: true,
        message: 'Xác minh thành công',
        user: newUser,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      console.error('VerifyVendorOtp error:', error);
      return { success: false, message: 'Đã xảy ra lỗi khi xác minh OTP', statusCode: 500 };
    }
  }

  async authMe(userId: string) {
    try {
      const user = await this.userModel.findById(userId, '-password_hash');
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      return { success: true, user };
    } catch (error) {
      console.error('AuthMe error:', error);
      return { success: false, message: 'Đã xảy ra lỗi khi xác thực người dùng' };
    }
  }

  

  private generateOtp(): string {
    // 6 số, dùng crypto.randomInt (an toàn hơn Math.random) — luôn đủ 6 ký tự kể cả khi có số 0 đứng đầu
    return randomInt(0, 1000000).toString().padStart(6, '0');
  }

  private generateTokens(userId: string) {
    const accessToken = this.jwtService.sign(
      { userId },
      { secret: this.configService.get('ACCESS_TOKEN_SECRET'), expiresIn: '1h' },
    );
    const refreshToken = this.jwtService.sign(
      { userId },
      { secret: this.configService.get('REFRESH_TOKEN_SECRET'), expiresIn: '7d' },
    );
    return { accessToken, refreshToken };
  }
}