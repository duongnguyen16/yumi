import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { stringify } from 'node:querystring';
import {
  LocationView,
  LocationViewDocument,
} from 'src/common/schemas/location-view';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import { Review, ReviewDocument } from 'src/common/schemas/review.schema';

type LocationRating = {
  _id: unknown;
  avgRating?: number;
  reviewCount: number;
};

@Injectable()
export class LocationService {
  constructor(
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(LocationView.name)
    private locationViewModel: Model<LocationViewDocument>,
  ) {}

  async getAllLocations() {
    try {
      const locations = await this.locationModel.find().exec();
      const geoJson = {
        type: 'FeatureCollection',
        features: locations.map((location) => ({
          type: 'Feature',
          id: location._id,
          geometry: {
            type: 'Point',
            coordinates: [
              location.geo.coordinates[0],
              location.geo.coordinates[1],
            ],
          },
          properties: {
            id: location._id,
            name: location.name,
            // category: location.populate('category').then((cat) => cat.name),
            // subCategory: location
            //   .populate('subCategory')
            //   .then((subCat) => subCat.name),
            // description: location.description,
            // address: location.address,
            //   rating: await this.reviewModel.aggregate([
            //     {
            //       $match: { locationId: location._id },
            //     },
            //     {
            //       $group: {
            //         _id: '$locationId',
            //         averageRating: { $avg: '$rating' },
            //         reviewCount: { $sum: 1 },
            //       },
            //     },
            //   ]),
          },
        })),
      };
      console.log('geoJson:', geoJson);
      if (!locations || locations.length === 0) {
        return {
          success: false,
          statusCode: 404,
        };
      }
      return {
        success: true,
        locations: geoJson,
      };
    } catch (error) {
      console.log('Error retrieving locations:', error);
      return {
        success: false,
        statusCode: 500,
        message: 'Xảy ra lỗi khi lấy địa điểm',
      };
    }
  }

  async getLocationById(locationId: string, userId: string) {
    void userId;

    try {
      const location = await this.locationModel.findById(locationId).exec();
      if (!location) {
        return {
          success: false,
          message: 'Không tìm thấy địa điểm',
          statusCode: 404,
        };
      }
      const rating = await this.reviewModel.aggregate<LocationRating>([
        {
          $match: { locationId: location._id },
        },
        {
          $group: {
            _id: '$locationId',
            avgRating: { $avg: '$rating' },
            reviewCount: { $sum: 1 },
          },
        },
      ]);
      return {
        success: true,
        location: {
          ...location.toObject(),
          rating: rating[0],
        },
      };
    } catch (error) {
      console.log('Error retrieving location by ID:', error);
      return {
        success: false,
        message: 'Xảy ra lỗi khi lấy thông tin địa điểm',
        statusCode: 500,
      };
    }
  }

  async viewCount(userId: string, locationId: string) {
    try {
      const now = new Date();
      const viewDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now);
      await this.locationViewModel.create({
        locationId,
        userId,
        viewDate,
        viewedAt: now,
      });
      await this.locationModel.findByIdAndUpdate(locationId, {
        $inc: { viewCount: 1 },
      });
      return {
        success: true,
        counted: true,
      };
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return {
          success: true,
          counted: false,
        };
      }
      throw error;
    }
  }
  async searchLocation(
    limit: number,
    page: number,
    lat: string,
    lng: string,
    keyword?: string,
    categoryId?: string,
    subCategoryId?: string,
  ) {
    try {
      const filter: any = {
        status: 'PUBLISHED',
      };
      if (keyword) {
        const regex = keyword.trim();
        filter.$or = [
          { name: regex },
          { description: regex },
          { address: regex },
        ];
      }
      if (categoryId) {
        filter.categoryId = categoryId;
      }
      if (subCategoryId) {
        const ids = subCategoryId.split(',');
        if (ids.length > 0) {
          filter.subCategoryIds = {
            $in: ids,
          };
        }
      }
      const skip = (page - 1) * limit;
      const result = await this.locationModel.aggregate([
        {
          $geoNear: {
            near: {
              type: 'Point',
              coordinates: [Number.parseFloat(lng), Number.parseFloat(lat)],
            },
            distanceField: 'distance',
            spherical: true,
            query: filter,
          },
        },
        {
          $facet: {
            locations: [{ $skip: skip }, { $limit: limit }],
            total: [{ $count: 'count' }],
          },
        },
      ]);
      const locations = result[0].location || [];
      const total = result[0].total[0]?.count || 0;
      return {
        success: true,
        locations,
        total,
        page,
        limit,
        hasMore: page * limit < total,
      };
    } catch (error) {
      console.log('Error occur at searchLocation: ', error);
    }
  }
}

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}
