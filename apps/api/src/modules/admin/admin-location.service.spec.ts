import { Model, Types } from 'mongoose';
import { AuditLogDocument } from 'src/common/schemas/audit-log.schema';
import { LocationDocument } from 'src/common/schemas/location.schema';
import {
  LocationRequestDocument,
  LocationRequestStatus,
  LocationRequestType,
} from 'src/common/schemas/location-request';
import { LocationStatus } from 'src/common/schemas/common.enums';
import { NotificationPort } from 'src/common/contracts/notification.port';
import { TrustEngineService } from '../trust-engine/trust-engine.service';
import { AdminLocationService } from './admin-location.service';

function query<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

describe('Kiểm thử AdminLocationService', () => {
  const requestId = new Types.ObjectId();
  const locationId = new Types.ObjectId();
  const submitterId = new Types.ObjectId();
  const adminId = new Types.ObjectId();

  function createService(overrides: Record<string, unknown> = {}) {
    const reqModel = {
      findById: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      ...overrides,
    };
    const locModel = { findById: jest.fn() };
    const logModel = { create: jest.fn().mockResolvedValue({}) };
    const trust = { recordEvent: jest.fn().mockResolvedValue({}) };
    const notification = { notify: jest.fn().mockResolvedValue(undefined) };

    return {
      service: new AdminLocationService(
        reqModel as unknown as Model<LocationRequestDocument>,
        locModel as unknown as Model<LocationDocument>,
        logModel as unknown as Model<AuditLogDocument>,
        trust as unknown as TrustEngineService,
        notification as unknown as NotificationPort,
      ),
      reqModel,
      locModel,
      logModel,
      trust,
      notification,
    };
  }

  it('liệt kê yêu cầu chờ duyệt và duyệt lại kèm cờ hàng đợi', async () => {
    const { service, reqModel } = createService();
    const list = [
      {
        _id: requestId,
        isPotentialDuplicate: true,
        suspectedDuplicateLocationIds: [locationId],
        deviceDistanceMeters: 501,
      },
    ];
    const findChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(list),
    };
    reqModel.find.mockReturnValue(findChain);
    reqModel.countDocuments.mockReturnValue(query(1));

    const result = await service.getList({ page: 1, limit: 20 });

    expect(reqModel.find).toHaveBeenCalledWith({
      status: {
        $in: [
          LocationRequestStatus.PENDING,
          LocationRequestStatus.PENDING_RE_APPROVAL,
        ],
      },
    });
    expect(result).toMatchObject({
      success: true,
      total: 1,
      items: [
        {
          flags: {
            suspectedDuplicate: true,
            suspectedDuplicateLocationIds: [locationId],
            farPin: true,
          },
        },
      ],
    });
  });

  it('không gắn cờ pin xa khi khoảng cách đúng 500 mét', async () => {
    const { service, reqModel } = createService();
    const findChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([{ deviceDistanceMeters: 500 }]),
    };
    reqModel.find.mockReturnValue(findChain);
    reqModel.countDocuments.mockReturnValue(query(1));

    const result = await service.getList({ page: 1, limit: 20 });

    expect(result).toMatchObject({
      items: [{ flags: { farPin: false } }],
    });
  });

  it('liệt kê yêu cầu đã hoàn tất theo lịch sử mới nhất trước', async () => {
    const { service, reqModel } = createService();
    const findChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    reqModel.find.mockReturnValue(findChain);
    reqModel.countDocuments.mockReturnValue(query(0));

    await service.getList({ page: 1, limit: 20, view: 'history' } as never);

    expect(reqModel.find).toHaveBeenCalledWith({
      status: {
        $in: [
          LocationRequestStatus.APPROVED,
          LocationRequestStatus.REJECTED,
          LocationRequestStatus.CANCELLED,
        ],
      },
    });
    expect(findChain.sort).toHaveBeenCalledWith({
      reviewedAt: -1,
      updatedAt: -1,
      createdAt: -1,
    });
  });

  it('duyệt yêu cầu duyệt lại và công khai bản chụp dữ liệu', async () => {
    const { service, reqModel, locModel, trust, notification, logModel } =
      createService();
    const request = {
      _id: requestId,
      locationId,
      submittedBy: submitterId,
      type: LocationRequestType.UPDATE,
      status: LocationRequestStatus.PENDING_RE_APPROVAL,
      newData: { name: '  Quán mới  ', phone: '0123456789' },
      save: jest.fn().mockResolvedValue(undefined),
    };
    const location = {
      _id: locationId,
      name: 'Quán cũ',
      status: LocationStatus.SUBMITTED,
      save: jest.fn().mockResolvedValue(undefined),
    };
    reqModel.findById.mockReturnValue(query(request));
    locModel.findById.mockReturnValue(query(location));

    const result = await service.approve(String(requestId), String(adminId));

    expect(result.success).toBe(true);
    expect(request.status).toBe(LocationRequestStatus.APPROVED);
    expect(location).toMatchObject({
      name: 'Quán mới',
      phone: '0123456789',
      status: LocationStatus.PUBLISHED,
    });
    expect(trust.recordEvent).toHaveBeenCalledTimes(1);
    expect(notification.notify).toHaveBeenCalledTimes(1);
    expect(logModel.create).toHaveBeenCalledTimes(1);
  });

  it('từ chối lý do từ chối rỗng trước khi thay đổi dữ liệu', async () => {
    const { service, reqModel, locModel } = createService();
    const request = {
      _id: requestId,
      locationId,
      submittedBy: submitterId,
      type: LocationRequestType.CREATE,
      status: LocationRequestStatus.PENDING,
      newData: {},
      save: jest.fn().mockResolvedValue(undefined),
    };
    reqModel.findById.mockReturnValue(query(request));

    const result = await service.reject(String(requestId), String(adminId), '   ');

    expect(result).toMatchObject({
      success: false,
      statusCode: 400,
    });
    expect(locModel.findById).not.toHaveBeenCalled();
    expect(request.save).not.toHaveBeenCalled();
  });
});
