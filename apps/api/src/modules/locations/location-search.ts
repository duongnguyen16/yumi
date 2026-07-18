import type { PipelineStage } from 'mongoose';
import { ReviewStatus } from 'src/common/schemas/common.enums';

type LocationSearchPipelineOptions = {
  filter: Record<string, unknown>;
  lat: number;
  limit: number;
  lng: number;
  skip: number;
};

export function buildLocationSearchPipeline({
  filter,
  lat,
  limit,
  lng,
  skip,
}: LocationSearchPipelineOptions): PipelineStage[] {
  return [
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        distanceField: 'distance',
        spherical: true,
        query: filter,
      },
    },
    {
      $facet: {
        locations: [
          { $skip: skip },
          { $limit: limit },
          {
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
          },
          {
            $set: {
              rating: {
                avgRating: {
                  $ifNull: [
                    { $arrayElemAt: ['$ratingSummary.avgRating', 0] },
                    0,
                  ],
                },
                reviewCount: {
                  $ifNull: [
                    { $arrayElemAt: ['$ratingSummary.reviewCount', 0] },
                    0,
                  ],
                },
              },
            },
          },
          { $project: { ratingSummary: 0 } },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ];
}
