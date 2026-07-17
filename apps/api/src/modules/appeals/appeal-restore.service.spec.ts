import { Model, Types } from 'mongoose';
import { AppealType, ClaimRequestStatus, LocationStatus, ReviewStatus, UserStatus } from 'src/common/schemas/common.enums';
import { AppealRestoreService } from './appeal-restore.service';
import { TrustEngineService } from '../trust-engine/trust-engine.service';

function query<T>(value: T) {
  return {
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

describe('Kiểm thử AppealRestoreService', () => {
  const id = new Types.ObjectId();
  const locId = new Types.ObjectId();

  function setup() {
    const reqModel = { findById: jest.fn() };
    const locModel = { findById: jest.fn() };
    const claimModel = { findById: jest.fn() };
    const disputeModel = { findById: jest.fn() };
    const reviewModel = { findById: jest.fn() };
    const userModel = {
      findById: jest.fn(),
      updateOne: jest.fn().mockReturnValue(query({ acknowledged: true })),
    };
    const logModel = { findOne: jest.fn() };
    const trust = { unbanUser: jest.fn().mockResolvedValue({}) };
    const service = new AppealRestoreService(
      reqModel as unknown as Model<any>,
      locModel as unknown as Model<any>,
      claimModel as unknown as Model<any>,
      disputeModel as unknown as Model<any>,
      reviewModel as unknown as Model<any>,
      userModel as unknown as Model<any>,
      logModel as unknown as Model<any>,
      trust as unknown as TrustEngineService,
    );
    return {
      service,
      reqModel,
      locModel,
      claimModel,
      disputeModel,
      reviewModel,
      userModel,
      logModel,
      trust,
    };
  }

  function doc(data: Record<string, unknown>) {
    return { save: jest.fn().mockResolvedValue(undefined), ...data };
  }

  it('công khai yêu cầu địa điểm bị từ chối và địa điểm tương ứng', async () => {
    const { service, reqModel, locModel } = setup();
    const req = doc({ status: 'REJECTED', locationId: locId });
    const loc = doc({ status: LocationStatus.REJECTED });
    reqModel.findById.mockReturnValue(query(req));
    locModel.findById.mockReturnValue(query(loc));

    const result = await service.restore(AppealType.LOCATION_REJECTED, id);

    expect(result.success).toBe(true);
    expect(req.status).toBe('APPROVED');
    expect(loc.status).toBe(LocationStatus.PUBLISHED);
  });

  it('trả claim bị từ chối về trạng thái chờ mà không gán chủ sở hữu', async () => {
    const { service, claimModel, locModel } = setup();
    const claim = doc({ status: ClaimRequestStatus.REJECTED, locationId: locId });
    claimModel.findById.mockReturnValue(query(claim));

    const result = await service.restore(AppealType.CLAIM_REJECTED, id);

    expect(result.success).toBe(true);
    expect(claim.status).toBe(ClaimRequestStatus.PENDING);
    expect(locModel.findById).not.toHaveBeenCalled();
  });

  it('khôi phục địa điểm trùng lặp', async () => {
    const { service, locModel } = setup();
    const loc = doc({ status: LocationStatus.HIDDEN, isDuplicate: true });
    locModel.findById.mockReturnValue(query(loc));

    const result = await service.restore(AppealType.DUPLICATE_HIDDEN, id);

    expect(result.success).toBe(true);
    expect(loc.status).toBe(LocationStatus.PUBLISHED);
    expect(loc.isDuplicate).toBe(false);
  });

  it('khôi phục chủ sở hữu trước đó từ nhật ký kiểm toán tranh chấp', async () => {
    const { service, disputeModel, locModel, logModel } = setup();
    const oldOwner = new Types.ObjectId();
    const dispute = doc({ locationId: locId, status: 'RESOLVED_REVOKE' });
    const loc = doc({ ownerId: undefined });
    disputeModel.findById.mockReturnValue(query(dispute));
    locModel.findById.mockReturnValue(query(loc));
    logModel.findOne.mockReturnValue(
      query({ diff: { ownerId: { from: String(oldOwner), to: null } } }),
    );

    const result = await service.restore(AppealType.OWNERSHIP_REVOKED, id);

    expect(result.success).toBe(true);
    expect(loc.ownerId).toEqual(oldOwner);
  });

  it('công khai đánh giá đã bị gỡ', async () => {
    const { service, reviewModel } = setup();
    const review = doc({ status: ReviewStatus.REMOVED_BY_ADMIN });
    reviewModel.findById.mockReturnValue(query(review));

    const result = await service.restore(AppealType.REVIEW_REMOVED, id);

    expect(result.success).toBe(true);
    expect(review.status).toBe(ReviewStatus.PUBLISHED);
  });

  it('khôi phục trạng thái người dùng từ nhật ký kiểm toán', async () => {
    const { service, userModel, logModel, trust } = setup();
    const user = doc({ status: UserStatus.BANNED });
    userModel.findById.mockReturnValue(query(user));
    logModel.findOne.mockReturnValue(
      query({ diff: { oldStatus: UserStatus.WARNED, newStatus: UserStatus.BANNED } }),
    );

    const result = await service.restore(AppealType.USER_BANNED, id);

    expect(result.success).toBe(true);
    expect(trust.unbanUser).toHaveBeenCalledWith(id);
    expect(userModel.updateOne).toHaveBeenCalledWith(
      { _id: id },
      { $set: { status: UserStatus.WARNED } },
    );
  });

  it('khôi phục người dùng bị cảnh báo mà không chạy thao tác gỡ cấm', async () => {
    const { service, userModel, logModel, trust } = setup();
    const user = doc({ status: UserStatus.WARNED });
    userModel.findById.mockReturnValue(query(user));
    logModel.findOne.mockReturnValue(
      query({ diff: { oldStatus: UserStatus.ACTIVE, newStatus: UserStatus.WARNED } }),
    );

    const result = await service.restore(AppealType.USER_WARNED, id);

    expect(result.success).toBe(true);
    expect(trust.unbanUser).not.toHaveBeenCalled();
    expect(userModel.updateOne).toHaveBeenCalledWith(
      { _id: id },
      { $set: { status: UserStatus.ACTIVE } },
    );
  });
});
