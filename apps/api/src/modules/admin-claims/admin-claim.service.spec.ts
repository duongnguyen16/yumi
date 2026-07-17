import { Model, Types } from 'mongoose';
import { NotificationPort } from 'src/common/contracts/notification.port';
import { AuditLogDocument } from 'src/common/schemas/audit-log.schema';
import { ClaimRequestDocument } from 'src/common/schemas/claim-request.schema';
import { LocationDocument } from 'src/common/schemas/location.schema';
import {
  ClaimRequestStatus,
  TrustEventType,
} from 'src/common/schemas/common.enums';
import { TrustEngineService } from '../trust-engine/trust-engine.service';
import { AdminClaimService } from './admin-claim.service';

function query<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

describe('Kiểm thử AdminClaimService', () => {
  const claimId = new Types.ObjectId();
  const locId = new Types.ObjectId();
  const vendorId = new Types.ObjectId();
  const adminId = new Types.ObjectId();

  function createService() {
    const claimModel = {
      find: jest.fn(),
      countDocuments: jest.fn(),
      findById: jest.fn(),
    };
    const locModel = { findById: jest.fn() };
    const logModel = { create: jest.fn().mockResolvedValue({}) };
    const trust = { recordEvent: jest.fn().mockResolvedValue({}) };
    const notification = { notify: jest.fn().mockResolvedValue(undefined) };

    return {
      service: new AdminClaimService(
        claimModel as unknown as Model<ClaimRequestDocument>,
        locModel as unknown as Model<LocationDocument>,
        logModel as unknown as Model<AuditLogDocument>,
        trust as unknown as TrustEngineService,
        notification as unknown as NotificationPort,
      ),
      claimModel,
      locModel,
      logModel,
      trust,
      notification,
    };
  }

  function claim(data: Record<string, unknown> = {}) {
    return {
      _id: claimId,
      vendorId,
      locationId: locId,
      status: ClaimRequestStatus.PENDING,
      otpVerified: true,
      evidenceFiles: [
        {
          url: 'https://example.com/proof.jpg',
          fileType: 'IMAGE',
          geo: { type: 'Point', coordinates: [105.8, 21] },
          capturedAt: new Date(),
          metadata: { siteCode: 'ABC123' },
        },
      ],
      save: jest.fn().mockResolvedValue(undefined),
      ...data,
    };
  }

  function location(data: Record<string, unknown> = {}) {
    return {
      _id: locId,
      name: 'Quán Mộc',
      ownerId: null,
      save: jest.fn().mockResolvedValue(undefined),
      ...data,
    };
  }

  it('liệt kê claim chờ duyệt kèm cờ xem xét', async () => {
    const { service, claimModel } = createService();
    const list = [claim({ licenseUrl: 'https://example.com/license.pdf' })];
    const find = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(list),
    };
    claimModel.find.mockReturnValue(find);
    claimModel.countDocuments.mockReturnValue(query(1));

    const result = await service.getQueue({ page: 1, limit: 20 });

    expect(claimModel.find).toHaveBeenCalledWith({
      status: ClaimRequestStatus.PENDING,
    });
    expect(result).toMatchObject({
      success: true,
      total: 1,
      items: [
        {
          flags: {
            otpVerified: true,
            needsAdminScrutiny: false,
            hasOnSiteProof: true,
            hasSiteCode: true,
            hasLicense: true,
            eligibleForApprove: true,
          },
        },
      ],
    });
  });

  it('liệt kê claim đã hoàn tất theo lịch sử mới nhất trước', async () => {
    const { service, claimModel } = createService();
    const find = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    claimModel.find.mockReturnValue(find);
    claimModel.countDocuments.mockReturnValue(query(0));

    await service.getQueue({ page: 1, limit: 20, view: 'history' } as never);

    expect(claimModel.find).toHaveBeenCalledWith({
      status: {
        $in: [
          ClaimRequestStatus.APPROVED,
          ClaimRequestStatus.REJECTED,
          ClaimRequestStatus.RELEASED,
          ClaimRequestStatus.REVOKED,
        ],
      },
    });
    expect(find.sort).toHaveBeenCalledWith({
      'adminDecision.decidedAt': -1,
      updatedAt: -1,
      createdAt: -1,
    });
  });

  it('cho phép claim không có số điện thoại khi có bằng chứng xét duyệt của quản trị viên', async () => {
    const { service, claimModel, locModel } = createService();
    const req = claim({
      otpVerified: false,
      evidenceFiles: [
        {
          url: 'https://example.com/proof.jpg',
          fileType: 'IMAGE',
          geo: { type: 'Point', coordinates: [105.8, 21] },
          capturedAt: new Date(),
          metadata: {
            siteCode: 'ABC123',
            adminScrutiny: 'NO_PHONE_HIGHER_SCRUTINY',
          },
        },
      ],
    });
    const loc = location();
    claimModel.findById.mockReturnValue(query(req));
    locModel.findById.mockReturnValue(query(loc));

    const result = await service.approve(String(claimId), String(adminId));

    expect(result.success).toBe(true);
    expect(req.status).toBe(ClaimRequestStatus.APPROVED);
    expect(loc.ownerId).toEqual(vendorId);
  });

  it('từ chối duyệt khi bằng chứng chưa đầy đủ', async () => {
    const { service, claimModel, locModel, trust } = createService();
    const req = claim({ evidenceFiles: [] });
    claimModel.findById.mockReturnValue(query(req));
    locModel.findById.mockReturnValue(query(location()));

    const result = await service.approve(String(claimId), String(adminId));

    expect(result).toMatchObject({ success: false, statusCode: 422 });
    expect(trust.recordEvent).not.toHaveBeenCalled();
  });

  it('duyệt claim và ghi nhận các tác động kèm theo', async () => {
    const { service, claimModel, locModel, trust, notification, logModel } =
      createService();
    const req = claim();
    const loc = location();
    claimModel.findById.mockReturnValue(query(req));
    locModel.findById.mockReturnValue(query(loc));

    const result = await service.approve(String(claimId), String(adminId));

    expect(result.success).toBe(true);
    expect(req.status).toBe(ClaimRequestStatus.APPROVED);
    expect(loc.ownerId).toEqual(vendorId);
    expect(trust.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: TrustEventType.LOCATION_APPROVED }),
    );
    expect(notification.notify).toHaveBeenCalledTimes(1);
    expect(logModel.create).toHaveBeenCalledTimes(1);
  });

  it('đóng claim xung đột trước khi chuyển sang yêu cầu quyền truy cập', async () => {
    const { service, claimModel, locModel, trust, notification, logModel } =
      createService();
    const ownerId = new Types.ObjectId();
    const req = claim();
    const loc = location({ ownerId });
    claimModel.findById.mockReturnValue(query(req));
    locModel.findById.mockReturnValue(query(loc));

    const result = await service.approve(String(claimId), String(adminId));

    expect(result).toMatchObject({
      success: true,
      redirectToRequestAccess: true,
      claim: { status: ClaimRequestStatus.REJECTED },
    });
    expect(req.status).toBe(ClaimRequestStatus.REJECTED);
    expect(loc.save).not.toHaveBeenCalled();
    expect(trust.recordEvent).not.toHaveBeenCalled();
    expect(notification.notify).toHaveBeenCalledTimes(1);
    expect(logModel.create).toHaveBeenCalledTimes(1);
  });

  it('từ chối claim mà không thay đổi chủ sở hữu', async () => {
    const { service, claimModel, locModel, trust } = createService();
    const ownerId = new Types.ObjectId();
    const req = claim();
    const loc = location({ ownerId });
    claimModel.findById.mockReturnValue(query(req));
    locModel.findById.mockReturnValue(query(loc));

    const result = await service.reject(
      String(claimId),
      String(adminId),
      'Bằng chứng không rõ ràng',
    );

    expect(result.success).toBe(true);
    expect(req.status).toBe(ClaimRequestStatus.REJECTED);
    expect(loc.ownerId).toEqual(ownerId);
    expect(loc.save).not.toHaveBeenCalled();
    expect(trust.recordEvent).not.toHaveBeenCalled();
  });

  it('yêu cầu thêm bằng chứng và giữ claim ở trạng thái chờ duyệt', async () => {
    const { service, claimModel, locModel, notification, logModel } =
      createService();
    const req = claim();
    claimModel.findById.mockReturnValue(query(req));
    locModel.findById.mockReturnValue(query(location()));

    const result = await service.requestEvidence(
      String(claimId),
      String(adminId),
      'Chụp lại biển hiệu rõ hơn',
    );

    expect(result.success).toBe(true);
    expect(req.status).toBe(ClaimRequestStatus.PENDING);
    expect(req.save).not.toHaveBeenCalled();
    expect(notification.notify).toHaveBeenCalledTimes(1);
    expect(logModel.create).toHaveBeenCalledTimes(1);
  });
});
