import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { AdminUsersService } from './admin-users.service';
import {
  UpdateUserStatusDto,
  UpdateUserRoleDto,
  AdjustTrustDto,
} from './dto/admin-users.dto';

@Controller('admin/users')
@UseGuards(AuthGuard('jwt-at'), AdminGuard)
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  listUsers(@Request() req: any) {
    return this.service.listUsers(req.user.userId);
  }

  @Get(':id')
  getUserDetail(@Request() req: any, @Param('id') id: string) {
    return this.service.getUserDetail(req.user.userId, id);
  }

  @Patch(':id/status')
  updateUserStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.service.updateUserStatus(req.user.userId, id, dto);
  }

  @Patch(':id/role')
  updateUserRole(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.service.updateUserRole(req.user.userId, id, dto);
  }

  @Patch(':id/trust')
  adjustTrust(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: AdjustTrustDto,
  ) {
    return this.service.adjustTrust(req.user.userId, id, dto);
  }
}
