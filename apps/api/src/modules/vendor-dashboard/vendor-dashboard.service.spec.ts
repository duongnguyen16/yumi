import { Types } from 'mongoose';
import { VendorDashboardService } from './vendor-dashboard.service';

const query = <T>(value: T) => ({
  sort: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(value),
});

describe('VendorDashboardService', () => {
  it('returns every owned location with its status', async () => {
    const ownerId = new Types.ObjectId();
    const locationId = new Types.ObjectId();
    const locationQuery = query([
      {
        _id: locationId,
        name: 'Địa điểm đang duyệt',
        address: 'Hà Nội',
        status: 'SUBMITTED',
        viewCount: 0,
      },
    ]);
    const locationModel = { find: jest.fn().mockReturnValue(locationQuery) };
    const reviewModel = { aggregate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }) };
    const service = new VendorDashboardService(locationModel as never, reviewModel as never);

    const result = await service.getLocationStats(String(ownerId));

    expect(locationModel.find).toHaveBeenCalledWith({ ownerId });
    expect(result.data).toEqual([
      expect.objectContaining({ _id: locationId, status: 'SUBMITTED', reviewCount: 0, avgRating: 0 }),
    ]);
  });
});
