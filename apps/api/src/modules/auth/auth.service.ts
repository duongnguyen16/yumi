import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { Model } from 'mongoose';
import { UserRole, UserStatus } from 'src/common/schemas/common.enums';
import { UserDocument } from 'src/common/schemas/user.schema';
import { JwtPayLoad } from '../../types/jwt.types';
import { PendingVendorRegistrationDocument } from '../vendors/schemas/pending-vendor-registration.schema';
import { RegisterDTO } from './dto/register.dto';
import { RequestVendorOtpDTO } from './dto/request-vendor-otp.dto';
import { VerifyVendorOtpDTO } from './dto/verify-vendor-otp.dto';
import { PasswordResetEmailService } from './password-reset-email.service';
import {
  digestPasswordResetCode,
  generatePasswordResetCode,
  isBcryptHash,
  verifyPasswordResetCodeDigest,
} from './password-reset.util';
import { PasswordResetCodeDocument } from './schemas/password-reset-code.schema';
import { SmsService } from './services/sms.service';

const OTP_TTL_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;
const RESET_CODE_TTL_MS = 10 * 60 * 1000;
const RESET_CODE_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_RESET_ATTEMPTS = 5;
const BCRYPT_COST = 12;
const GENERIC_FORGOT_MESSAGE =
  'Nếu email tồn tại trong hệ thống, mã đặt lại mật khẩu đã được gửi.';
const INVALID_RESET_CODE_MESSAGE = 'Mã xác nhận không hợp lệ hoặc đã hết hạn.';

type UserWithLegacyPassword = UserDocument & { password_hash?: string };

