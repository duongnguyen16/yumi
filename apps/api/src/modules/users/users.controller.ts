import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Request,
  UnauthorizedException,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseFilePipeBuilder } from '@nestjs/common';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  SendPhoneVerificationOtpDto,
  VerifyPhoneVerificationOtpDto,
} from './dto/phone-verification.dto';
import { UsersService } from './users.service';

type AvatarUploadFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Controller('users')
@UseGuards(AuthGuard('jwt-at'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Request() req: any) {
    const userId = this.extractUserId(req);
    return this.usersService.getProfile(userId);
  }

  @Post('profile/phone/send-otp')
  async sendPhoneVerificationOtp(
    @Request() req: any,
    @Body() body: SendPhoneVerificationOtpDto,
  ) {
    const userId = this.extractUserId(req);
    return this.usersService.sendPhoneVerificationOtp(userId, body.phone);
  }

  @Post('profile/phone/verify-otp')
  async verifyPhoneVerificationOtp(
    @Request() req: any,
    @Body() body: VerifyPhoneVerificationOtpDto,
  ) {
    const userId = this.extractUserId(req);
    return this.usersService.verifyPhoneVerificationOtp(userId, body.otp);
  }

  @Patch('profile')
  @UseInterceptors(
    FileInterceptor('avatar', {
      fileFilter: (_req, file, callback) => {
        if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype)) {
          return callback(
            new UnsupportedMediaTypeException(
              'Avatar chi chap nhan file jpg/png',
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async updateProfile(
    @Request() req: any,
    @Body() body: UpdateProfileDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({
          maxSize: 2 * 1024 * 1024,
        })
        .addFileTypeValidator({
          fileType: /(image\/jpeg|image\/jpg|image\/png)$/,
        })
        .build({
          fileIsRequired: false,
          errorHttpStatusCode: 400,
        }),
    )
    avatar?: AvatarUploadFile,
  ) {
    const userId = this.extractUserId(req);
    return this.usersService.updateProfile(userId, body, avatar);
  }

  private extractUserId(req: any) {
    const userId = (req as { user?: { userId?: string } }).user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy người dùng');
    }

    return userId;
  }
}
