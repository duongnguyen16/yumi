import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { ImagesService } from './images.service';
import { ValidateImageDto } from './dto/validate-image.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';

@Controller('images')
@UseGuards(AuthGuard('jwt-at'))
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post('validate')
  validateImage(@Body() dto: ValidateImageDto) {
    return this.imagesService.validateImage(dto);
  }

  @Post('upload-url')
  createUploadUrl(
    @Req() req: Request & { user?: { userId?: string } },
    @Body() dto: CreateUploadUrlDto,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy thông tin xác thực');
    }

    return this.imagesService.createUploadUrl(userId, dto);
  }
}
