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
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { AdminLocationService } from './admin-location.service';
import { ConfirmDuplicateLocationDTO } from './dto/confirm-duplicate-location.dto';
import { ListPendingRequestsDTO } from './dto/list-pending-requests.dto';
import { RejectRequestDTO } from './dto/reject-request.dto';

interface AuthenticatedRequest extends Request {
  user: { userId: string };
}

@ApiTags('admin-locations')
@ApiBearerAuth()
@Controller('admin/locations')
@UseGuards(AuthGuard('jwt-at'), AdminGuard)
export class AdminLocationsController {
  constructor(private readonly service: AdminLocationService) {}

  @Patch(':id/confirm-duplicate')
  async confirmDuplicate(
    @Param('id') id: string,
    @Body() body: ConfirmDuplicateLocationDTO,
    @NestRequest() req: AuthenticatedRequest,
  ) {
    return this.handle(
      await this.service.confirmDuplicateLocation(
        id,
        req.user.userId,
        body.reason,
        body.duplicateOfLocationId,
      ),
    );
  }

  private handle<T extends ServiceResponse>(r: T) {
    if (!r.success) {
      if (r.statusCode === 400) throw new BadRequestException(r.message);
      if (r.statusCode === 404) throw new NotFoundException(r.message);
      if (r.statusCode === 409) throw new ConflictException(r.message);
      throw new InternalServerErrorException(r.message);
    }
    return r;
  }
}

interface ServiceResponse {
  success: boolean;
  statusCode?: number;
  message?: string;
}

@ApiTags('admin-location-requests')
@ApiBearerAuth()
@Controller('admin/location-requests')
@UseGuards(AuthGuard('jwt-at'), AdminGuard)
export class AdminLocationController {
  constructor(private readonly service: AdminLocationService) {}

  @Get('queue')
  async getList(@Query() query: ListPendingRequestsDTO) {
    return this.handle(await this.service.getList(query));
  }

  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @NestRequest() req: AuthenticatedRequest,
  ) {
    return this.handle(await this.service.approve(id, req.user.userId));
  }

  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() body: RejectRequestDTO,
    @NestRequest() req: AuthenticatedRequest,
  ) {
    return this.handle(
      await this.service.reject(
        id,
        req.user.userId,
        body.reason,
        body.duplicateOfLocationId,
      ),
    );
  }

  private handle<T extends ServiceResponse>(r: T) {
    if (!r.success) {
      if (r.statusCode === 400) throw new BadRequestException(r.message);
      if (r.statusCode === 404) throw new NotFoundException(r.message);
      if (r.statusCode === 409) throw new ConflictException(r.message);
      throw new InternalServerErrorException(r.message);
    }
    return r;
  }
}
