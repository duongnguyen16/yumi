import { Body, Controller, Param, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateLocationReportDto } from './dto/create-location-report.dto';
import { LocationReportsService } from './location-reports.service';

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller('locations/:locationId/reports')
export class LocationReportsController {
  constructor(
    private readonly locationReportsService: LocationReportsService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt-at'))
  create(
    @Param('locationId') locationId: string,
    @Body() dto: CreateLocationReportDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.locationReportsService.create(
      request.user.userId,
      locationId,
      dto,
    );
  }
}
