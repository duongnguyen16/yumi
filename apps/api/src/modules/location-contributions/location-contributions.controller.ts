import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
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
  @UseInterceptors(FilesInterceptor('imageFiles', 5))
  async submitContribution(
    @Body('data') data: string,
    @UploadedFiles() imageFiles: Express.Multer.File[],
    @Request() req: AuthenticatedRequest,
  ) {
    if (!imageFiles || imageFiles.length === 0) {
      throw new BadRequestException('Hãy tải lên ít nhất 1 ảnh địa điểm');
    }

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(data);
    } catch {
      throw new BadRequestException('Dữ liệu đóng góp không hợp lệ');
    }

    const dto = plainToInstance(SubmitLocationRequestDto, parsedData);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return this.locationContributionsService.submitContribution(
      req.user.userId,
      dto,
      imageFiles,
    );
  }
}
