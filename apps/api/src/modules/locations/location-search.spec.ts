import { ReviewStatus } from 'src/common/schemas/common.enums';
import { buildLocationSearchPipeline } from './location-search';

describe('buildLocationSearchPipeline', () => {
  it('adds published review ratings to paginated location search results', () => {
    const filter = { status: 'PUBLISHED' };
    const pipeline = buildLocationSearchPipeline({
      filter,
      lat: 21.028,
      limit: 10,
      lng: 105.83991,
      skip: 10,
    });

    expect(pipeline[0]).toEqual({
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [105.83991, 21.028],
        },
        distanceField: 'distance',
        spherical: true,
        query: filter,
      },
    });

    const facet = (
      pipeline[1] as {
        $facet: {
          locations: Array<Record<string, unknown>>;
          total: Array<Record<string, unknown>>;
        };
      }
    ).$facet;
    expect(facet.locations.slice(0, 2)).toEqual([
      { $skip: 10 },
      { $limit: 10 },
    ]);
    expect(facet.locations[2]).toEqual({
      $lookup: {
        as: 'ratingSummary',
        from: 'reviews',
        let: { locationId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$locationId', '$$locationId'] },
                  { $eq: ['$status', ReviewStatus.PUBLISHED] },
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              avgRating: { $avg: '$rating' },
              reviewCount: { $sum: 1 },
            },
          },
        ],
      },
    });
    expect(facet.locations[3]).toEqual({
      $set: {
        rating: {
          avgRating: {
            $ifNull: [{ $arrayElemAt: ['$ratingSummary.avgRating', 0] }, 0],
          },
          reviewCount: {
            $ifNull: [{ $arrayElemAt: ['$ratingSummary.reviewCount', 0] }, 0],
          },
        },
      },
    });
    expect(facet.total).toEqual([{ $count: 'count' }]);
  });
});
