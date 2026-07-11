import { Body, Controller, Post, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyzeLocationDraftDto } from './dto/analyze-location-draft.dto';
import { SubmitLocationRequestDto } from './dto/submit-location-request.dto';
import { ValidateLocationPositionDto } from './dto/validate-location-position.dto';
import { LocationContributionsService } from './location-contributions.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('location/contribution')
@UseGuards(AuthGuard('jwt-at'))
export class LocationContributionsController {
  constructor(
    private readonly locationContributionsService: LocationContributionsService,
  ) {}

  @Get('options')
  getContributionOptions() {
    return this.locationContributionsService.getContributionOptions();
  }

  @Post('analyze')
  analyzeDraft(@Body() dto: AnalyzeLocationDraftDto) {
    return this.locationContributionsService.analyzeDraft(dto);
  }

  @Post('validate-position')
  validatePosition(@Body() dto: ValidateLocationPositionDto) {
    return this.locationContributionsService.validateContributionPosition(dto);
  }

  @Post('submit')
  submitContribution(
    @Body() dto: SubmitLocationRequestDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.locationContributionsService.submitContribution(
      req.user.userId,
      dto,
    );
  }
}
