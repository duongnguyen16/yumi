import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { PasswordResetEmailService } from './password-reset-email.service';
import {
  digestPasswordResetCode,
  generatePasswordResetCode,
  isBcryptHash,
  verifyPasswordResetCodeDigest,
} from './password-reset.util';
import { PasswordResetCodeDocument } from './schemas/password-reset-code.schema';
import { UserDocument } from './schemas/user.schema';

const RESET_CODE_TTL_MS = 10 * 60 * 1000;
const RESET_CODE_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_RESET_ATTEMPTS = 5;
const BCRYPT_COST = 12;
const GENERIC_FORGOT_MESSAGE =
  'Nếu email tồn tại trong hệ thống, mã đặt lại mật khẩu đã được gửi.';
const INVALID_RESET_CODE_MESSAGE = 'Mã xác nhận không hợp lệ hoặc đã hết hạn.';

@Injectable()
export default class AuthService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<UserDocument>,
    @InjectModel('PasswordResetCode')
    private readonly passwordResetCodeModel: Model<PasswordResetCodeDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly passwordResetEmailService: PasswordResetEmailService,
  ) {}

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userModel.findOne({ email: normalizedEmail });

    if (!user) {
      throw new UnauthorizedException('Sai mật khẩu hoặc email');
    }

    const storedPassword = user.password_hash;
    const passwordIsHashed = isBcryptHash(storedPassword);
    const isPasswordValid = passwordIsHashed
      ? await bcrypt.compare(password, storedPassword)
      : password === storedPassword;

    if (!isPasswordValid) {
      throw new UnauthorizedException('Sai mật khẩu hoặc email');
    }
    if (user.status === 'banned') {
      throw new ForbiddenException('Tài khoản của bạn đã bị cấm');
    }

    if (!passwordIsHashed) {
      const upgradedHash = await bcrypt.hash(password, BCRYPT_COST);
      await this.userModel.updateOne(
        { _id: user._id, password_hash: storedPassword },
        { $set: { password_hash: upgradedHash } },
      );
    }

    const accessTokenSecret = this.configService.get<string>(
      'ACCESS_TOKEN_SECRET',
    );
    const refreshTokenSecret = this.configService.get<string>(
      'REFRESH_TOKEN_SECRET',
    );
    if (!accessTokenSecret || !refreshTokenSecret) {
      throw new InternalServerErrorException(
        'Dịch vụ đăng nhập chưa được cấu hình',
      );
    }

    const accessToken = this.jwtService.sign(
      { userId: user._id },
      { secret: accessTokenSecret, expiresIn: '1h' },
    );
    const refreshToken = this.jwtService.sign(
      { userId: user._id },
      { secret: refreshTokenSecret, expiresIn: '7d' },
    );
    const { password_hash: ignoredPasswordHash, ...safeUser } = user.toObject();
    void ignoredPasswordHash;

    return {
      success: true,
      user: safeUser,
      accessToken,
      refreshToken,
    };
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
      throw error;
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

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    const updateResult = await this.userModel.updateOne(
      { _id: consumedCode.user_id, email: normalizedEmail },
      { $set: { password_hash: passwordHash } },
    );
    if (updateResult.matchedCount !== 1) {
      throw new BadRequestException(INVALID_RESET_CODE_MESSAGE);
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
    const user = await this.userModel.findById(userId, '-password_hash');
    if (!user) {
      throw new UnauthorizedException('Không tìm thấy người dùng');
    }
    return { success: true, user };
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
}
