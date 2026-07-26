import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { OwnershipImagesService } from './ownership-images.service';

type AuthenticatedRequest = Request & {
  user?: {
    userId?: string;
  };
};

@Controller('ownership-images')
export class OwnershipImagesController {
  constructor(private readonly service: OwnershipImagesService) {}

  @Post('upload')
  @UseGuards(AuthGuard('jwt-at'))
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  upload(
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.uploadFile(request, file);
  }

  @Post('appeal/upload')
  @UseGuards(AuthGuard('jwt-appeal-access'))
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  uploadAppeal(
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.uploadFile(request, file);
  }

  private uploadFile(
    request: AuthenticatedRequest,
    file: Express.Multer.File | undefined,
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy thông tin xác thực');
    }
    if (!file) {
      throw new BadRequestException('Không có ảnh được tải lên');
    }

    return this.service.upload(userId, file);
  }
}
