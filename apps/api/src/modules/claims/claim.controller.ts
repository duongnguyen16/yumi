import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Post,
  Request as NestRequest,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { parseMultipartDto } from 'src/common/utils/parse-multipart-dto';
import { ClaimService } from './claim.service';
import { StartClaimDto } from './dto/start-claim.dto';
import { SubmitClaimUploadDto } from './dto/submit-claim-upload.dto';
import { VerifyClaimOtpDto } from './dto/verify-claim-otp.dto';

interface AuthenticatedRequest extends Request {
  user: { userId: string };
}

interface ServiceResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
}

@ApiTags('claims')
@ApiBearerAuth()
@Controller('claims')
@UseGuards(AuthGuard('jwt-at'))
export class ClaimController {
  constructor(private readonly service: ClaimService) {}

  // bắt đầu claim

  @Post('start')
  async start(
    @Body() body: StartClaimDto,
    @NestRequest() req: AuthenticatedRequest,
  ) {
    return this.handle(
      await this.service.start(body.locationId, req.user.userId),
    );
  }

  // check otp
  @Post('verify-otp')
  async verifyOtp(
    @Body() body: VerifyClaimOtpDto,
    @NestRequest() req: AuthenticatedRequest,
  ) {
    return this.handle(
      await this.service.verifyOtp(body.locationId, req.user.userId, body.otp),
    );
  }

  // gửi req
  @Post('submit')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 5 },
        { name: 'license', maxCount: 1 },
      ],
      { limits: { fileSize: 5 * 1024 * 1024 } },
    ),
  )
  async submit(
    @Body('data') data: string,
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
      license?: Express.Multer.File[];
    },
    @NestRequest() req: AuthenticatedRequest,
  ) {
    const dto = parseMultipartDto(data, SubmitClaimUploadDto);
    return this.handle(
      await this.service.submitWithImages(
        dto,
        req.user.userId,
        files?.images ?? [],
        files?.license?.[0],
      ),
    );
  }

  private handle<T extends ServiceResponse>(result: T) {
    if (result.success) return result;
    switch (result.statusCode) {
      case 400:
        throw new BadRequestException(result.message);
      case 404:
        throw new NotFoundException(result.message);
      case 403:
        throw new ForbiddenException(result.message);
      case 409:
        throw new ConflictException(result.message);
      case 410:
        throw new HttpException(
          result.message ?? 'Phiên xác minh đã hết hạn',
          HttpStatus.GONE,
        );
      case 429:
        throw new HttpException(
          result.message ?? 'Bạn đã thử quá nhiều lần',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      default:
        throw new InternalServerErrorException(result.message);
    }
  }
}
