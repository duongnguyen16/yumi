import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Model, Types } from 'mongoose';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserDocument } from 'src/common/schemas/user.schema';
import {
  OtpChannel,
  OtpDocument,
  OtpPurpose,
  OtpStatus,
} from 'src/common/schemas/otp.schema';
import { SmsService } from '../auth/services/sms.service';

type AvatarUploadFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Injectable()
export class UsersService {
  private supabaseClient?: SupabaseClient;

  constructor(
    @InjectModel('User') private readonly userModel: Model<UserDocument>,
    @InjectModel('Otp') private readonly otpModel: Model<OtpDocument>,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    return {
      success: true,
      user: this.toProfileResponse(user),
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    avatarFile?: AvatarUploadFile,
  ) {
    console.log('updateProfile request:', {
      userId,
      name: dto.name ?? null,
      phone: dto.phone ?? null,
      hasAvatar: !!avatarFile,
      avatarMimeType: avatarFile?.mimetype ?? null,
      avatarOriginalName: avatarFile?.originalname ?? null,
    });

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (dto.name !== undefined) {
      user.fullName = dto.name.trim();
    }

    if (avatarFile) {
      user.avatarUrl = await this.saveAvatarFile(
        avatarFile,
        userId,
        user.avatarUrl ?? undefined,
      );
      console.log('avatar uploaded url:', user.avatarUrl);
    }

    await user.save();

    console.log('user profile saved:', {
      userId: user.id,
      avatarUrl: user.avatarUrl ?? null,
      fullName: user.fullName,
      phone: user.phone ?? null,
    });

    return {
      success: true,
      message: 'Cập nhật thông tin thành công',
      user: this.toProfileResponse(user),
    };
  }

  async sendPhoneVerificationOtp(userId: string, phone: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const twoMinuteAgo = new Date(Date.now() - 2 * 60 * 1000);
    const recentOtp = await this.otpModel.findOne({
      userId: new Types.ObjectId(userId),
      purpose: OtpPurpose.VERIFY_PHONE,
      createdAt: { $gte: twoMinuteAgo, $lte: new Date() },
    });

    if (recentOtp) {
      return {
        success: false,
        message: 'Vui lòng thử lại sau 2 phút',
      };
    }

    await this.otpModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        purpose: OtpPurpose.VERIFY_PHONE,
        status: OtpStatus.PENDING,
      },
      { status: OtpStatus.CANCELLED },
    );

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    await this.otpModel.create({
      userId: new Types.ObjectId(userId),
      purpose: OtpPurpose.VERIFY_PHONE,
      channel: OtpChannel.SMS,
      recipient: phone,
      otpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await this.smsService.sendOtp(phone, otp);

    return {
      success: true,
      message: 'OTP đã được gửi thành công',
    };
  }

  async verifyPhoneVerificationOtp(userId: string, otp: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const otpRecord = await this.otpModel
      .findOne({
        userId: new Types.ObjectId(userId),
        purpose: OtpPurpose.VERIFY_PHONE,
        status: OtpStatus.PENDING,
      })
      .sort({ createdAt: -1 });

    if (!otpRecord) {
      return {
        success: false,
        message: 'Không tìm thấy OTP',
      };
    }

    if (otpRecord.expiresAt < new Date()) {
      await this.otpModel.updateOne(
        { _id: otpRecord._id },
        { status: OtpStatus.EXPIRED },
      );
      return {
        success: false,
        message: 'OTP đã hết hạn',
      };
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isMatch) {
      return {
        success: false,
        message: 'OTP không hợp lệ',
      };
    }

    await this.otpModel.updateOne(
      { _id: otpRecord._id },
      { verifiedAt: new Date(), status: OtpStatus.VERIFIED },
    );

    user.phone = otpRecord.recipient;
    user.phoneVerified = true;
    await user.save();

    return {
      success: true,
      message: 'Xác minh số điện thoại thành công',
      user: this.toProfileResponse(user),
    };
  }

  private toProfileResponse(user: UserDocument) {
    return {
      id: user.id,
      display_name: user.fullName ?? null,
      avatar_url: user.avatarUrl ?? null,
      phone: user.phone ?? null,
      phoneVerified: user.phoneVerified === true,
      email: user.email,
      role: user.role,
      joined_at: user.createdAt ?? null,
    };
  }

  private async saveAvatarFile(
    avatarFile: AvatarUploadFile,
    userId: string,
    currentAvatarUrl?: string,
  ) {
    const bucket = this.getAvatarBucket();
    const fileExtension = this.resolveExtension(avatarFile);
    const filePath = `${userId}/${randomUUID()}${fileExtension}`;
    const supabase = this.getSupabaseClient();

    console.log('Uploading avatar to Supabase:', {
      bucket,
      filePath,
      mimeType: avatarFile.mimetype,
      size: avatarFile.size,
    });

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, avatarFile.buffer, {
        contentType: avatarFile.mimetype,
        cacheControl: '31536000',
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(
        `Upload avatar lên Supabase thất bại: ${error.message}`,
      );
    }

    await this.removePreviousAvatar(currentAvatarUrl);

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    console.log('Supabase public url:', data.publicUrl);
    return data.publicUrl;
  }

  private resolveExtension(avatarFile: AvatarUploadFile) {
    if (avatarFile.mimetype === 'image/png') {
      return '.png';
    }

    const originalExtension = extname(avatarFile.originalname).toLowerCase();
    return ['.jpg', '.jpeg'].includes(originalExtension) ? '.jpg' : '.jpg';
  }

  private async removePreviousAvatar(currentAvatarUrl?: string) {
    const previousPath = this.extractSupabaseObjectPath(currentAvatarUrl);
    if (!previousPath) {
      return;
    }

    const { error } = await this.getSupabaseClient()
      .storage.from(this.getAvatarBucket())
      .remove([previousPath]);

    if (error) {
      throw new InternalServerErrorException(
        `Xóa avatar cũ trên Supabase thất bại: ${error.message}`,
      );
    }
  }

  private getSupabaseClient() {
    if (this.supabaseClient) {
      return this.supabaseClient;
    }

    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !serviceRoleKey) {
      throw new InternalServerErrorException(
        'Thieu SUPABASE_URL hoac SUPABASE_SERVICE_ROLE_KEY trong .env',
      );
    }

    this.supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return this.supabaseClient;
  }

  private getAvatarBucket() {
    return (
      this.configService.get<string>('SUPABASE_STORAGE_BUCKET') ?? 'avatars'
    );
  }

  private extractSupabaseObjectPath(currentAvatarUrl?: string) {
    if (!currentAvatarUrl) {
      return null;
    }

    const bucket = this.getAvatarBucket();
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIndex = currentAvatarUrl.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    return decodeURIComponent(
      currentAvatarUrl.slice(markerIndex + marker.length),
    );
  }
}
