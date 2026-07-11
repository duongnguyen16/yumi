import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
  Query,
  Request as NestRequest,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { AdminClaimService } from './admin-claim.service';
import { ApproveClaimDTO } from './dto/approve-claim.dto';
import { ListClaimsDTO } from './dto/list-claims.dto';
import { RejectClaimDTO } from './dto/reject-claim.dto';
import { RequestEvidenceDTO } from './dto/request-evidence.dto';

interface AdminRequest extends Request {
  user: { userId: string };
}

interface ServiceResult {
  success: boolean;
  statusCode?: number;
  message?: string;
}

@ApiTags('admin-claims')
@ApiBearerAuth()
@Controller('admin/claims')
@UseGuards(AuthGuard('jwt-at'), AdminGuard)
export class AdminClaimController {
  constructor(private readonly service: AdminClaimService) {}

  @Get('queue')
  async getQueue(@Query() query: ListClaimsDTO) {
    return this.handle(await this.service.getQueue(query));
  }

  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() body: ApproveClaimDTO,
    @NestRequest() req: AdminRequest,
  ) {
    return this.handle(
      await this.service.approve(id, req.user.userId, body.reason),
    );
  }

  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() body: RejectClaimDTO,
    @NestRequest() req: AdminRequest,
  ) {
    return this.handle(
      await this.service.reject(id, req.user.userId, body.reason),
    );
  }

  @Patch(':id/request-evidence')
  async requestEvidence(
    @Param('id') id: string,
    @Body() body: RequestEvidenceDTO,
    @NestRequest() req: AdminRequest,
  ) {
    return this.handle(
      await this.service.requestEvidence(
        id,
        req.user.userId,
        body.message,
      ),
    );
  }

  private handle<T extends ServiceResult>(result: T) {
    if (result.success) return result;
    if (result.statusCode === 400) {
      throw new BadRequestException(result.message);
    }
    if (result.statusCode === 404) {
      throw new NotFoundException(result.message);
    }
    if (result.statusCode === 409) {
      throw new ConflictException(result.message);
    }
    if (result.statusCode === 422) {
      throw new UnprocessableEntityException(result.message);
    }
    throw new InternalServerErrorException(result.message);
  }
}