@Injectable()
export default class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel('User') private readonly userModel: Model<UserDocument>,
    @InjectModel('PendingVendorRegistration')
    private readonly pendingVendorModel: Model<PendingVendorRegistrationDocument>,
    @InjectModel('PasswordResetCode')
    private readonly passwordResetCodeModel: Model<PasswordResetCodeDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
    private readonly passwordResetEmailService: PasswordResetEmailService,
  ) {}

  async login(email: string, password: string) {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const user = await this.userModel
        .findOne({ email: normalizedEmail })
        .select('+passwordHash');
      if (!user) {
        return {
          success: false,
          message: 'Sai mật khẩu hoặc email',
          statusCode: 401,
        };
      }
      const storedPassword =
        user.passwordHash ?? (user as UserWithLegacyPassword).password_hash;
      if (!storedPassword) {
        return {
          success: false,
          message: 'Sai mật khẩu hoặc email',
          statusCode: 401,
        };
      }

      const passwordIsHashed = isBcryptHash(storedPassword);
      const isPasswordValid = passwordIsHashed
        ? await bcrypt.compare(password, storedPassword)
        : password === storedPassword;
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Sai mật khẩu hoặc email',
          statusCode: 401,
        };
      }

      if (!passwordIsHashed) {
        const upgradedHash = await bcrypt.hash(password, BCRYPT_COST);
        await this.userModel.updateOne(
          { _id: user._id },
          { $set: { passwordHash: upgradedHash } },
        );
        user.passwordHash = upgradedHash;
      }

      const appealOnly = user.status === UserStatus.BANNED;
      const { accessToken, refreshToken } = this.generateTokens(
        String(user._id),
        appealOnly,
      );
      const safeUser = this.toSafeUser(user);
      return {
        success: true,
        user: safeUser,
        accessToken,
        refreshToken,
        appealOnly,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi đăng nhập',
        statusCode: 500,
      };
    }
  }

  async register(dto: RegisterDTO) {
    try {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const existingUser = await this.userModel.findOne({
        email: normalizedEmail,
      });
      if (existingUser) {
        return {
          success: false,
          message: 'Email đã được sử dụng',
          statusCode: 409,
        };
      }

      const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
      const newUser = await this.userModel.create({
        email: normalizedEmail,
        passwordHash,
        fullName: dto.name,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
      });

      const { accessToken, refreshToken } = this.generateTokens(
        String(newUser._id),
      );
      return {
        success: true,
        message: 'Đăng ký thành công',
        user: this.toSafeUser(newUser),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      console.error('Register error:', error);
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi đăng ký',
        statusCode: 500,
      };
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
        console.error('Refresh token verify error:', error);
        return {
          success: false,
          message: 'Refresh token không hợp lệ hoặc đã hết hạn',
          statusCode: 401,
        };
      }

      const user = await this.userModel.findById(payload.userId);
      if (!user) {
        return {
          success: false,
          message: 'Không tìm thấy người dùng',
          statusCode: 401,
        };
      }

      const appealOnly = user.status === UserStatus.BANNED;
      const tokens = this.generateTokens(String(user._id), appealOnly);
      return { success: true, ...tokens, appealOnly };
    } catch (error) {
      console.error('Refresh error:', error);
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi làm mới token',
        statusCode: 500,
      };
    }
  }

  async requestVendorOtp(dto: RequestVendorOtpDTO) {
    try {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const existingUser = await this.userModel.findOne({
        email: normalizedEmail,
      });
      if (existingUser) {
        return {
          success: false,
          message: 'Email đã được sử dụng',
          statusCode: 409,
        };
      }

      const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
      const otp = this.generateOtp();
      const otpHash = await bcrypt.hash(otp, BCRYPT_COST);
      const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

      await this.pendingVendorModel.findOneAndUpdate(
        { email: normalizedEmail },
        {
          email: normalizedEmail,
          phone: dto.phone,
          password_hash: passwordHash,
          name: dto.name,
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
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi gửi OTP',
        statusCode: 500,
      };
    }
  }

  async verifyVendorOtp(dto: VerifyVendorOtpDTO) {
    try {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const pending = await this.pendingVendorModel.findOne({
        email: normalizedEmail,
      });
      if (!pending) {
        return {
          success: false,
          message:
            'Không tìm thấy yêu cầu đăng ký hoặc OTP đã hết hạn, vui lòng đăng ký lại',
          statusCode: 404,
        };
      }

      if (pending.expires_at.getTime() <= Date.now()) {
        await this.pendingVendorModel.deleteOne({ _id: pending._id });
        return {
          success: false,
          statusCode: 400,
          message: 'OTP đã hết hạn, vui lòng yêu cầu mã mới',
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

      const existingUser = await this.userModel.findOne({
        email: pending.email,
      });
      if (existingUser) {
        await this.pendingVendorModel.deleteOne({ email: pending.email });
        return {
          success: false,
          message: 'Email đã được sử dụng',
          statusCode: 409,
        };
      }

      const newUser = await this.userModel.create({
        email: pending.email,
        passwordHash: pending.password_hash,
        fullName: pending.name,
        phone: pending.phone,
        phoneVerified: true,
        role: UserRole.VENDOR,
        status: UserStatus.ACTIVE,
      });

      await this.pendingVendorModel.deleteOne({ email: pending.email });

      const { accessToken, refreshToken } = this.generateTokens(
        String(newUser._id),
      );

      return {
        success: true,
        message: 'Xác minh thành công',
        user: this.toSafeUser(newUser),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      console.error('VerifyVendorOtp error:', error);
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi xác minh OTP',
        statusCode: 500,
      };
    }
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userModel.findOne({ email: normalizedEmail });

    if (!user) {
      return { success: true, message: GENERIC_FORGOT_MESSAGE };
    }

    const cooldownStart = new Date(Date.now() - RESET_CODE_RESEND_COOLDOWN_MS);
    const recentCode = await this.passwordResetCodeModel.findOne({
      user_id: user._id,
      created_at: { $gt: cooldownStart },
      consumed_at: null,
    });

    if (recentCode) {
      return { success: true, message: GENERIC_FORGOT_MESSAGE };
    }

    const secret = this.getResetCodeSecret();
    const code = generatePasswordResetCode();
    const now = new Date();

    await this.passwordResetCodeModel.updateMany(
      { user_id: user._id, consumed_at: null },
      { $set: { consumed_at: now } },
    );

    const resetCode = await this.passwordResetCodeModel.create({
      user_id: user._id,
      email: normalizedEmail,
      code_digest: digestPasswordResetCode(normalizedEmail, code, secret),
      expires_at: new Date(now.getTime() + RESET_CODE_TTL_MS),
      attempts: 0,
      consumed_at: null,
    });

    try {
      await this.passwordResetEmailService.sendCode(normalizedEmail, code);
    } catch (error) {
      await this.passwordResetCodeModel.deleteOne({ _id: resetCode._id });
      this.logger.error(
        `Failed to send password reset email for user ${String(user._id)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return { success: true, message: GENERIC_FORGOT_MESSAGE };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const now = new Date();
    const resetCode = await this.passwordResetCodeModel
      .findOne({
        email: normalizedEmail,
        consumed_at: null,
      })
      .sort({ created_at: -1 });

    if (
      !resetCode ||
      resetCode.expires_at <= now ||
      resetCode.attempts >= MAX_RESET_ATTEMPTS
    ) {
      throw new BadRequestException(INVALID_RESET_CODE_MESSAGE);
    }

    const actualDigest = digestPasswordResetCode(
      normalizedEmail,
      code,
      this.getResetCodeSecret(),
    );
    const codeMatches = verifyPasswordResetCodeDigest(
      resetCode.code_digest,
      actualDigest,
    );

    if (!codeMatches) {
      const failedCode = await this.passwordResetCodeModel.findOneAndUpdate(
        {
          _id: resetCode._id,
          consumed_at: null,
          attempts: { $lt: MAX_RESET_ATTEMPTS },
        },
        { $inc: { attempts: 1 } },
        { new: true },
      );
      if (failedCode && failedCode.attempts >= MAX_RESET_ATTEMPTS) {
        await this.passwordResetCodeModel.updateOne(
          { _id: failedCode._id, consumed_at: null },
          { $set: { consumed_at: now } },
        );
      }
      throw new BadRequestException(INVALID_RESET_CODE_MESSAGE);
    }

    const consumedCode = await this.passwordResetCodeModel.findOneAndUpdate(
      {
        _id: resetCode._id,
        code_digest: resetCode.code_digest,
        consumed_at: null,
        expires_at: { $gt: now },
        attempts: { $lt: MAX_RESET_ATTEMPTS },
      },
      { $set: { consumed_at: now } },
      { new: true },
    );
    if (!consumedCode) {
      throw new BadRequestException(INVALID_RESET_CODE_MESSAGE);
    }

    try {
      const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
      const updateResult = await this.userModel.updateOne(
        { _id: consumedCode.user_id, email: normalizedEmail },
        { $set: { passwordHash } },
      );
      if (updateResult.matchedCount !== 1) {
        throw new BadRequestException(INVALID_RESET_CODE_MESSAGE);
      }
    } catch (error) {
      await this.passwordResetCodeModel.updateOne(
        {
          _id: consumedCode._id,
          consumed_at: now,
          expires_at: { $gt: new Date() },
        },
        { $set: { consumed_at: null } },
      );
      throw error;
    }

    await this.passwordResetCodeModel.updateMany(
      {
        user_id: consumedCode.user_id,
        consumed_at: null,
      },
      { $set: { consumed_at: now } },
    );

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công.',
    };
  }

  async authMe(userId: string) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      return { success: true, user: this.toSafeUser(user) };
    } catch (error) {
      console.error('AuthMe error:', error);
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi xác thực người dùng',
      };
    }
  }

  private getResetCodeSecret(): string {
    const secret = this.configService.get<string>('PASSWORD_RESET_CODE_SECRET');
    if (!secret) {
      throw new InternalServerErrorException(
        'Dịch vụ đặt lại mật khẩu chưa được cấu hình',
      );
    }
    return secret;
  }

  private generateOtp(): string {
    return randomInt(0, 1000000).toString().padStart(6, '0');
  }

  private generateTokens(userId: string, appealOnly = false) {
    const payload: JwtPayLoad = appealOnly
      ? { userId, scope: 'appeal' }
      : { userId };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('ACCESS_TOKEN_SECRET'),
      expiresIn: '1h',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      expiresIn: '7d',
    });
    return { accessToken, refreshToken };
  }

  private toSafeUser(user: UserDocument) {
    const rawUser = user.toObject ? user.toObject() : user;
    const { passwordHash, password_hash, ...safeUser } =
      rawUser as unknown as Record<string, unknown>;
    void passwordHash;
    void password_hash;
    return safeUser;
  }
}
