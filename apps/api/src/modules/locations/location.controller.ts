import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SearchDto } from './dto/search.dto';
import { Throttle } from '@nestjs/throttler';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { LocationRequestStatus } from 'src/common/schemas/location-request';
import { LocationService } from './location.service';
import { AnalyzeLocationDraftDto } from './dto/analyze-location-draft.dto';
import { SubmitLocationRequestDto } from './dto/submit-location-request.dto';
import { ValidateLocationPositionDto } from './dto/validate-location-position.dto';
import { ReviewLocationRequestDto } from './dto/review-location-request.dto';
import { VendorGuard } from 'src/common/guard/vendor.guard';
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateLocationDto } from './dto/vendor-update-location.dto';
import { CreateLocationDto } from './dto/vendor-register-location.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get()
  async getAllLocations() {
    const result = await this.locationService.getAllLocations();
    if (!result.success) {
      if (result.statusCode === 404) {
        throw new NotFoundException('Không tìm thấy địa điểm nào');
      }
      throw new InternalServerErrorException('Xảy ra lỗi khi lấy địa điểm');
    }
    return result;
  }

  @Get('search')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @UseGuards(AuthGuard('jwt-at'))
  async searchLocation(@Query() query: SearchDto) {
    const { keyword, categoryId, subCategoryId, limit, page, lat, lng } = query;
    const response = await this.locationService.searchLocation(
      limit,
      page,
      lat,
      lng,
      keyword,
      categoryId,
      subCategoryId,
    );
    console.log('Search response:', response);
    return response;
  }

  @Get('contribution/options')
  @UseGuards(AuthGuard('jwt-at'))
  getContributionOptions() {
    return this.locationService.getContributionOptions();
  }

  @Post('contribution/analyze')
  @UseGuards(AuthGuard('jwt-at'))
  analyzeDraft(@Body() dto: AnalyzeLocationDraftDto) {
    return this.locationService.analyzeDraft(dto);
  }

  @Post('contribution/validate-position')
  @UseGuards(AuthGuard('jwt-at'))
  validatePosition(@Body() dto: ValidateLocationPositionDto) {
    return this.locationService.validateContributionPosition(dto);
  }

  @Post('contribution/submit')
  @UseGuards(AuthGuard('jwt-at'))
  submitContribution(
    @Body() dto: SubmitLocationRequestDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.locationService.submitContribution(req.user.userId, dto);
  }

  @Get('admin/requests')
  @UseGuards(AuthGuard('jwt-at'), AdminGuard)
  getPendingRequests(@Query('status') status?: LocationRequestStatus) {
    return this.locationService.getPendingRequests(status);
  }

  @Get('admin/requests/:id')
  @UseGuards(AuthGuard('jwt-at'), AdminGuard)
  getRequestDetail(@Param('id') requestId: string) {
    return this.locationService.getRequestDetail(requestId);
  }

  @Patch('admin/requests/:id/approve')
  @UseGuards(AuthGuard('jwt-at'), AdminGuard)
  approveRequest(
    @Param('id') requestId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.locationService.approveRequest(requestId, req.user.userId);
  }

  @Patch('admin/requests/:id/reject')
  @UseGuards(AuthGuard('jwt-at'), AdminGuard)
  rejectRequest(
    @Param('id') requestId: string,
    @Body() dto: ReviewLocationRequestDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!dto.rejectReason?.trim()) {
      throw new BadRequestException('Cần lý do từ chối địa điểm');
    }

    return this.locationService.rejectRequest(
      requestId,
      req.user.userId,
      dto.rejectReason.trim(),
    );
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt-at'))
  async getLocationById(
    @Param('id') locationId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!locationId) {
      throw new NotFoundException('Không tìm thấy địa điểm với ID này');
    }
    const userId = req.user.userId;
    const result = await this.locationService.getLocationById(
      locationId,
      userId,
    );
    if (!result.success) {
      throw new NotFoundException('Không tìm thấy địa điểm');
    }
    return result;
  }

  @Post('view-count/:id')
  @UseGuards(AuthGuard('jwt-at'))
  async viewCountController(
    @Param('id') locationId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!locationId) {
      return;
    }
    const userId = req.user.userId;
    await this.locationService.viewCount(userId, locationId);
  }

  @Post('update/:locationId')
  @UseGuards(AuthGuard('jwt-at'), VendorGuard)
  @UseInterceptors(FilesInterceptor('media', 10))
  async updateLocation(
    @Param('locationId') locationId: string,
    @Body('data') data: string,
    @UploadedFiles() file: Express.Multer.File[],
    @Request() req: any,
  ) {
    try {
      const dataParsed: any = JSON.parse(data);
      const dto = plainToInstance(UpdateLocationDto, dataParsed);
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      console.log('file:', file);
      if (errors.length > 0) {
        throw new BadRequestException(errors);
      }
      const result = await this.locationService.updateLocation(
        locationId,
        dto,
        req?.user?.userId as string,
        file,
      );
      return result;
    } catch (error) {
      console.error('Error in updateLocation controller:', error);
      throw new InternalServerErrorException(
        'Xảy ra lỗi khi cập nhật địa điểm',
      );
    }
  }

  @Post('register')
  @UseGuards(AuthGuard('jwt-at'))
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'videoFiles', maxCount: 10 },
      { name: 'licenseFiles', maxCount: 10 },
      { name: 'imageFiles', maxCount: 10 },
    ]),
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
      const requestDataParsed: any = JSON.parse(requestData);
      const locationDataParsed: any = JSON.parse(locationData);
      const result = await this.locationService.registerLocation(
        req.user.userId,
        requestDataParsed,
        locationDataParsed,
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
      console.error('Error in registerLocation controller:', error);
      throw new InternalServerErrorException('Xảy ra lỗi khi đăng ký địa điểm');
    }
  }

  @Get('register/code')
  @UseGuards(AuthGuard('jwt-at'))
  generateSystemCode() {
    return { code: this.locationService.generateSystemCode() };
  }
}
