import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LocationStatus } from 'src/common/schemas/common.enums';
import {
  Location,
  LocationDocument,
} from 'src/common/schemas/location.schema';
import { Review, ReviewDocument } from 'src/common/schemas/review.schema';
import { ReviewStatus } from 'src/common/schemas/common.enums';

@Injectable()
export class VendorDashboardService {
  constructor(
    @InjectModel(Location.name)
    private readonly locationModel: Model<LocationDocument>,
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
  ) {}

  async getOverview(userId: string) {
    const ownerId = new Types.ObjectId(userId);

    const [locations, reviewAgg] = await Promise.all([
      this.locationModel
        .find({
          ownerId,
          status: LocationStatus.PUBLISHED,
        })
        .lean()
        .exec(),
      this.reviewModel
        .aggregate<{
          totalReviews: number;
          avgRating: number;
        }>([
          {
            $lookup: {
              from: 'locations',
              localField: 'locationId',
              foreignField: '_id',
              as: 'location',
            },
          },
          { $unwind: '$location' },
          {
            $match: {
              'location.ownerId': ownerId,
              'location.status': LocationStatus.PUBLISHED,
              status: ReviewStatus.PUBLISHED,
            },
          },
          {
            $group: {
              _id: null,
              totalReviews: { $sum: 1 },
              avgRating: { $avg: '$rating' },
            },
          },
        ])
        .exec(),
    ]);

    const totalLocations = locations.length;
    const totalViews = locations.reduce(
      (sum, loc) => sum + (loc.viewCount ?? 0),
      0,
    );
    const totalReviews = reviewAgg[0]?.totalReviews ?? 0;
    const avgRating = reviewAgg[0]?.avgRating
      ? Number(reviewAgg[0].avgRating.toFixed(1))
      : 0;

    return {
      success: true,
      data: {
        totalLocations,
        totalViews,
        totalReviews,
        avgRating,
      },
    };
  }

  async getLocationStats(userId: string, days?: number) {
    const ownerId = new Types.ObjectId(userId);
    const cutoff =
      days && days > 0
        ? new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        : undefined;

    const locations = await this.locationModel
      .find({
        ownerId,
        status: LocationStatus.PUBLISHED,
      })
      .sort({ updatedAt: -1 })
      .lean()
      .exec();

    const locationIds = locations.map((loc) => loc._id);

    const reviewAggs = locationIds.length > 0
      ? await this.reviewModel
          .aggregate<{
            _id: Types.ObjectId;
            reviewCount: number;
            avgRating: number;
          }>([
            {
              $match: {
                locationId: { $in: locationIds },
                status: ReviewStatus.PUBLISHED,
                ...(cutoff ? { createdAt: { $gte: cutoff } } : {}),
              },
            },
            {
              $group: {
                _id: '$locationId',
                reviewCount: { $sum: 1 },
                avgRating: { $avg: '$rating' },
              },
            },
          ])
          .exec()
      : [];

    const reviewMap = new Map<string, { reviewCount: number; avgRating: number }>();
    for (const agg of reviewAggs) {
      reviewMap.set(agg._id.toString(), {
        reviewCount: agg.reviewCount,
        avgRating: agg.avgRating ? Number(agg.avgRating.toFixed(1)) : 0,
      });
    }

    const data = (locations as unknown as Array<Record<string, unknown>>).map((loc) => {
      const stats = reviewMap.get(String(loc._id));
      return {
        _id: loc._id,
        name: loc.name,
        address: loc.address,
        viewCount: (loc.viewCount as number) ?? 0,
        categoryId: loc.categoryId,
        reviewCount: stats?.reviewCount ?? 0,
        avgRating: stats?.avgRating ?? 0,
        updatedAt: loc.updatedAt,
      };
    });

    return {
      success: true,
      data,
    };
  }
}
