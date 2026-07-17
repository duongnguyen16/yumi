import { Model, Types } from 'mongoose';
import { AppealType, RequestAccessStatus } from 'src/common/schemas/common.enums';
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
});
