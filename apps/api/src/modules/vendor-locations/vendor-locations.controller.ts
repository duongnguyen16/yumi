import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
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
      console.error('Error in verifyOtpUpdatePhone controller:', error);
      throw new InternalServerErrorException(
        'Xảy ra lỗi khi xác thực OTP cập nhật số điện thoại',
      );
    }
  }

  @Post('update/:locationId')
  @UseGuards(AuthGuard('jwt-at'), VendorGuard)
  @UseInterceptors(FilesInterceptor('media', 10))
  async updateLocation(
    @Param('locationId') locationId: string,
    @Body('data') data: string,
    @UploadedFiles() file: Express.Multer.File[],
    @Request() req: AuthenticatedRequest,
  ) {
    try {
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
          throw new BadRequestException(result.message);
        }
      }

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
      const requestDataParsed = JSON.parse(requestData);
      const locationDataParsed = JSON.parse(locationData);
      const validateLocationData = plainToInstance(
        CreateLocationDto,
        locationDataParsed,
      );
      const validateLocationRequest = plainToInstance(
        CreateLocationRequestDataDto,
        requestDataParsed,
      );
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
      console.error('Error in registerLocation controller:', error);
      throw new InternalServerErrorException('Xảy ra lỗi khi đăng ký địa điểm');
    }
  }

  @Get('register/code')
  @UseGuards(AuthGuard('jwt-at'))
  generateSystemCode() {
    return { code: this.vendorLocationsService.generateSystemCode() };
  }
}
