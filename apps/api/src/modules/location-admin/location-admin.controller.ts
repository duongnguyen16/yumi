import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { LocationRequestStatus } from 'src/common/schemas/location-request';
import { ReviewLocationRequestDto } from './dto/review-location-request.dto';
import { LocationAdminService } from './location-admin.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('location/admin/requests')
@UseGuards(AuthGuard('jwt-at'), AdminGuard)
export class LocationAdminController {
  constructor(private readonly locationAdminService: LocationAdminService) {}

  @Get()
  getPendingRequests(@Query('status') status?: LocationRequestStatus) {
    return this.locationAdminService.getPendingRequests(status);
  }

  @Get(':id')
  getRequestDetail(@Param('id') requestId: string) {
    return this.locationAdminService.getRequestDetail(requestId);
  }

  @Patch(':id/approve')
  approveRequest(
    @Param('id') requestId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.locationAdminService.approveRequest(requestId, req.user.userId);
  }

  @Patch(':id/reject')
  rejectRequest(
    @Param('id') requestId: string,
    @Body() dto: ReviewLocationRequestDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!dto.rejectReason?.trim()) {
      throw new BadRequestException('Cần lý do từ chối địa điểm');
    }

    return this.locationAdminService.rejectRequest(
      requestId,
      req.user.userId,
      dto.rejectReason.trim(),
    );
  }
}
