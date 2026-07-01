import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { LocationService } from './location.service';
import { AuthGuard } from '@nestjs/passport';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}
  @Get()
  //   @UseGuards(AuthGuard('jwt-at'))
  async getAllLocations() {
    const result = await this.locationService.getAllLocations();
    if (!result.success) {
      if (result.statusCode === 404) {
        throw new NotFoundException('Không tìm thấy địa điểm nào');
      } else {
        throw new InternalServerErrorException('Xảy ra lỗi khi lấy địa điểm');
      }
    }
    return result;
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
}
