import { Types } from 'mongoose';
import { LocationStatus } from 'src/common/schemas/common.enums';
import { LocationService } from './location.service';

describe('LocationService', () => {
  function createService() {
    const locationModel = {
      aggregate: jest.fn().mockResolvedValue([{ locations: [], total: [] }]),
    };
    const reviewModel = {};
    const productModel = {};
    const locationViewModel = {};

    return {
      service: new LocationService(
        locationModel as never,
        reviewModel as never,
        productModel as never,
        locationViewModel as never,
      ),
      locationModel,
    };
  }

  it('casts category filters to ObjectId before using them in aggregate search', async () => {
    const categoryId = new Types.ObjectId();
    const subCategoryId = new Types.ObjectId();
    const { service, locationModel } = createService();

    await service.searchLocation(
      10,
      1,
      21.0127,
      105.5269,
      undefined,
      String(categoryId),
      String(subCategoryId),
    );

    const pipeline = locationModel.aggregate.mock.calls[0][0];
    const query = pipeline[0].$geoNear.query;

    expect(query).toEqual({
      status: LocationStatus.PUBLISHED,
      categoryId,
      subCategoryIds: { $in: [subCategoryId] },
    });
  });
});
