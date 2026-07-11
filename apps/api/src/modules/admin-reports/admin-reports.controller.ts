import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { AdminReportsService } from './admin-reports.service';
import { DismissReportDto } from './dto/dismiss-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller('admin/reports')
@UseGuards(AuthGuard('jwt-at'), AdminGuard)
export class AdminReportsController {
  constructor(
    private readonly adminReportsService: AdminReportsService,
  ) {}

  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminReportsService.listReports(page, limit);
  }

  @Post(':id/resolve')
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.adminReportsService.resolveReport(
      request.user.userId,
      id,
      dto,
    );
  }

  @Post(':id/dismiss')
  dismiss(
    @Param('id') id: string,
    @Body() dto: DismissReportDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.adminReportsService.dismissReport(
      request.user.userId,
      id,
      dto,
    );
  }
}
