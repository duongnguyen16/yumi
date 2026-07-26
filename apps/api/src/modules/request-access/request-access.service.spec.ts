import { Model, Types } from 'mongoose';
import { UnprocessableEntityException } from '@nestjs/common';
import { NotificationPort } from 'src/common/contracts/notification.port';
import { AuditLogDocument } from 'src/common/schemas/audit-log.schema';
import { ClaimRequestDocument } from 'src/common/schemas/claim-request.schema';
import {
  DisputeStatus,
  LocationStatus,
  RequestAccessStatus,
  UserRole,
  UserStatus,
} from 'src/common/schemas/common.enums';
import { LocationDocument } from 'src/common/schemas/location.schema';
import { RequestAccessDocument } from 'src/common/schemas/request-access.schema';
import { DisputeDocument } from 'src/common/schemas/dispute.schema';
import { RespondAction } from './dto/respond-request-access.dto';
import { RequestAccessService } from './request-access.service';

function query<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

describe('Kiểm thử RequestAccessService', () => {
  const reqId = new Types.ObjectId();
  const locId = new Types.ObjectId();
  const ownerId = new Types.ObjectId();
  const userId = new Types.ObjectId();

  function setup() {
    const reqModel = {
      exists: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
    };
    const locModel = { findById: jest.fn() };
    const claimModel = { exists: jest.fn() };
    const logModel = { create: jest.fn().mockResolvedValue({}) };
    const userModel = {
      findById: jest.fn().mockReturnValue(
        query({
          role: UserRole.VENDOR,
          status: UserStatus.ACTIVE,
          phoneVerified: true,
        }),
      ),
    };
    const notify = { notify: jest.fn().mockResolvedValue(undefined) };
    const evidenceVerifier = {
      assertValid: jest.fn(),
    };
    const disputeModel = { exists: jest.fn().mockResolvedValue(null) };
    const verification = {
      consume: jest.fn().mockResolvedValue({
        success: true,
        otpVerified: true,
      }),
    };
    const service = new RequestAccessService(
      reqModel as unknown as Model<RequestAccessDocument>,
      locModel as unknown as Model<LocationDocument>,
      claimModel as unknown as Model<ClaimRequestDocument>,
      logModel as unknown as Model<AuditLogDocument>,
      notify as NotificationPort,
      userModel as never,
      evidenceVerifier as never,
      verification as never,
      disputeModel as unknown as Model<DisputeDocument>,
    );
    return {
      service,
      reqModel,
      locModel,
      claimModel,
      logModel,
      userModel,
      notify,
      evidenceVerifier,
      verification,
      disputeModel,
    };
  }

  function request(data: Record<string, unknown> = {}) {
    return {
      _id: reqId,
      locationId: locId,
      requesterId: userId,
      currentOwnerId: ownerId,
      evidenceFiles: [],
      otpVerified: false,
      status: RequestAccessStatus.PENDING,
      timeoutAt: new Date(Date.now() + 60_000),
      save: jest.fn().mockResolvedValue(undefined),
      ...data,
    };
  }

  function location(data: Record<string, unknown> = {}) {
    return {
      _id: locId,
      name: 'Quán Mộc',
      status: LocationStatus.PUBLISHED,
      ownerId,
      holdExpiresAt: undefined,
      save: jest.fn().mockResolvedValue(undefined),
      ...data,
    };
  }

  it('xác định trạng thái chờ một cách lười biếng mà không đổi trạng thái lưu trữ', () => {
    const { service } = setup();
    const open = request({ timeoutAt: new Date('2026-07-12T00:00:00.000Z') });
    const late = request({ timeoutAt: new Date('2026-07-10T00:00:00.000Z') });
    const now = new Date('2026-07-11T00:00:00.000Z');

    expect(service.resolveEffectiveState(open, now)).toBe('PENDING_OPEN');
    expect(service.resolveEffectiveState(late, now)).toBe('PENDING_TIMED_OUT');
    expect(open.status).toBe(RequestAccessStatus.PENDING);
    expect(late.status).toBe(RequestAccessStatus.PENDING);
  });

  it('chặn tạo mới khi claim chờ duyệt đã chiếm vị trí', async () => {
    const { service, locModel, claimModel, reqModel } = setup();
    locModel.findById.mockReturnValue(query(location()));
    claimModel.exists.mockResolvedValue({ _id: new Types.ObjectId() });

    const result = await service.createRequest(String(userId), {
      locationId: String(locId),
    });

    expect(result).toMatchObject({ success: false, statusCode: 409 });
    expect(reqModel.create).not.toHaveBeenCalled();
  });

  it('cho phép Customer đang hoạt động và đã xác minh số điện thoại tạo yêu cầu chuyển quyền', async () => {
    const { service, userModel, locModel, claimModel, reqModel } = setup();
    userModel.findById.mockReturnValue(
      query({
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        phoneVerified: true,
      }),
    );
    locModel.findById.mockReturnValue(query(location()));
    claimModel.exists.mockResolvedValue(null);
    reqModel.exists.mockResolvedValue(null);
    reqModel.create.mockResolvedValue(request());

    const result = await service.createRequest(String(userId), {
      locationId: String(locId),
      evidenceFiles: [
        {
          url: 'https://example.com/proof.jpg',
          fileType: 'IMAGE',
          geo: { type: 'Point', coordinates: [105.8, 21] },
          capturedAt: new Date(),
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(reqModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ requesterId: userId }),
    );
  });

  it('yêu cầu bằng chứng tại chỗ ngay khi tạo yêu cầu chuyển quyền', async () => {
    const { service, locModel, claimModel, reqModel, evidenceVerifier } =
      setup();
    locModel.findById.mockReturnValue(query(location()));
    claimModel.exists.mockResolvedValue(null);
    reqModel.exists.mockResolvedValue(null);
    evidenceVerifier.assertValid.mockImplementation(() => {
      throw new UnprocessableEntityException(
        'Cần ảnh tại chỗ có vị trí và thời gian chụp',
      );
    });

    const result = await service.createRequest(String(userId), {
      locationId: String(locId),
      evidenceFiles: [],
    });

    expect(result).toMatchObject({ success: false, statusCode: 422 });
    expect(reqModel.create).not.toHaveBeenCalled();
  });

  it('tạo một yêu cầu chờ duyệt và thông báo cho chủ sở hữu', async () => {
    const { service, locModel, claimModel, reqModel, notify } = setup();
    const created = request();
    locModel.findById.mockReturnValue(query(location()));
    claimModel.exists.mockResolvedValue(null);
    reqModel.exists.mockResolvedValue(null);
    reqModel.create.mockResolvedValue(created);

    const result = await service.createRequest(String(userId), {
      locationId: String(locId),
      verificationSessionId: new Types.ObjectId().toHexString(),
      reason: 'Tôi đang vận hành địa điểm',
      evidenceFiles: [
        {
          url: 'https://example.com/proof.jpg',
          fileType: 'IMAGE',
          geo: { type: 'Point', coordinates: [105.8, 21] },
          capturedAt: new Date(),
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(reqModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterId: userId,
        currentOwnerId: ownerId,
        otpVerified: true,
        requestReason: 'Tôi đang vận hành địa điểm',
        status: RequestAccessStatus.PENDING,
      }),
    );
    expect(notify.notify).toHaveBeenCalledTimes(1);
  });

  it('consume phiên xác minh CREATE trước khi tạo yêu cầu chuyển quyền', async () => {
    const { service, locModel, claimModel, reqModel, verification } = setup();
    const sessionId = new Types.ObjectId().toHexString();
    locModel.findById.mockReturnValue(query(location()));
    claimModel.exists.mockResolvedValue(null);
    reqModel.exists.mockResolvedValue(null);
    reqModel.create.mockResolvedValue(request());

    const result = await service.createRequest(String(userId), {
      locationId: String(locId),
      verificationSessionId: sessionId,
      evidenceFiles: [
        {
          url: `https://project.supabase.co/storage/v1/object/public/images/locations/${userId}/proof.jpg`,
          fileType: 'IMAGE',
          geo: { type: 'Point', coordinates: [105.8, 21] },
          accuracyMeters: 10,
          capturedAt: new Date(),
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(verification.consume).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId,
        userId: String(userId),
        locationId: String(locId),
        purpose: 'CREATE',
      }),
    );
  });

  it('chặn tạo request-access khi địa điểm đang có ownership workflow lock', async () => {
    const { service, locModel, claimModel, reqModel, disputeModel } = setup();
    locModel.findById.mockReturnValue(query(location()));
    claimModel.exists.mockResolvedValue(null);
    reqModel.exists.mockResolvedValue(null);
    disputeModel.exists.mockResolvedValue({
      _id: new Types.ObjectId(),
      status: DisputeStatus.OPEN,
    });

    const result = await service.createRequest(String(userId), {
      locationId: String(locId),
      verificationSessionId: new Types.ObjectId().toHexString(),
      evidenceFiles: [
        {
          url: `https://project.supabase.co/storage/v1/object/public/images/locations/${userId}/proof.jpg`,
          fileType: 'IMAGE',
          geo: { type: 'Point', coordinates: [105.8, 21] },
          accuracyMeters: 10,
          capturedAt: new Date(),
        },
      ],
    });

    expect(result).toMatchObject({ success: false, statusCode: 409 });
    expect(reqModel.create).not.toHaveBeenCalled();
  });

  it('liệt kê yêu cầu đến kèm trạng thái hiệu lực', async () => {
    const { service, reqModel } = setup();
    const item = request();
    const find = {
      sort: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([item]),
    };
    reqModel.find.mockReturnValue(find);

    const result = await service.listMine(String(ownerId), 'owner');

    expect(reqModel.find).toHaveBeenCalledWith({ currentOwnerId: ownerId });
    expect(result).toMatchObject({
      success: true,
      items: [{ effectiveState: 'PENDING_OPEN', isExpired: false }],
    });
  });

  it('chuyển quyền sở hữu và bắt đầu khóa bảy ngày', async () => {
    const { service, reqModel, locModel, userModel, notify, logModel } = setup();
    const req = request();
    const loc = location();
    const requester = {
      role: UserRole.CUSTOMER,
      save: jest.fn().mockResolvedValue(undefined),
    };
    reqModel.findById.mockReturnValue(query(req));
    locModel.findById.mockReturnValue(query(loc));
    userModel.findById.mockReturnValue(query(requester));

    const result = await service.respond(String(reqId), String(ownerId), {
      action: RespondAction.GRANT,
    });

    expect(result.success).toBe(true);
    expect(req.status).toBe(RequestAccessStatus.GRANTED);
    expect(loc.ownerId).toEqual(userId);
    expect(loc.holdExpiresAt).toBeInstanceOf(Date);
    expect(requester.role).toBe(UserRole.VENDOR);
    expect(requester.save).toHaveBeenCalledTimes(1);
    expect(notify.notify).toHaveBeenCalledTimes(2);
    expect(logModel.create).toHaveBeenCalledTimes(1);
  });

  it('từ chối mà không thay đổi chủ sở hữu hoặc thời hạn khóa', async () => {
    const { service, reqModel, locModel, notify } = setup();
    const req = request();
    const loc = location();
    reqModel.findById.mockReturnValue(query(req));
    locModel.findById.mockReturnValue(query(loc));

    const result = await service.respond(String(reqId), String(ownerId), {
      action: RespondAction.REJECT,
      reason: 'Không đủ căn cứ chuyển quyền',
    });

    expect(result).toMatchObject({ success: true, canAppeal: true });
    expect(req.status).toBe(RequestAccessStatus.REJECTED);
    expect(loc.ownerId).toEqual(ownerId);
    expect(loc.holdExpiresAt).toBeUndefined();
    expect(loc.save).not.toHaveBeenCalled();
    expect(notify.notify).toHaveBeenCalledTimes(2);
  });

  it('chặn phản hồi của chủ sở hữu sau thời hạn ba ngày', async () => {
    const { service, reqModel } = setup();
    reqModel.findById.mockReturnValue(
      query(request({ timeoutAt: new Date(Date.now() - 60_000) })),
    );

    const result = await service.respond(String(reqId), String(ownerId), {
      action: RespondAction.GRANT,
    });

    expect(result).toMatchObject({ success: false, statusCode: 409 });
  });

  it('chặn chuyển quyền khi chủ sở hữu địa điểm đã thay đổi', async () => {
    const { service, reqModel, locModel } = setup();
    reqModel.findById.mockReturnValue(query(request()));
    locModel.findById.mockReturnValue(
      query(location({ ownerId: new Types.ObjectId() })),
    );

    const result = await service.respond(String(reqId), String(ownerId), {
      action: RespondAction.GRANT,
    });

    expect(result).toMatchObject({ success: false, statusCode: 409 });
  });

  it('chặn tiếp quản trước thời hạn chờ tự xác định', async () => {
    const { service, reqModel } = setup();
    reqModel.findById.mockReturnValue(query(request()));

    const result = await service.verifyTakeover(String(reqId), String(userId), {
      verificationSessionId: new Types.ObjectId().toHexString(),
      evidenceFiles: [
        {
          url: 'https://example.com/proof.jpg',
          fileType: 'IMAGE',
          geo: { type: 'Point', coordinates: [105.8, 21] },
          capturedAt: new Date(),
        },
      ],
    });

    expect(result).toMatchObject({ success: false, statusCode: 409 });
  });

  it('tự động cấp quyền sau khi hết hạn khi có bằng chứng tại chỗ và thời hạn khóa', async () => {
    const { service, reqModel, locModel, userModel, notify, logModel } = setup();
    const req = request({ timeoutAt: new Date(Date.now() - 60_000) });
    const loc = location();
    const requester = {
      role: UserRole.CUSTOMER,
      save: jest.fn().mockResolvedValue(undefined),
    };
    reqModel.findById.mockReturnValue(query(req));
    locModel.findById.mockReturnValue(query(loc));
    userModel.findById.mockReturnValue(query(requester));

    const result = await service.verifyTakeover(String(reqId), String(userId), {
      verificationSessionId: new Types.ObjectId().toHexString(),
      evidenceFiles: [
        {
          url: 'https://example.com/proof.jpg',
          fileType: 'IMAGE',
          geo: { type: 'Point', coordinates: [105.8, 21] },
          capturedAt: new Date(),
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(req.status).toBe(RequestAccessStatus.AUTO_GRANTED);
    expect(loc.ownerId).toEqual(userId);
    expect(loc.holdExpiresAt).toBeInstanceOf(Date);
    expect(requester.role).toBe(UserRole.VENDOR);
    expect(requester.save).toHaveBeenCalledTimes(1);
    expect(notify.notify).toHaveBeenCalledTimes(2);
    expect(logModel.create).toHaveBeenCalledTimes(1);
  });
});
