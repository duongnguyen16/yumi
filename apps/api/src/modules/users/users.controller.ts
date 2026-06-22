import {
  Body,
  Controller,
  Get,
  Patch,
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

  @Patch('profile')
  @UseInterceptors(
    FileInterceptor('avatar', {
      fileFilter: (_req, file, callback) => {
        if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
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
          fileType: /(image\/jpeg|image\/png)$/,
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
      throw new UnauthorizedException('Khong tim thay nguoi dung');
    }

    return userId;
  }
}
