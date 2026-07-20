import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LocationStatus } from 'src/common/schemas/common.enums';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import { LocationGeoService } from '../location-geo/location-geo.service';

const DUPLICATE_DISTANCE_METERS = 50;
const DUPLICATE_SIMILARITY_THRESHOLD = 0.8;

export type DuplicateLocationPreview = {
  id: string;
  name: string;
  address: string;
  distanceMeters?: number | null;
  similarity?: number;
  status: LocationStatus;
};

@Injectable()
export class DuplicateDetectionService {
  constructor(
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
    private readonly locationGeoService: LocationGeoService,
  ) {}

  async findPossibleDuplicates(
    name: string,
    latitude?: number,
    longitude?: number,
    categoryId?: string,
  ): Promise<DuplicateLocationPreview[]> {
    const query: Record<string, unknown> = {
      status: { $in: [LocationStatus.PUBLISHED, LocationStatus.SUBMITTED] },
    };

    if (categoryId) {
      query.categoryId = new Types.ObjectId(categoryId);
    }

    if (latitude !== undefined && longitude !== undefined) {
      query.geo = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: DUPLICATE_DISTANCE_METERS,
        },
      };
    } else {
      query.name = { $regex: escapeRegex(name.trim()), $options: 'i' };
    }

    const locations = await this.locationModel
      .find(query)
      .limit(20)
      .lean()
      .exec();

    return locations
      .map((location) => {
        const distanceMeters =
          latitude !== undefined && longitude !== undefined
            ? this.locationGeoService.getDistanceMeters(
                latitude,
                longitude,
                location.geo.coordinates[1],
                location.geo.coordinates[0],
              )
            : null;
        const similarity = getNameSimilarity(name, location.name);

        return {
          id: String(location._id),
          name: location.name,
          address: location.address,
          status: location.status,
          distanceMeters,
          similarity,
        };
      })
      .filter(
        (location) =>
          location.similarity >= DUPLICATE_SIMILARITY_THRESHOLD &&
          (location.distanceMeters === null ||
            location.distanceMeters <= DUPLICATE_DISTANCE_METERS),
      )
      .slice(0, 5);
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizePlaceName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getNameSimilarity(left: string, right: string) {
  const first = normalizePlaceName(left);
  const second = normalizePlaceName(right);

  if (!first || !second) {
    return 0;
  }

  if (first === second) {
    return 1;
  }

  const distance = getLevenshteinDistance(first, second);
  return 1 - distance / Math.max(first.length, second.length);
}

function getLevenshteinDistance(left: string, right: string) {
  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= right.length; j += 1) {
      const substitutionCost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + substitutionCost,
      );
    }

    for (let j = 0; j <= right.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[right.length];
}
