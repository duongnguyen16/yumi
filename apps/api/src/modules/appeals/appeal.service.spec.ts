import {
  AppealStatus,
  AppealType,
  RequestAccessStatus,
} from 'src/common/schemas/common.enums';
import { AppealSchema } from 'src/common/schemas/appeal.schema';
import { DisputeSchema } from 'src/common/schemas/dispute.schema';
import { Model, Types } from 'mongoose';
import { NotificationPort } from 'src/common/contracts/notification.port';
import { AuditService } from 'src/common/services/audit.service';
import { AppealDocument } from 'src/common/schemas/appeal.schema';
import { DisputeDocument } from 'src/common/schemas/dispute.schema';
import { RequestAccessDocument } from 'src/common/schemas/request-access.schema';
import { AppealRestoreService } from './appeal-restore.service';
import { AppealSourceService } from './appeal-source.service';
import { AppealService } from './appeal.service';

describe('Appeal contracts', () => {
  it('supports request access escalation', () => {
    expect(AppealType.REQUEST_ACCESS_REJECTED).toBe(
      'REQUEST_ACCESS_REJECTED',
    );
    expect(AppealStatus.ACCEPTED_TO_DISPUTE).toBe('ACCEPTED_TO_DISPUTE');
    expect(AppealType.USER_WARNED).toBe('USER_WARNED');
  });

  it('stores appeal decision context', () => {
    expect(AppealSchema.path('argument')).toBeDefined();
    expect(AppealSchema.path('originalDeciderId')).toBeDefined();
    expect(AppealSchema.path('originalDecidedAt')).toBeDefined();
  });

  it('stores the request access source', () => {
    expect(DisputeSchema.path('requestAccessId')).toBeDefined();
  });
});

