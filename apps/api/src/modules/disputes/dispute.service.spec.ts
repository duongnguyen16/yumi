import { Model, Types } from 'mongoose';
import { NotificationPort } from 'src/common/contracts/notification.port';
import { AuditService } from 'src/common/services/audit.service';
import { DisputeStatus } from 'src/common/schemas/common.enums';
import { DisputeDocument } from 'src/common/schemas/dispute.schema';
import { LocationDocument } from 'src/common/schemas/location.schema';
import { DisputeOutcome } from './dto/resolve-dispute.dto';
import { DisputeService } from './dispute.service';

function query<T>(value: T) {
  return {
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

describe('Kiểm thử DisputeService', () => {
  const disputeId = new Types.ObjectId();
  const reqId = new Types.ObjectId();
  const locId = new Types.ObjectId();
  const vendorA = new Types.ObjectId();
  const vendorB = new Types.ObjectId();
  const adminId = new Types.ObjectId();

  function setup() {
    const disputeModel = {
      findById: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
    };
    const locModel = { findById: jest.fn() };
    const audit = { log: jest.fn().mockResolvedValue({}) };
    const notify = { notify: jest.fn().mockResolvedValue(undefined) };
    const service = new DisputeService(
      disputeModel as unknown as Model<DisputeDocument>,
      locModel as unknown as Model<LocationDocument>,
      audit as unknown as AuditService,
      notify as NotificationPort,
    );
    return { service, disputeModel, locModel, audit, notify };
  }

  function dispute(data: Record<string, unknown> = {}) {
    return {
      _id: disputeId,
      requestAccessId: reqId,
      locationId: locId,
      vendorAId: vendorA,
      vendorBId: vendorB,
      evidenceA: [],
      evidenceB: [],
      status: DisputeStatus.OPEN,
      save: jest.fn().mockResolvedValue(undefined),
      ...data,
    };
  }

  function location(data: Record<string, unknown> = {}) {
    return {
      _id: locId,
      name: 'Quán Mộc',
      ownerId: vendorA,
      holdExpiresAt: new Date(),
      save: jest.fn().mockResolvedValue(undefined),
      ...data,
    };
  }

  it('chặn người ngoài xem tranh chấp', async () => {
    const { service, disputeModel } = setup();
    disputeModel.findById.mockReturnValue(query(dispute()));

    const result = await service.getForUser(
      String(disputeId),
      String(new Types.ObjectId()),
    );

    expect(result).toMatchObject({ success: false, statusCode: 403 });
  });

  it('cho phép bên tham gia xem tranh chấp khi vendor đã được populate', async () => {
    const { service, disputeModel } = setup();
    disputeModel.findById.mockReturnValue(
      query(
        dispute({
          vendorAId: { _id: vendorA, email: 'duong@gmail.com' },
          vendorBId: { _id: vendorB },
        }),
      ),
    );

    const result = await service.getForUser(String(disputeId), String(vendorA));

    expect(result.success).toBe(true);
  });

  it('liệt kê tranh chấp đã giải quyết theo lịch sử mới nhất trước', async () => {
    const { service, disputeModel } = setup();
    const find = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };
    disputeModel.find.mockReturnValue(find);
    disputeModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });

    await service.getQueue({ page: 1, limit: 20, view: 'history' } as never);

    expect(disputeModel.find).toHaveBeenCalledWith({
      status: {
        $in: [
          DisputeStatus.RESOLVED_KEEP,
          DisputeStatus.RESOLVED_TRANSFER,
          DisputeStatus.RESOLVED_REVOKE,
        ],
      },
    });
    expect(find.sort).toHaveBeenCalledWith({
      'adminDecision.decidedAt': -1,
      updatedAt: -1,
      createdAt: -1,
    });
  });

  it.each([
    [DisputeOutcome.KEEP, DisputeStatus.RESOLVED_KEEP, vendorA],
    [DisputeOutcome.TRANSFER, DisputeStatus.RESOLVED_TRANSFER, vendorB],
    [DisputeOutcome.REVOKE, DisputeStatus.RESOLVED_REVOKE, undefined],
  ])('resolves %s with the canonical owner', async (outcome, status, owner) => {
    const { service, disputeModel, locModel, audit, notify } = setup();
    const item = dispute();
    const loc = location();
    disputeModel.findById.mockReturnValue(query(item));
    locModel.findById.mockReturnValue(query(loc));

    const result = await service.resolve(String(disputeId), String(adminId), {
      outcome,
      reason: 'Đã kiểm tra bằng chứng hai bên',
    });

    expect(result.success).toBe(true);
    expect(item.status).toBe(status);
    expect(loc.ownerId).toEqual(owner);
    if (outcome !== DisputeOutcome.KEEP) {
      expect(loc.holdExpiresAt).toBeUndefined();
    }
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        diff: expect.objectContaining({
          ownerId: { from: String(vendorA), to: owner ? String(owner) : null },
        }),
      }),
    );
    expect(notify.notify).toHaveBeenCalledTimes(2);
  });

  it('chặn giải quyết khi chủ sở hữu hiện tại đã thay đổi', async () => {
    const { service, disputeModel, locModel } = setup();
    disputeModel.findById.mockReturnValue(query(dispute()));
    locModel.findById.mockReturnValue(
      query(location({ ownerId: new Types.ObjectId() })),
    );

    const result = await service.resolve(String(disputeId), String(adminId), {
      outcome: DisputeOutcome.TRANSFER,
      reason: 'Đã kiểm tra bằng chứng hai bên',
    });

    expect(result).toMatchObject({ success: false, statusCode: 409 });
  });
});
