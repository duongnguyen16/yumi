import {
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { SearchDto } from './dto/search.dto';
import { LocationService } from './location.service';

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
    try {
      const { keyword, categoryId, subCategoryId, limit, page, lat, lng } =
        query;
      const result = await this.locationService.searchLocation(
        limit,
        page,
        lat,
        lng,
        keyword,
        categoryId,
        subCategoryId,
      );
      if (!result?.success) {
        if (result?.statusCode === 404) {
          throw new NotFoundException('Không tìm thấy địa điểm nào');
        }
      }
    } catch (error) {
      console.log('Error occur at searchLocation: ', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Xảy ra lỗi khi tìm kiếm địa điểm',
      );
    }
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
    const result = await this.locationService.getLocationById(
      locationId,
      req.user.userId,
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
    return this.locationService.viewCount(req.user.userId, locationId);
  }
}
