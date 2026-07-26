import { Model, Types } from 'mongoose';
import { AuditLogDocument } from 'src/common/schemas/audit-log.schema';
import { LocationDocument } from 'src/common/schemas/location.schema';
import { UserDocument } from 'src/common/schemas/user.schema';
import {
  LocationRequestDocument,
  LocationRequestStatus,
  LocationRequestType,
} from 'src/common/schemas/location-request';
import { LocationStatus, UserRole } from 'src/common/schemas/common.enums';
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
    const userModel = {
      findById: jest.fn().mockReturnValue(
        query({
          role: UserRole.VENDOR,
          save: jest.fn().mockResolvedValue(undefined),
        }),
      ),
    };
    const service = new AdminLocationService(
      reqModel as unknown as Model<LocationRequestDocument>,
      locModel as unknown as Model<LocationDocument>,
      userModel as unknown as Model<UserDocument>,
      logModel as unknown as Model<AuditLogDocument>,
      trust as unknown as TrustEngineService,
      notification as unknown as NotificationPort,
    );

    return {
      service,
      reqModel,
      locModel,
      logModel,
      trust,
      notification,
      userModel,
    };
  }

  it('liệt kê yêu cầu chờ duyệt và duyệt lại kèm cờ hàng đợi', async () => {
    const { service, reqModel } = createService();
    const list = [
      {
        _id: requestId,
        isPotentialDuplicate: true,
        suspectedDuplicateLocationIds: [locationId],
        deviceDistanceMeters: 201,
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

  it('không gắn cờ pin xa khi khoảng cách đúng 200 mét', async () => {
    const { service, reqModel } = createService();
    const findChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([{ deviceDistanceMeters: 200 }]),
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

  it('gán người gửi làm owner khi duyệt đăng ký có sở hữu', async () => {
    const { service, reqModel, locModel, userModel } = createService();
    const submitter = {
      role: UserRole.CUSTOMER,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const request = {
      _id: requestId,
      submittedBy: submitterId,
      locationId,
      status: LocationRequestStatus.PENDING,
      ownershipRequested: true,
      verificationProof: { proofUrls: ['https://storage/proof.mp4'] },
      newData: {},
      save: jest.fn().mockResolvedValue(undefined),
    };
    const location = {
      _id: locationId,
      status: LocationStatus.SUBMITTED,
      ownerId: undefined,
      save: jest.fn().mockResolvedValue(undefined),
    };
    userModel.findById.mockReturnValue(query(submitter));
    reqModel.findById.mockReturnValue(query(request));
    locModel.findById.mockReturnValue(query(location));

    const result = await service.approve(String(request._id), String(adminId));

    expect(result.success).toBe(true);
    expect(location.ownerId).toEqual(request.submittedBy);
    expect(submitter.role).toBe(UserRole.VENDOR);
    expect(submitter.save).toHaveBeenCalledTimes(1);
  });

  it('gán người gửi làm owner khi phiếu có video xác minh sở hữu', async () => {
    const { service, reqModel, locModel } = createService();
    const request = {
      _id: requestId,
      submittedBy: submitterId,
      locationId,
      status: LocationRequestStatus.PENDING,
      ownershipRequested: false,
      verificationProof: { videoUrls: ['https://storage/proof.mp4'] },
      newData: {},
      save: jest.fn().mockResolvedValue(undefined),
    };
    const location = {
      _id: locationId,
      status: LocationStatus.SUBMITTED,
      ownerId: undefined,
      save: jest.fn().mockResolvedValue(undefined),
    };
    reqModel.findById.mockReturnValue(query(request));
    locModel.findById.mockReturnValue(query(location));

    const result = await service.approve(String(request._id), String(adminId));

    expect(result.success).toBe(true);
    expect(location.ownerId).toEqual(request.submittedBy);
  });

  it('vẫn nhận diện bằng chứng proofUrls của phiếu cũ', async () => {
    const { service, reqModel, locModel } = createService();
    const request = {
      _id: requestId,
      submittedBy: submitterId,
      locationId,
      status: LocationRequestStatus.PENDING,
      verificationProof: {
        proofUrls: ['https://storage/location/video/site-code.mp4'],
      },
      newData: {},
      save: jest.fn().mockResolvedValue(undefined),
    };
    const location = {
      _id: locationId,
      status: LocationStatus.SUBMITTED,
      ownerId: undefined,
      save: jest.fn().mockResolvedValue(undefined),
    };
    reqModel.findById.mockReturnValue(query(request));
    locModel.findById.mockReturnValue(query(location));

    const result = await service.approve(String(request._id), String(adminId));

    expect(result.success).toBe(true);
    expect(location.ownerId).toEqual(request.submittedBy);
  });

  it('không gán owner khi duyệt đóng góp cộng đồng', async () => {
    const { service, reqModel, locModel, userModel } = createService();
    const request = {
      _id: requestId,
      submittedBy: submitterId,
      locationId,
      status: LocationRequestStatus.PENDING,
      ownershipRequested: false,
      newData: {},
      save: jest.fn().mockResolvedValue(undefined),
    };
    const location = {
      _id: locationId,
      status: LocationStatus.SUBMITTED,
      ownerId: undefined,
      save: jest.fn().mockResolvedValue(undefined),
    };
    reqModel.findById.mockReturnValue(query(request));
    locModel.findById.mockReturnValue(query(location));

    await service.approve(String(request._id), String(adminId));

    expect(location.ownerId).toBeUndefined();
    expect(userModel.findById).not.toHaveBeenCalled();
  });

  it('không duyệt đăng ký sở hữu khi không tìm thấy người gửi', async () => {
    const { service, reqModel, locModel, userModel } = createService();
    const request = {
      _id: requestId,
      submittedBy: submitterId,
      locationId,
      status: LocationRequestStatus.PENDING,
      ownershipRequested: true,
      verificationProof: { proofUrls: ['https://storage/proof.mp4'] },
      newData: {},
      save: jest.fn().mockResolvedValue(undefined),
    };
    const location = {
      _id: locationId,
      status: LocationStatus.SUBMITTED,
      ownerId: undefined,
      save: jest.fn().mockResolvedValue(undefined),
    };
    userModel.findById.mockReturnValue(query(null));
    reqModel.findById.mockReturnValue(query(request));
    locModel.findById.mockReturnValue(query(location));

    const result = await service.approve(String(request._id), String(adminId));

    expect(result).toMatchObject({ success: false, statusCode: 404 });
    expect(location.ownerId).toBeUndefined();
    expect(request.save).not.toHaveBeenCalled();
    expect(location.save).not.toHaveBeenCalled();
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

    const result = await service.reject(
      String(requestId),
      String(adminId),
      '   ',
    );

    expect(result).toMatchObject({
      success: false,
      statusCode: 400,
    });
    expect(locModel.findById).not.toHaveBeenCalled();
    expect(request.save).not.toHaveBeenCalled();
  });

  it('xac nhan dia diem trung lap, an khoi public va tao hook khang cao', async () => {
    const { service, locModel, logModel, notification } = createService();
    const location = {
      _id: locationId,
      name: 'Quan phu bi trung',
      submittedBy: submitterId,
      ownerId: undefined,
      status: LocationStatus.PUBLISHED,
      isDuplicate: false,
      isSuspectedDuplicate: true,
      save: jest.fn().mockResolvedValue(undefined),
    };
    locModel.findById.mockReturnValue(query(location));

    const result = await service.confirmDuplicateLocation(
      String(locationId),
      String(adminId),
      'Trung voi dia diem da ton tai',
    );

    expect(result).toMatchObject({
      success: true,
      location: { status: LocationStatus.HIDDEN, isDuplicate: true },
    });
    expect(location).toMatchObject({
      status: LocationStatus.HIDDEN,
      isDuplicate: true,
      isSuspectedDuplicate: false,
    });
    expect(logModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOCATION_HIDE_DUPLICATE',
        targetCollection: 'locations',
        targetId: locationId,
      }),
    );
    expect(notification.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: String(submitterId),
        type: 'LOCATION_DUPLICATE_HIDDEN',
        refCollection: 'locations',
        refId: String(locationId),
      }),
    );
  });

  it('đóng phiếu khi admin xác nhận địa điểm trùng', async () => {
    const { service, reqModel, locModel } = createService();
    const originalLocationId = new Types.ObjectId();
    const request = {
      _id: requestId,
      submittedBy: submitterId,
      locationId,
      status: LocationRequestStatus.PENDING,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const location = {
      _id: locationId,
      name: 'Quan nghi trung',
      submittedBy: submitterId,
      status: LocationStatus.SUBMITTED,
      isDuplicate: false,
      isSuspectedDuplicate: true,
      save: jest.fn().mockResolvedValue(undefined),
    };
    reqModel.findById.mockReturnValue(query(request));
    locModel.findById.mockReturnValue(query(location));

    const result = await service.confirmDuplicateRequest(
      String(request._id),
      String(adminId),
      'Trùng địa điểm đã tồn tại',
      String(originalLocationId),
    );

    expect(result.success).toBe(true);
    expect(request.status).toBe(LocationRequestStatus.REJECTED);
    expect(location.status).toBe(LocationStatus.HIDDEN);
    expect(location.isDuplicate).toBe(true);
  });
});
