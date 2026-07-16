import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Request as NestRequest,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { DisputeService } from './dispute.service';
import { AddDisputeEvidenceDTO } from './dto/add-dispute-evidence.dto';
import { ListDisputesDTO } from './dto/list-disputes.dto';
import { ResolveDisputeDTO } from './dto/resolve-dispute.dto';

interface UserRequest extends Request {
  user: { userId: string };
}

interface ServiceResult {
  success: boolean;
  statusCode?: number;
  message?: string;
}

function handle<T extends ServiceResult>(result: T) {
  if (result.success) return result;
  if (result.statusCode === 400) throw new BadRequestException(result.message);
  if (result.statusCode === 403) throw new ForbiddenException(result.message);
  if (result.statusCode === 404) throw new NotFoundException(result.message);
  if (result.statusCode === 409) throw new ConflictException(result.message);
  throw new InternalServerErrorException(result.message);
}

@ApiTags('disputes')
@ApiBearerAuth()
@Controller('disputes')
@UseGuards(AuthGuard('jwt-at'))
export class DisputeController {
  constructor(private readonly service: DisputeService) {}

  // list disputes
  @Get('mine')
  async mine(@NestRequest() req: UserRequest) {
    return handle(await this.service.listMine(req.user.userId));
  }

  // get detail
  @Get(':id')
  async detail(@Param('id') id: string, @NestRequest() req: UserRequest) {
    return handle(await this.service.getForUser(id, req.user.userId));
  }

   // add bằng chứng
  @Post(':id/evidence')
  async evidence(
    @Param('id') id: string,
    @Body() dto: AddDisputeEvidenceDTO,
    @NestRequest() req: UserRequest,
  ) {
    return handle(await this.service.addEvidence(id, req.user.userId, dto));
  }
}

@ApiTags('admin-disputes')
@ApiBearerAuth()
@Controller('admin/disputes')
@UseGuards(AuthGuard('jwt-at'), AdminGuard)
export class AdminDisputeController {
  constructor(private readonly service: DisputeService) {}
  // list disputes
  @Get()
  async queue(@Query() query: ListDisputesDTO) {
    return handle(await this.service.getQueue(query));
  }

  // get detail
  @Get(':id')
  async detail(@Param('id') id: string) {
    return handle(await this.service.getDetail(id));
  }

  // giải quyết tranh chấp
  @Patch(':id/resolve')
  async resolve(
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDTO,
    @NestRequest() req: UserRequest,
  ) {
    return handle(await this.service.resolve(id, req.user.userId, dto));
  }
}
