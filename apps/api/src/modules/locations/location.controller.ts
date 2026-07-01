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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SearchDto } from './dto/search.dto';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { LocationRequestStatus } from 'src/common/schemas/location-request';
import { LocationService } from './location.service';
import { AnalyzeLocationDraftDto } from './dto/analyze-location-draft.dto';
import { SubmitLocationRequestDto } from './dto/submit-location-request.dto';
import { ValidateLocationPositionDto } from './dto/validate-location-position.dto';
import { ReviewLocationRequestDto } from './dto/review-location-request.dto';

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
        throw new NotFoundException('Khong tim thay dia diem nao');
      }
      throw new InternalServerErrorException('Xay ra loi khi lay dia diem');
    }
    return result;
  }

  @Get('search')
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
      throw new BadRequestException('Can ly do tu choi dia diem');
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
      throw new NotFoundException('Khong tim thay dia diem voi ID nay');
    }
    const userId = req.user.userId;
    const result = await this.locationService.getLocationById(locationId, userId);
    if (!result.success) {
      throw new NotFoundException('Khong tim thay dia diem');
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
