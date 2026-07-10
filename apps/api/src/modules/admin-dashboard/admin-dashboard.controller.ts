import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { AdminDashboardService } from './admin-dashboard.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string };
}

@Controller('admin/dashboard')
@UseGuards(AuthGuard('jwt-at'), AdminGuard)
export class AdminDashboardController {
  constructor(
    private readonly adminDashboardService: AdminDashboardService,
  ) {}

  @Get('overview')
  getOverview() {
    return this.adminDashboardService.getOverview();
  }

  @Get('audit-logs')
  listAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
  ) {
    const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
    return this.adminDashboardService.listAuditLogs(p, l, action, actorId);
  }
}
