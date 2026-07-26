import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  GoneException,
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
import { AdminGuard } from 'src/common/guard/admin.guard';
import { parseMultipartDto } from 'src/common/utils/parse-multipart-dto';
import { AppealService } from './appeal.service';
import { ListAppealsDTO } from './dto/list-appeals.dto';
import { ResolveAppealDTO } from './dto/resolve-appeal.dto';
import { SubmitAppealUploadDTO } from './dto/submit-appeal-upload.dto';

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
  if (result.statusCode === 410) throw new GoneException(result.message);
  if (result.statusCode === 422) {
    throw new UnprocessableEntityException(result.message);
  }
  throw new InternalServerErrorException(result.message);
}

@ApiTags('appeals')
@ApiBearerAuth()
@Controller('appeals')
@UseGuards(AuthGuard('jwt-appeal-access'))
export class AppealController {
  constructor(private readonly service: AppealService) {}

  // submit appeal
  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 5, { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async submit(
    @Body('data') data: string,
    @UploadedFiles() images: Express.Multer.File[] | undefined,
    @NestRequest() req: UserRequest,
  ) {
    const dto = parseMultipartDto(data, SubmitAppealUploadDTO);
    return handle(
      await this.service.submitWithImages(
        req.user.userId,
        dto,
        images ?? [],
      ),
    );
  }

  @Get('mine')
  async mine(@NestRequest() req: UserRequest) {
    return handle(await this.service.listMine(req.user.userId));
  }

  @Get(':id')
  async detail(@Param('id') id: string, @NestRequest() req: UserRequest) {
    return handle(await this.service.getMine(id, req.user.userId));
  }
}

@ApiTags('admin-appeals')
@ApiBearerAuth()
@Controller('admin/appeals')
@UseGuards(AuthGuard('jwt-at'), AdminGuard)
export class AdminAppealController {
  constructor(private readonly service: AppealService) {}

  @Get()
  async queue(@Query() query: ListAppealsDTO) {
    return handle(await this.service.getQueue(query));
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return handle(await this.service.getDetail(id));
  }

  @Patch(':id/resolve')
  async resolve(
    @Param('id') id: string,
    @Body() dto: ResolveAppealDTO,
    @NestRequest() req: UserRequest,
  ) {
    return handle(await this.service.resolve(id, req.user.userId, dto));
  }
}
