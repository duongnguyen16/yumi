import { Model, Types } from 'mongoose';
import { NotificationPort } from 'src/common/contracts/notification.port';
import { AuditLogDocument } from 'src/common/schemas/audit-log.schema';
import { ClaimRequestDocument } from 'src/common/schemas/claim-request.schema';
import {
  LocationStatus,
  RequestAccessStatus,
} from 'src/common/schemas/common.enums';
import { LocationDocument } from 'src/common/schemas/location.schema';
import { RequestAccessDocument } from 'src/common/schemas/request-access.schema';
import { RespondAction } from './dto/respond-request-access.dto';
import { RequestAccessService } from './request-access.service';

function query<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

describe('RequestAccessService', () => {
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
    const notify = { notify: jest.fn().mockResolvedValue(undefined) };
    const service = new RequestAccessService(
      reqModel as unknown as Model<RequestAccessDocument>,
      locModel as unknown as Model<LocationDocument>,
      claimModel as unknown as Model<ClaimRequestDocument>,
      logModel as unknown as Model<AuditLogDocument>,
      notify as NotificationPort,
    );
    return { service, reqModel, locModel, claimModel, logModel, notify };
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

  it('resolves pending state lazily without changing status', () => {
    const { service } = setup();
    const open = request({ timeoutAt: new Date('2026-07-12T00:00:00.000Z') });
    const late = request({ timeoutAt: new Date('2026-07-10T00:00:00.000Z') });
    const now = new Date('2026-07-11T00:00:00.000Z');

    expect(service.resolveEffectiveState(open, now)).toBe('PENDING_OPEN');
    expect(service.resolveEffectiveState(late, now)).toBe('PENDING_TIMED_OUT');
    expect(open.status).toBe(RequestAccessStatus.PENDING);
    expect(late.status).toBe(RequestAccessStatus.PENDING);
  });

  it('blocks creation when a pending claim owns the slot', async () => {
    const { service, locModel, claimModel, reqModel } = setup();
    locModel.findById.mockReturnValue(query(location()));
    claimModel.exists.mockResolvedValue({ _id: new Types.ObjectId() });

    const result = await service.createRequest(String(userId), {
      locationId: String(locId),
    });

    expect(result).toMatchObject({ success: false, statusCode: 409 });
    expect(reqModel.create).not.toHaveBeenCalled();
  });

  it('creates one pending request and notifies the owner', async () => {
    const { service, locModel, claimModel, reqModel, notify } = setup();
    const created = request();
    locModel.findById.mockReturnValue(query(location()));
    claimModel.exists.mockResolvedValue(null);
    reqModel.exists.mockResolvedValue(null);
    reqModel.create.mockResolvedValue(created);

    const result = await service.createRequest(String(userId), {
      locationId: String(locId),
      reason: 'Tôi đang vận hành địa điểm',
    });

    expect(result.success).toBe(true);
    expect(reqModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterId: userId,
        currentOwnerId: ownerId,
        status: RequestAccessStatus.PENDING,
      }),
    );
    expect(notify.notify).toHaveBeenCalledTimes(1);
  });

  it('lists incoming requests with effective state', async () => {
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

  it('grants ownership and starts a seven day hold', async () => {
    const { service, reqModel, locModel, notify, logModel } = setup();
    const req = request();
    const loc = location();
    reqModel.findById.mockReturnValue(query(req));
    locModel.findById.mockReturnValue(query(loc));

    const result = await service.respond(String(reqId), String(ownerId), {
      action: RespondAction.GRANT,
    });

    expect(result.success).toBe(true);
    expect(req.status).toBe(RequestAccessStatus.GRANTED);
    expect(loc.ownerId).toEqual(userId);
    expect(loc.holdExpiresAt).toBeInstanceOf(Date);
    expect(notify.notify).toHaveBeenCalledTimes(2);
    expect(logModel.create).toHaveBeenCalledTimes(1);
  });

  it('rejects without changing owner or hold', async () => {
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

  it('blocks owner response after the three day timeout', async () => {
    const { service, reqModel } = setup();
    reqModel.findById.mockReturnValue(
      query(request({ timeoutAt: new Date(Date.now() - 60_000) })),
    );

    const result = await service.respond(String(reqId), String(ownerId), {
      action: RespondAction.GRANT,
    });

    expect(result).toMatchObject({ success: false, statusCode: 409 });
  });

  it('blocks transfer when the location owner changed', async () => {
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

  it('blocks takeover before the lazy timeout', async () => {
    const { service, reqModel } = setup();
    reqModel.findById.mockReturnValue(query(request()));

    const result = await service.verifyTakeover(String(reqId), String(userId), {
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

  it('auto grants after timeout with onsite proof and hold', async () => {
    const { service, reqModel, locModel, notify, logModel } = setup();
    const req = request({ timeoutAt: new Date(Date.now() - 60_000) });
    const loc = location();
    reqModel.findById.mockReturnValue(query(req));
    locModel.findById.mockReturnValue(query(loc));

    const result = await service.verifyTakeover(String(reqId), String(userId), {
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
    expect(notify.notify).toHaveBeenCalledTimes(2);
    expect(logModel.create).toHaveBeenCalledTimes(1);
  });
});
