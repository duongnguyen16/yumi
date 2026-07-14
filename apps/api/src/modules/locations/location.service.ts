import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LocationStatus, ReviewStatus } from 'src/common/schemas/common.enums';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import {
  LocationView,
  LocationViewDocument,
} from 'src/common/schemas/location-view';
import { Review, ReviewDocument } from 'src/common/schemas/review.schema';
import { Product, ProductDocument } from 'src/common/schemas/product.schema';

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
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(LocationView.name)
    private locationViewModel: Model<LocationViewDocument>,
  ) {}

  async getAllLocations() {
    try {
      const locations = await this.locationModel
        .find({ status: LocationStatus.PUBLISHED })
        .exec();
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
          },
        })),
      };
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
      const location = await this.locationModel
        .findOne({ _id: locationId, status: LocationStatus.PUBLISHED })
        .populate('subCategoryIds')
        .populate('categoryId')
        .exec();
      if (!location) {
        return {
          success: false,
          message: 'Không tìm thấy địa điểm',
          statusCode: 404,
        };
      }
      const [rating, products] = await Promise.all([
        this.reviewModel.aggregate<LocationRating>([
          {
            $match: {
              locationId: location._id,
              status: ReviewStatus.PUBLISHED,
            },
          },
          {
            $group: {
              _id: '$locationId',
              avgRating: { $avg: '$rating' },
              reviewCount: { $sum: 1 },
            },
          },
        ]),
        this.productModel
          .find({ locationId: location._id })
          .sort({ createdAt: -1 })
          .lean()
          .exec(),
      ]);
      return {
        success: true,
        location: {
          ...location.toObject(),
          rating: rating[0],
          products: products.map((product) => ({
            ...product,
            _id: String(product._id),
            id: String(product._id),
            locationId: String(product.locationId),
            priceDisclaimer:
              product.price !== undefined && product.price !== null
                ? 'Reference price only. Please confirm with the vendor before buying.'
                : undefined,
          })),
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
    lat: number,
    lng: number,
    keyword?: string,
    categoryId?: string,
    subCategoryId?: string,
  ) {
    try {
      const filter: Record<string, unknown> = {
        status: LocationStatus.PUBLISHED,
      };
      if (keyword) {
        const regex = keyword.trim();
        filter.$or = [
          { name: { $regex: regex, $options: 'i' } },
          { description: { $regex: regex, $options: 'i' } },
          { address: { $regex: regex, $options: 'i' } },
        ];
      }
      if (categoryId) {
        filter.categoryId = new Types.ObjectId(categoryId);
      }
      if (subCategoryId) {
        const ids = subCategoryId.split(',');
        if (ids.length > 0) {
          filter.subCategoryIds = {
            $in: ids.map((id) => new Types.ObjectId(id)),
          };
        }
      }
      const skip = (page - 1) * limit;
      const result = await this.locationModel.aggregate([
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
            locations: [{ $skip: skip }, { $limit: limit }],
            total: [{ $count: 'count' }],
          },
        },
      ]);
      const locations = result[0].locations || [];
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
