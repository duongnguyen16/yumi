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
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CreateRequestAccessDTO } from './dto/create-request-access.dto';
import { ListRequestAccessDTO } from './dto/list-request-access.dto';
import { RespondRequestAccessDTO } from './dto/respond-request-access.dto';
import { VerifyTakeoverDTO } from './dto/verify-takeover.dto';
import { RequestAccessService } from './request-access.service';

interface UserRequest extends Request {
  user: { userId: string };
}

interface ServiceResult {
  success: boolean;
  statusCode?: number;
  message?: string;
}

@ApiTags('request-access')
@ApiBearerAuth()
@Controller('request-access')
@UseGuards(AuthGuard('jwt-at'))
export class RequestAccessController {
  constructor(private readonly service: RequestAccessService) {}

  // tạo request access
  @Post()
  async create(
    @Body() dto: CreateRequestAccessDTO,
    @NestRequest() req: UserRequest,
  ) {
    return this.handle(await this.service.createRequest(req.user.userId, dto));
  }

  // list request access của owner hoặc requester
  @Get('mine')
  async list(
    @Query() query: ListRequestAccessDTO,
    @NestRequest() req: UserRequest,
  ) {
    return this.handle(
      await this.service.listMine(req.user.userId, query.side),
    );
  }

  // get request access by id
  @Get(':id')
  async getOne(@Param('id') id: string, @NestRequest() req: UserRequest) {
    return this.handle(await this.service.getRequestById(id, req.user.userId));
  }

  // respond request access
  @Patch(':id/respond')
  async respond(
    @Param('id') id: string,
    @Body() dto: RespondRequestAccessDTO,
    @NestRequest() req: UserRequest,
  ) {
    return this.handle(await this.service.respond(id, req.user.userId, dto));
  }

  // gửi yêu cầu tiếp quản
  @Patch(':id/verify-takeover')
  async verify(
    @Param('id') id: string,
    @Body() dto: VerifyTakeoverDTO,
    @NestRequest() req: UserRequest,
  ) {
    return this.handle(
      await this.service.verifyTakeover(id, req.user.userId, dto),
    );
  }

  private handle<T extends ServiceResult>(result: T) {
    if (result.success) return result;
    if (result.statusCode === 400)
      throw new BadRequestException(result.message);
    if (result.statusCode === 403) throw new ForbiddenException(result.message);
    if (result.statusCode === 404) throw new NotFoundException(result.message);
    if (result.statusCode === 409) throw new ConflictException(result.message);
    if (result.statusCode === 422) {
      throw new UnprocessableEntityException(result.message);
    }
    throw new InternalServerErrorException(result.message);
  }
}
