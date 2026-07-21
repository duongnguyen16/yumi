import { Model, Types } from 'mongoose';
import {
  AppealType,
  RequestAccessStatus,
  UserStatus,
} from 'src/common/schemas/common.enums';
import { AppealSourceService } from './appeal-source.service';

function query<T>(value: T) {
  return {
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

describe('Kiểm thử AppealSourceService', () => {
  it('tải người yêu cầu bị từ chối là người dùng bị ảnh hưởng', async () => {
    const requesterId = new Types.ObjectId();
    const ownerId = new Types.ObjectId();
    const targetId = new Types.ObjectId();
    const reqModel = {
      findById: jest.fn().mockReturnValue(
        query({
          requesterId,
          currentOwnerId: ownerId,
          status: RequestAccessStatus.REJECTED,
          respondedAt: new Date(),
          responseReason: 'Không đồng ý chuyển quyền',
        }),
      ),
    };
    const empty = { findById: jest.fn() };
    const logModel = { findOne: jest.fn() };
    const service = new AppealSourceService(
      reqModel as unknown as Model<any>,
      empty as unknown as Model<any>,
      empty as unknown as Model<any>,
      empty as unknown as Model<any>,
      empty as unknown as Model<any>,
      empty as unknown as Model<any>,
      empty as unknown as Model<any>,
      logModel as unknown as Model<any>,
    );

    const result = await service.load(
      AppealType.REQUEST_ACCESS_REJECTED,
      targetId,
    );

    expect(result).toMatchObject({
      success: true,
      targetCollection: 'request_accesses',
      affectedUserId: String(requesterId),
      deciderId: undefined,
    });
  });

  it('cho phép tài khoản bị cấm cũ kháng cáo khi chưa có audit log', async () => {
    const userId = new Types.ObjectId();
    const updatedAt = new Date('2026-07-20T08:00:00.000Z');
    const empty = { findById: jest.fn() };
    const userModel = {
      findById: jest.fn().mockReturnValue(
        query({ status: UserStatus.BANNED, updatedAt }),
      ),
    };
    const logModel = {
      findOne: jest.fn().mockReturnValue(query(null)),
    };
    const service = new AppealSourceService(
      empty as unknown as Model<any>,
      empty as unknown as Model<any>,
      empty as unknown as Model<any>,
      empty as unknown as Model<any>,
      empty as unknown as Model<any>,
      empty as unknown as Model<any>,
      userModel as unknown as Model<any>,
      logModel as unknown as Model<any>,
    );

    const result = await service.load(AppealType.USER_BANNED, userId);

    expect(result).toMatchObject({
      success: true,
      targetCollection: 'users',
      affectedUserId: String(userId),
      decidedAt: updatedAt,
    });
  });
});