function query<T>(value: T) {
  return {
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

describe('AppealService', () => {
  const userId = new Types.ObjectId();
  const ownerId = new Types.ObjectId();
  const targetId = new Types.ObjectId();

  function setup() {
    const appealModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      findById: jest.fn(),
    };
    const reqModel = { findById: jest.fn() };
    const disputeModel = { create: jest.fn(), findOne: jest.fn() };
    const source = { load: jest.fn() };
    const restore = { restore: jest.fn() };
    const audit = { log: jest.fn().mockResolvedValue({}) };
    const notify = { notify: jest.fn().mockResolvedValue(undefined) };
    const service = new AppealService(
      appealModel as unknown as Model<AppealDocument>,
      reqModel as unknown as Model<RequestAccessDocument>,
      disputeModel as unknown as Model<DisputeDocument>,
      source as unknown as AppealSourceService,
      restore as unknown as AppealRestoreService,
      audit as unknown as AuditService,
      notify as NotificationPort,
    );
    return {
      service,
      appealModel,
      reqModel,
      disputeModel,
      source,
      restore,
      audit,
      notify,
    };
  }

  function dto() {
    return {
      type: AppealType.REQUEST_ACCESS_REJECTED,
      targetId: String(targetId),
      argument: 'Tôi có thêm bằng chứng tại địa điểm',
      additionalEvidenceFiles: [
        { url: 'https://example.com/proof.jpg', fileType: 'IMAGE' as const },
      ],
    };
  }

  function sourceData(data: Record<string, unknown> = {}) {
    return {
      success: true as const,
      targetCollection: 'request_accesses',
      affectedUserId: String(userId),
      decidedAt: new Date(),
      deciderId: String(ownerId),
      reason: 'Không đồng ý chuyển quyền',
      ...data,
    };
  }

  it('submits one pending appeal without changing the target', async () => {
    const { service, appealModel, source } = setup();
    source.load.mockResolvedValue(sourceData());
    appealModel.findOne.mockReturnValue(query(null));
    appealModel.create.mockResolvedValue({
      _id: new Types.ObjectId(),
      status: AppealStatus.PENDING,
      appealDeadline: new Date(),
    });

    const result = await service.submit(String(userId), dto());

    expect(result.success).toBe(true);
    expect(appealModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        appellantId: userId,
        status: AppealStatus.PENDING,
        argument: dto().argument,
      }),
    );
  });

  it('blocks a user who is not affected by the decision', async () => {
    const { service, appealModel, source } = setup();
    source.load.mockResolvedValue(
      sourceData({ affectedUserId: String(new Types.ObjectId()) }),
    );

    const result = await service.submit(String(userId), dto());

    expect(result).toMatchObject({ success: false, statusCode: 403 });
    expect(appealModel.create).not.toHaveBeenCalled();
  });

  it('blocks an expired decision', async () => {
    const { service, appealModel, source } = setup();
    source.load.mockResolvedValue(
      sourceData({ decidedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) }),
    );

    const result = await service.submit(String(userId), dto());

    expect(result).toMatchObject({ success: false, statusCode: 410 });
    expect(appealModel.create).not.toHaveBeenCalled();
  });

  it('blocks a second appeal for the same decision', async () => {
    const { service, appealModel, source } = setup();
    source.load.mockResolvedValue(sourceData());
    appealModel.findOne.mockReturnValue(query({ _id: new Types.ObjectId() }));

    const result = await service.submit(String(userId), dto());

    expect(result).toMatchObject({ success: false, statusCode: 409 });
  });

  it('lists resolved appeals as newest-first history', async () => {
    const { service, appealModel } = setup();
    const find = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    appealModel.find.mockReturnValue(find);
    appealModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });

    await service.getQueue({ page: 1, limit: 20, view: 'history' } as never);

    expect(appealModel.find).toHaveBeenCalledWith({
      status: {
        $in: [
          AppealStatus.ACCEPTED_TO_DISPUTE,
          AppealStatus.OVERTURNED,
          AppealStatus.UPHELD,
        ],
      },
    });
    expect(find.sort).toHaveBeenCalledWith({
      'adminDecision.decidedAt': -1,
      updatedAt: -1,
      createdAt: -1,
    });
  });

  it('accepts a rejected request access into one dispute', async () => {
    const {
      service,
      appealModel,
      reqModel,
      disputeModel,
      audit,
      notify,
    } = setup();
    const appeal = {
      _id: new Types.ObjectId(),
      type: AppealType.REQUEST_ACCESS_REJECTED,
      targetCollection: 'request_accesses',
      targetId,
      appellantId: userId,
      status: AppealStatus.PENDING,
      additionalEvidenceFiles: [
        { url: 'https://example.com/new.jpg', fileType: 'IMAGE' },
      ],
      save: jest.fn().mockResolvedValue(undefined),
    };
    const req = {
      _id: targetId,
      locationId: new Types.ObjectId(),
      requesterId: userId,
      currentOwnerId: ownerId,
      evidenceFiles: [
        { url: 'https://example.com/old.jpg', fileType: 'IMAGE' },
      ],
      status: RequestAccessStatus.REJECTED,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const dispute = { _id: new Types.ObjectId(), status: 'OPEN' };
    appealModel.findById.mockReturnValue(query(appeal));
    reqModel.findById.mockReturnValue(query(req));
    disputeModel.findOne.mockReturnValue(query(null));
    disputeModel.create.mockResolvedValue(dispute);

    const result = await service.resolve(String(appeal._id), String(ownerId), {
      decision: AppealStatus.ACCEPTED_TO_DISPUTE,
      reason: 'Bằng chứng mới đủ để mở tranh chấp',
    });

    expect(result).toMatchObject({
      success: true,
      dispute: { id: dispute._id },
    });
    expect(req.status).toBe(RequestAccessStatus.ESCALATED);
    expect(appeal.status).toBe(AppealStatus.ACCEPTED_TO_DISPUTE);
    expect(disputeModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requestAccessId: targetId,
        vendorAId: ownerId,
        vendorBId: userId,
        evidenceB: expect.arrayContaining(req.evidenceFiles),
      }),
    );
    expect(audit.log).toHaveBeenCalledTimes(1);
    expect(notify.notify).toHaveBeenCalledTimes(1);
  });

  it('upholds a request access appeal without changing the request', async () => {
    const { service, appealModel, reqModel } = setup();
    const appeal = {
      _id: new Types.ObjectId(),
      type: AppealType.REQUEST_ACCESS_REJECTED,
      targetCollection: 'request_accesses',
      targetId,
      appellantId: userId,
      status: AppealStatus.PENDING,
      save: jest.fn().mockResolvedValue(undefined),
    };
    appealModel.findById.mockReturnValue(query(appeal));

    const result = await service.resolve(String(appeal._id), String(ownerId), {
      decision: AppealStatus.UPHELD,
      reason: 'Không đủ căn cứ mở tranh chấp',
    });

    expect(result.success).toBe(true);
    expect(appeal.status).toBe(AppealStatus.UPHELD);
    expect(reqModel.findById).not.toHaveBeenCalled();
  });
});
