import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from 'src/common/schemas/user.schema';
import {
  NotificationType,
  UserRole,
  UserStatus,
  TrustEventType,
} from 'src/common/schemas/common.enums';
import {
  NOTIFICATION_PORT,
  NotificationPort,
} from 'src/common/contracts/notification.port';
import { TrustEngineService } from '../trust-engine/trust-engine.service';
import { AuditService } from 'src/common/services/audit.service';
import {
  UpdateUserStatusDto,
  UpdateUserRoleDto,
  AdjustTrustDto,
} from './dto/admin-users.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly trustEngine: TrustEngineService,
    private readonly auditService: AuditService,
    @Inject(NOTIFICATION_PORT)
    private readonly notification: NotificationPort,
  ) {}

  async listUsers(actorId: string) {
    const users = await this.userModel
      .find({}, { passwordHash: 0 })
      .sort({ createdAt: -1 });
    return { success: true, users };
  }

  async getUserDetail(actorId: string, userId: string) {
    const user = await this.userModel.findById(userId, { passwordHash: 0 });
    if (!user) {
      throw new BadRequestException('Không tìm thấy người dùng');
    }
    return { success: true, user };
  }

  async updateUserStatus(
    actorId: string,
    targetUserId: string,
    dto: UpdateUserStatusDto,
  ) {
    const actor = await this.userModel.findById(actorId);
    if (!actor) {
      throw new BadRequestException('Không tìm thấy người dùng');
    }

    const target = await this.userModel.findById(targetUserId);
    if (!target) {
      throw new BadRequestException('Không tìm thấy người dùng');
    }

    // BR-49: no self-ban
    if (actorId === targetUserId && dto.status === UserStatus.BANNED) {
      throw new ForbiddenException('Không thể tự cấm tài khoản của chính mình');
    }

    // BR-50: cannot drop below 2 Admins
    if (
      target.role === UserRole.ADMIN &&
      (dto.status === UserStatus.BANNED || dto.status === UserStatus.WARNED)
    ) {
      const adminCount = await this.userModel.countDocuments({
        role: UserRole.ADMIN,
        _id: { $ne: target._id },
        status: UserStatus.ACTIVE,
      });
      if (adminCount < 2) {
        throw new ConflictException(
          'Không thể hạ quyền admin cuối cùng. Hệ thống phải luôn có ít nhất 2 Admin.',
        );
      }
    }

    const oldStatus = target.status;
    target.status = dto.status as UserStatus;
    await target.save();

    // If banned, sync trust level via M2
    if (dto.status === UserStatus.BANNED) {
      await this.trustEngine.banUser(targetUserId, actorId, dto.reason);
    }

    // Audit log (BR-43)
    await this.auditService.log({
      actorId,
      action: `update_user_status:${target.status}`,
      targetCollection: 'users',
      targetId: targetUserId,
      reason: dto.reason,
      diff: { oldStatus, newStatus: target.status },
    });

    await this.notifyAccountStatus(targetUserId, target.status, dto.reason);

    return {
      success: true,
      user: this.sanitizeUser(target),
    };
  }

  async updateUserRole(
    actorId: string,
    targetUserId: string,
    dto: UpdateUserRoleDto,
  ) {
    if (actorId === targetUserId) {
      throw new ForbiddenException('Không thể tự thay đổi role của chính mình');
    }

    const target = await this.userModel.findById(targetUserId);
    if (!target) {
      throw new BadRequestException('Không tìm thấy người dùng');
    }

    // BR-50: warn when demoting the last Admin (EF23.2)
    if (target.role === UserRole.ADMIN && dto.role !== UserRole.ADMIN) {
      const adminCount = await this.userModel.countDocuments({
        role: UserRole.ADMIN,
        _id: { $ne: target._id },
        status: UserStatus.ACTIVE,
      });
      if (adminCount < 2) {
        throw new ConflictException(
          'Không thể hạ quyền admin cuối cùng. Hệ thống phải luôn có ít nhất 2 Admin.',
        );
      }
      if (adminCount < 3) {
        // EF23.2: warn when demoting the last -> 2 admins remaining
        // Just a soft warning, we still allow it as long as >= 2 remain
      }
    }

    const oldRole = target.role;
    target.role = dto.role as UserRole;
    await target.save();

    await this.auditService.log({
      actorId,
      action: `update_user_role:${target.role}`,
      targetCollection: 'users',
      targetId: targetUserId,
      reason: dto.reason,
      diff: { oldRole, newRole: target.role },
    });

    return {
      success: true,
      user: this.sanitizeUser(target),
    };
  }

  async adjustTrust(
    actorId: string,
    targetUserId: string,
    dto: AdjustTrustDto,
  ) {
    if (actorId === targetUserId) {
      // Allow self adjust but it's unusual
    }

    // Manual trust adjust goes through M2 (TrustEvent type ADMIN_ADJUSTMENT)
    const result = await this.trustEngine.recordEvent({
      userId: targetUserId,
      type: TrustEventType.ADMIN_ADJUSTMENT,
      pointChange: dto.pointChange,
      reason: dto.reason,
      refCollection: 'admin_users',
      refId: actorId,
    });

    const target = await this.userModel.findById(targetUserId);
    if (!target) {
      throw new BadRequestException('Không tìm thấy người dùng');
    }

    await this.auditService.log({
      actorId,
      action: 'adjust_trust',
      targetCollection: 'users',
      targetId: targetUserId,
      reason: dto.reason,
      diff: {
        pointChange: dto.pointChange,
        newTrustScore: result.trustScore,
        newTrustLevel: result.trustLevel,
      },
    });

    return {
      success: true,
      trustScore: result.trustScore,
      trustLevel: result.trustLevel,
      event: result.event,
    };
  }

  private async notifyAccountStatus(
    userId: string,
    status: UserStatus,
    reason?: string,
  ) {
    let type: NotificationType;
    let title: string;

    if (status === UserStatus.WARNED) {
      type = NotificationType.ACCOUNT_WARNED;
      title = 'Tài khoản đã bị cảnh báo';
    } else if (status === UserStatus.BANNED) {
      type = NotificationType.ACCOUNT_BANNED;
      title = 'Tài khoản đã bị cấm';
    } else {
      return;
    }

    const body = reason?.trim() || title;
    await this.notification.notify({
      userId,
      type,
      title,
      body,
      refCollection: 'users',
      refId: userId,
    });
  }

  private sanitizeUser(user: UserDocument) {
    const obj = user.toObject();
    delete (obj as any).passwordHash;
    return obj;
  }
}
