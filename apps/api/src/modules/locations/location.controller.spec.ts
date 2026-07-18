import { LocationController } from './location.controller';

describe('LocationController', () => {
  it('returns successful search results from the service', async () => {
    const result = {
      success: true,
      locations: [{ _id: '64b64c000000000000000001', name: 'Test Cafe' }],
      total: 1,
      page: 1,
      limit: 10,
      hasMore: false,
    };
    const service = {
      searchLocation: jest.fn().mockResolvedValue(result),
    };
    const controller = new LocationController(service as never);

    await expect(
      controller.searchLocation({
        keyword: 'cafe',
        page: 1,
        limit: 10,
        lat: 10.7769,
        lng: 106.7009,
      }),
    ).resolves.toEqual(result);
  });
});
