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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { parseMultipartDto } from 'src/common/utils/parse-multipart-dto';
import { CreateRequestAccessUploadDTO } from './dto/create-request-access-upload.dto';
import { ListRequestAccessDTO } from './dto/list-request-access.dto';
import { RespondRequestAccessDTO } from './dto/respond-request-access.dto';
import { StartAccessVerificationDTO } from './dto/start-access-verification.dto';
import { VerifyAccessOtpDTO } from './dto/verify-access-otp.dto';
import { VerifyTakeoverUploadDTO } from './dto/verify-takeover-upload.dto';
import { RequestAccessVerificationService } from './request-access-verification.service';
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
  constructor(
    private readonly service: RequestAccessService,
    private readonly verification: RequestAccessVerificationService,
  ) {}

  @Post('verification/start')
  async startVerification(
    @Body() dto: StartAccessVerificationDTO,
    @NestRequest() req: UserRequest,
  ) {
    return this.handle(
      await this.verification.start(
        req.user.userId,
        dto.locationId,
        dto.purpose,
        dto.requestAccessId,
      ),
    );
  }

  @Post('verification/verify-otp')
  async verifyOtp(
    @Body() dto: VerifyAccessOtpDTO,
    @NestRequest() req: UserRequest,
  ) {
    return this.handle(
      await this.verification.verifyOtp(
        dto.sessionId,
        req.user.userId,
        dto.otp,
      ),
    );
  }

  // tạo request access
  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 5, { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async create(
    @Body('data') data: string,
    @UploadedFiles() images: Express.Multer.File[] | undefined,
    @NestRequest() req: UserRequest,
  ) {
    const dto = parseMultipartDto(data, CreateRequestAccessUploadDTO);
    return this.handle(
      await this.service.createRequestWithImages(
        req.user.userId,
        dto,
        images ?? [],
      ),
    );
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
  @UseInterceptors(
    FilesInterceptor('images', 5, { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async verify(
    @Param('id') id: string,
    @Body('data') data: string,
    @UploadedFiles() images: Express.Multer.File[] | undefined,
    @NestRequest() req: UserRequest,
  ) {
    const dto = parseMultipartDto(data, VerifyTakeoverUploadDTO);
    return this.handle(
      await this.service.verifyTakeoverWithImages(
        id,
        req.user.userId,
        dto,
        images ?? [],
      ),
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
