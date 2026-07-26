import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
  Post,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VendorGuard } from 'src/common/guard/vendor.guard';
import { UpdateLocationDto } from './dto/vendor-update-location.dto';
import { VendorLocationsService } from './vendor-locations.service';
import { CreateLocationDto } from './dto/vendor-register-location.dto';
import { CreateLocationRequestDataDto } from './dto/vendor-register-location-request.dto';
// import { CheckUserGuard } from 'src/common/guard/check-user.guard';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { CheckUserGuard } from 'src/common/guard/check-user.guard';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('location')
export class VendorLocationsController {
  constructor(
    private readonly vendorLocationsService: VendorLocationsService,
  ) {}

  @Post('update/send-otp')
  @UseGuards(AuthGuard('jwt-at'))
  async sendOtpUpdatePhone(
    @Request() req: AuthenticatedRequest,
    @Body('locationId') locationId: string,
    @Body('newPhone') newPhone: string,
  ) {
    try {
      if (!locationId || !newPhone) {
        throw new BadRequestException('Dữ liệu không hợp lệ');
      }
      const result = await this.vendorLocationsService.sendOtpUpdatePhone(
        req.user.userId,
        locationId,
        newPhone,
      );
      if (!result.success) {
        if (result.statusCode === 400) {
          throw new BadRequestException(result.message);
        }
        if (result.statusCode === 404) {
          throw new NotFoundException(result.message);
        }
        if (result.statusCode === 500) {
          throw new InternalServerErrorException(result.message);
        }
        if (result.statusCode === 429) {
          throw new BadRequestException(result.message);
        }
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error in sendOtpUpdatePhone controller:', error);
      throw new InternalServerErrorException(
        'Xảy ra lỗi khi gửi OTP cập nhật số điện thoại',
      );
    }
  }

  @Post('update/verify-otp')
  @UseGuards(AuthGuard('jwt-at'))
  async verifyOtpUpdatePhone(
    @Request() req: AuthenticatedRequest,
    @Body('locationId') locationId: string,
    @Body('otp') otp: string,
  ) {
    try {
      const result = await this.vendorLocationsService.verifyOtpUpdatePhone(
        req.user.userId,
        locationId,
        otp,
      );
      if (!result.success) {
        if (result.statusCode === 400) {
          throw new BadRequestException(result.message);
        }
        if (result.statusCode === 404) {
          throw new NotFoundException(result.message);
        }
        if (result.statusCode === 500) {
          throw new InternalServerErrorException(result.message);
        }
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error in verifyOtpUpdatePhone controller:', error);
      throw new InternalServerErrorException(
        'Xảy ra lỗi khi xác thực OTP cập nhật số điện thoại',
      );
    }
  }

  @Post('update/:locationId')
  @UseGuards(AuthGuard('jwt-at'), CheckUserGuard, VendorGuard)
  @UseInterceptors(FilesInterceptor('media', 5))
  async updateLocation(
    @Param('locationId') locationId: string,
    @Body('data') data: string,
    @UploadedFiles() file: Express.Multer.File[],
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      file.forEach((f) => {
        if (f.mimetype !== 'image/jpeg' && f.mimetype !== 'image/png') {
          throw new BadRequestException(
            'Chỉ chấp nhận định dạng ảnh jpeg hoặc png cho ảnh địa điểm',
          );
        }
        if (f.size > 10 * 1024 * 1024) {
          throw new BadRequestException(
            'Kích thước ảnh địa điểm không được vượt quá 10MB',
          );
        }
      });
      const dataParsed: unknown = JSON.parse(data);
      const dto = plainToInstance(UpdateLocationDto, dataParsed);
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      if (errors.length > 0) {
        throw new BadRequestException(errors);
      }
      const result = await this.vendorLocationsService.updateLocation(
        locationId,
        dto,
        req.user.userId,
        file,
      );
      if (!result.success) {
        if (result.statusCode === 400) {
          throw new BadRequestException(result.message);
        }
        if (result.statusCode === 403) {
          throw new ForbiddenException(result.message);
        }
        if (result.statusCode === 404) {
          throw new NotFoundException(result.message);
        }
        if (result.statusCode === 500) {
          throw new InternalServerErrorException(result.message);
        }
      }

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error in updateLocation controller:', error);
      throw new InternalServerErrorException(
        'Xảy ra lỗi khi cập nhật địa điểm',
      );
    }
  }

  @Post(':locationId/images')
  @UseGuards(AuthGuard('jwt-at'), CheckUserGuard, VendorGuard)
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      limits: { files: 5, fileSize: 10 * 1024 * 1024 },
    }),
  )
  async addImages(
    @Param('locationId') locationId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: AuthenticatedRequest,
  ) {
    this.validateLocationImageFiles(files);
    return this.throwImageManagementError(
      await this.vendorLocationsService.addImagesToLocation(
        locationId,
        req.user.userId,
        files,
      ),
    );
  }

  @Patch(':locationId/images/cover')
  @UseGuards(AuthGuard('jwt-at'), CheckUserGuard, VendorGuard)
  async setCoverImage(
    @Param('locationId') locationId: string,
    @Body('imageUrl') imageUrl: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!imageUrl?.trim()) {
      throw new BadRequestException('Thiếu ảnh cần đặt làm ảnh bìa');
    }

    return this.throwImageManagementError(
      await this.vendorLocationsService.setLocationCoverImage(
        locationId,
        req.user.userId,
        imageUrl,
      ),
    );
  }

  private validateLocationImageFiles(files: Express.Multer.File[]) {
    if (!files?.length || files.length > 5) {
      throw new BadRequestException('Chọn từ 1 đến 5 ảnh');
    }

    for (const file of files) {
      if (file.mimetype !== 'image/jpeg' && file.mimetype !== 'image/png') {
        throw new BadRequestException('Chỉ chấp nhận ảnh JPEG hoặc PNG');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new BadRequestException(
          'Kích thước ảnh địa điểm không được vượt quá 10MB',
        );
      }
    }
  }

  private throwImageManagementError<
    T extends {
      success: boolean;
      message: string;
      statusCode?: number;
    },
  >(result: T) {
    if (result.success) {
      return result;
    }

    switch (result.statusCode) {
      case 400:
        throw new BadRequestException(result.message);
      case 403:
        throw new ForbiddenException(result.message);
      case 404:
        throw new NotFoundException(result.message);
      default:
        throw new InternalServerErrorException(result.message);
    }
  }

  @Post('register')
  @UseGuards(AuthGuard('jwt-at'), CheckUserGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'videoFiles', maxCount: 2 },
        { name: 'licenseFiles', maxCount: 3 },
        { name: 'imageFiles', maxCount: 5 },
      ],
      {
        limits: {
          fileSize: 50 * 1024 * 1024,
          files: 10,
        },
      },
    ),
  )
  async registerLocation(
    @Body('request') requestData: string,
    @Body('locationData') locationData: string,
    @Request() req: AuthenticatedRequest,
    @UploadedFiles()
    files: {
      videoFiles?: Express.Multer.File[];
      licenseFiles?: Express.Multer.File[];
      imageFiles?: Express.Multer.File[];
    },
  ) {
    try {
      let requestDataParsed: unknown;
      let locationDataParsed: unknown;
      try {
        requestDataParsed = JSON.parse(requestData);
        locationDataParsed = JSON.parse(locationData);
      } catch {
        throw new BadRequestException('Dữ liệu đăng ký không hợp lệ');
      }
      const validateLocationData = plainToInstance(
        CreateLocationDto,
        locationDataParsed,
      );
      const validateLocationRequest = plainToInstance(
        CreateLocationRequestDataDto,
        requestDataParsed,
      );
      const [locationDataErrors, locationRequestErrors] = await Promise.all([
        validate(validateLocationData, {
          whitelist: true,
          forbidNonWhitelisted: true,
        }),
        validate(validateLocationRequest, {
          whitelist: true,
          forbidNonWhitelisted: true,
        }),
      ]);
      if (locationDataErrors.length > 0 || locationRequestErrors.length > 0) {
        throw new BadRequestException([
          ...locationDataErrors,
          ...locationRequestErrors,
        ]);
      }
      files.videoFiles?.forEach((file) => {
        if (
          file.mimetype !== 'video/mp4' &&
          file.mimetype !== 'video/quicktime'
        ) {
          throw new BadRequestException(
            'Chỉ chấp nhận định dạng video mp4 hoặc mov',
          );
        }
        if (file.size > 50 * 1024 * 1024) {
          throw new BadRequestException(
            'Kích thước video không được vượt quá 50MB',
          );
        }
        const duration = (file as Express.Multer.File & { duration?: number })
          .duration;
        if (typeof duration === 'number' && duration / 1000 > 60) {
          throw new BadRequestException(
            'Thời lượng video không được vượt quá 60 giây',
          );
        }
      });
      files.licenseFiles?.forEach((file) => {
        if (file.mimetype !== 'image/jpeg' && file.mimetype !== 'image/png') {
          throw new BadRequestException(
            'Chỉ chấp nhận định dạng ảnh jpeg hoặc png cho giấy phép',
          );
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new BadRequestException(
            'Kích thước ảnh giấy phép không được vượt quá 10MB',
          );
        }
      });
      files.imageFiles?.forEach((file) => {
        if (file.mimetype !== 'image/jpeg' && file.mimetype !== 'image/png') {
          throw new BadRequestException(
            'Chỉ chấp nhận định dạng ảnh jpeg hoặc png cho ảnh địa điểm',
          );
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new BadRequestException(
            'Kích thước ảnh địa điểm không được vượt quá 10MB',
          );
        }
      });
      const result = await this.vendorLocationsService.registerLocation(
        req.user.userId,
        validateLocationRequest,
        validateLocationData,
        files,
      );
      if (!result.success) {
        if (result.statusCode === 400) {
          throw new BadRequestException(result.message);
        }
        if (result.statusCode === 404) {
          throw new NotFoundException(result.message);
        }
        if (result.statusCode === 500) {
          throw new InternalServerErrorException(result.message);
        }
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error in registerLocation controller:', error);
      throw new InternalServerErrorException('Xảy ra lỗi khi đăng ký địa điểm');
    }
  }

  @Get('owned')
  @UseGuards(AuthGuard('jwt-at'), VendorGuard)
  async listOwnedLocations(@Request() req: AuthenticatedRequest) {
    return this.vendorLocationsService.listOwnedLocations(req.user.userId);
  }

  @Get('register/code')
  @UseGuards(AuthGuard('jwt-at'))
  async generateSystemCode(@Request() req: AuthenticatedRequest) {
    const result = await this.vendorLocationsService.generateSystemCode(
      req.user.userId,
    );
    if (!result.success) {
      if (result.statusCode === 400) {
        throw new BadRequestException(result.message);
      }
      if (result.statusCode === 404) {
        throw new NotFoundException(result.message);
      }
      if (result.statusCode === 500) {
        throw new InternalServerErrorException(result.message);
      }
    }
    return result;
  }

  @Post('reply')
  @UseGuards(AuthGuard('jwt-at'))
  async replyReview(
    @Request() req: AuthenticatedRequest,
    @Body('data')
    data: ReplyReviewDto,
  ) {
    const { content, reviewId } = data;
    const vendorId = req.user.userId;
    const result = await this.vendorLocationsService.replyReview(
      vendorId,
      content,
      reviewId,
    );
    if (result?.success === false) {
      if (result?.statusCode === 404) {
        throw new NotFoundException(result?.message);
      }
      if (result?.statusCode === 500) {
        throw new InternalServerErrorException(result?.message);
      }
      if (result?.statusCode === 400) {
        throw new BadRequestException(result?.message);
      }
      if (result?.statusCode === 403) {
        throw new ForbiddenException(result?.message);
      }
    }
    return result;
  }

  @Patch('reply/edit')
  @UseGuards(AuthGuard('jwt-at'))
  async editReply(
    @Request() req: AuthenticatedRequest,
    @Body('data') data: ReplyReviewDto,
  ) {
    const { content, reviewId } = data;
    const vendorId = req.user.userId;
    const result = await this.vendorLocationsService.editReply(
      vendorId,
      content,
      reviewId,
    );
    if (result?.success === false) {
      if (result?.statusCode === 404) {
        throw new NotFoundException(result?.message);
      }
      if (result?.statusCode === 500) {
        throw new InternalServerErrorException(result?.message);
      }
      if (result?.statusCode === 400) {
        throw new BadRequestException(result?.message);
      }
      if (result?.statusCode === 403) {
        throw new ForbiddenException(result?.message);
      }
    }
    return result;
  }
}
