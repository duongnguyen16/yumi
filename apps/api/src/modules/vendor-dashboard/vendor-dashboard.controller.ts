import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VendorGuard } from 'src/common/guard/vendor.guard';
import { VendorDashboardService } from './vendor-dashboard.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string };
}

@Controller('vendor/dashboard')
@UseGuards(AuthGuard('jwt-at'), VendorGuard)
export class VendorDashboardController {
  constructor(
    private readonly vendorDashboardService: VendorDashboardService,
  ) {}

  @Get('overview')
  getOverview(@Request() req: AuthenticatedRequest) {
    return this.vendorDashboardService.getOverview(req.user.userId);
  }

  @Get('locations')
  getLocationStats(
    @Request() req: AuthenticatedRequest,
    @Query('days') days?: string,
  ) {
    const d = days ? Math.max(1, parseInt(days, 10) || 30) : undefined;
    return this.vendorDashboardService.getLocationStats(req.user.userId, d);
  }
}
