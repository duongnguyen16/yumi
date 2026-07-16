import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Post,
  Request as NestRequest,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClaimService } from './claim.service';
import { StartClaimDto } from './dto/start-claim.dto';
import { SubmitClaimDto } from './dto/submit-claim.dto';
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
  async start(@Body() body: StartClaimDto, @NestRequest() req: AuthenticatedRequest) {
    return this.handle(await this.service.start(body.locationId, req.user.userId));
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
  async submit(@Body() body: SubmitClaimDto, @NestRequest() req: AuthenticatedRequest) {
    return this.handle(await this.service.submit(body, req.user.userId));
  }

  private handle<T extends ServiceResponse>(result: T) {
    if (result.success) return result;
    switch (result.statusCode) {
      case 400:
        throw new BadRequestException(result.message);
      case 404:
        throw new NotFoundException(result.message);
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
