import { Model, Types } from 'mongoose';
import { NotificationPort } from 'src/common/contracts/notification.port';
import {
  NotificationType,
  UserRole,
  UserStatus,
} from 'src/common/schemas/common.enums';
import { UserDocument } from 'src/common/schemas/user.schema';
import { AuditService } from 'src/common/services/audit.service';
import { TrustEngineService } from '../trust-engine/trust-engine.service';
import { AdminUsersService } from './admin-users.service';

describe('Kiểm thử AdminUsersService', () => {
  const adminId = new Types.ObjectId();
  const userId = new Types.ObjectId();

  function createService(currentStatus = UserStatus.ACTIVE) {
    const actor = {
      _id: adminId,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    };
    const target = {
      _id: userId,
      role: UserRole.CUSTOMER,
      status: currentStatus,
      save: jest.fn().mockResolvedValue(undefined),
      toObject: jest.fn(function () {
        return {
          _id: this._id,
          role: this.role,
          status: this.status,
        };
      }),
    };
    const userModel = {
      findById: jest
        .fn()
        .mockResolvedValueOnce(actor)
        .mockResolvedValueOnce(target),
      countDocuments: jest.fn().mockResolvedValue(3),
    };
    const trustEngine = {
      banUser: jest.fn().mockResolvedValue(undefined),
    };
    const auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };
    const notification = {
      notify: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AdminUsersService(
      userModel as Model<UserDocument>,
      trustEngine as TrustEngineService,
      auditService as AuditService,
      notification as NotificationPort,
    );

    return {
      service,
      notification,
      target,
    };
  }

  it.each([
    {
      status: UserStatus.WARNED,
      type: NotificationType.ACCOUNT_WARNED,
      title: 'Tài khoản đã bị cảnh báo',
    },
    {
      status: UserStatus.BANNED,
      type: NotificationType.ACCOUNT_BANNED,
      title: 'Tài khoản đã bị cấm',
    },
  ])('thông báo khi tài khoản chuyển sang $status', async (expected) => {
    const { service, notification } = createService();
    const reason = 'Vi phạm quy định cộng đồng';

    await service.updateUserStatus(String(adminId), String(userId), {
      status: expected.status,
      reason,
    });

    expect(notification.notify).toHaveBeenCalledWith({
      userId: String(userId),
      type: expected.type,
      title: expected.title,
      body: reason,
      refCollection: 'users',
      refId: String(userId),
    });
  });

  it('không tạo thông báo kháng cáo khi tài khoản được kích hoạt', async () => {
    const { service, notification } = createService(UserStatus.WARNED);

    await service.updateUserStatus(String(adminId), String(userId), {
      status: UserStatus.ACTIVE,
      reason: 'Đã hoàn tất xem xét',
    });

    expect(notification.notify).not.toHaveBeenCalled();
  });

  it('dùng nội dung mặc định khi quản trị viên không nhập lý do', async () => {
    const { service, notification } = createService();

    await service.updateUserStatus(String(adminId), String(userId), {
      status: UserStatus.WARNED,
    });

    expect(notification.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'Tài khoản đã bị cảnh báo',
      }),
    );
  });
});
