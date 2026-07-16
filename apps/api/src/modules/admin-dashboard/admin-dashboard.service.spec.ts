import { AdminDashboardService } from './admin-dashboard.service';

describe('AdminDashboardService audit logs', () => {
  const entries = [{ _id: 'log-1', action: 'CLAIM_APPROVE' }];
  const findQuery = {
    sort: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    populate: jest.fn(),
    lean: jest.fn(),
    exec: jest.fn().mockResolvedValue(entries),
  };
  const countQuery = {
    lean: jest.fn(),
    exec: jest.fn().mockResolvedValue(1),
  };
  const distinctQuery = {
    exec: jest
      .fn()
      .mockResolvedValue([
        'DISPUTE_KEEP',
        'APPEAL_OVERTURNED',
        'CLAIM_APPROVE',
      ]),
  };
  const auditLogModel = {
    find: jest.fn(() => findQuery),
    countDocuments: jest.fn(() => countQuery),
    distinct: jest.fn(() => distinctQuery),
  };
  const service = new AdminDashboardService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    auditLogModel as never,
  );

  beforeAll(() => {
    findQuery.sort.mockReturnValue(findQuery);
    findQuery.skip.mockReturnValue(findQuery);
    findQuery.limit.mockReturnValue(findQuery);
    findQuery.populate.mockReturnValue(findQuery);
    findQuery.lean.mockReturnValue(findQuery);
    countQuery.lean.mockReturnValue(countQuery);
  });

  it('returns sorted distinct action options with paginated logs', async () => {
    const result = await service.listAuditLogs(2, 20, 'CLAIM_APPROVE');

    expect(auditLogModel.distinct).toHaveBeenCalledWith('action');
    expect(result).toEqual({
      success: true,
      data: entries,
      total: 1,
      page: 2,
      limit: 20,
      actions: ['APPEAL_OVERTURNED', 'CLAIM_APPROVE', 'DISPUTE_KEEP'],
    });
  });
});
