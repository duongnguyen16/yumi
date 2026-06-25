import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import { Review } from 'src/common/schemas/review.schema';

@Injectable()
export class LocationService {
  constructor(
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
    @InjectModel(Review.name) private reviewModel: Model<Review>,
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
}
