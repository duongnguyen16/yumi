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

describe('DisputeService', () => {
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

  it('lets each participant append evidence to their own side', async () => {
    const { service, disputeModel } = setup();
    const item = dispute();
    disputeModel.findById.mockReturnValue(query(item));
    const file = { url: 'https://example.com/a.jpg', fileType: 'IMAGE' as const };

    const result = await service.addEvidence(String(disputeId), String(vendorA), {
      evidenceFiles: [file],
    });

    expect(result.success).toBe(true);
    expect(item.evidenceA).toEqual([file]);
    expect(item.evidenceB).toEqual([]);
  });

  it('blocks an outsider from viewing a dispute', async () => {
    const { service, disputeModel } = setup();
    disputeModel.findById.mockReturnValue(query(dispute()));

    const result = await service.getForUser(
      String(disputeId),
      String(new Types.ObjectId()),
    );

    expect(result).toMatchObject({ success: false, statusCode: 403 });
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

  it('blocks resolution when the current owner changed', async () => {
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
