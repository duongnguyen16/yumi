import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  LocationStatus,
  ReviewStatus,
  TrustEventType,
  UserRole,
  UserStatus,
} from 'src/common/schemas/common.enums';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import { Review, ReviewDocument } from 'src/common/schemas/review.schema';
import { User, UserDocument } from 'src/common/schemas/user.schema';
import { TrustEngineService } from '../trust-engine/trust-engine.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

const REVIEW_ON_SITE_DISTANCE_METERS = 100;
const REVIEW_ON_SITE_ACCURACY_METERS = 100;
const MIN_REVIEW_COMMENT_LENGTH = 1;

type RatingSummary = {
  _id: Types.ObjectId;
  avgRating: number;
  reviewCount: number;
};

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(Location.name)
    private readonly locationModel: Model<LocationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly trustEngineService: TrustEngineService,
  ) {}

  async getLocationReviews(locationId: string) {
    const locationObjectId = this.toObjectId(
      locationId,
      'Địa điểm không hợp lệ',
    );
    const location = await this.locationModel
      .findOne({ _id: locationObjectId, status: LocationStatus.PUBLISHED })
      .lean()
      .exec();

    if (!location) {
      throw new NotFoundException('Không tìm thấy địa điểm');
    }

    const [rating] = await this.reviewModel.aggregate<RatingSummary>([
      {
        $match: {
          locationId: locationObjectId,
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
    ]);

    const reviews = await this.reviewModel
      .find({
        locationId: locationObjectId,
        status: ReviewStatus.PUBLISHED,
      })
      .sort({ createdAt: -1 })
      .populate('userId', 'fullName avatarUrl')
      .lean()
      .exec();

    const mappedReviews = reviews.map((review) => {
      const reviewWithTimestamps = review as typeof review & {
        createdAt?: Date;
        updatedAt?: Date;
      };

      return {
        id: String(review._id),
        rating: review.rating,
        comment: review.comment,
        images: review.images ?? [],
        status: review.status,
        reply: review.reply ?? null,
        createdAt: reviewWithTimestamps.createdAt,
        updatedAt: reviewWithTimestamps.updatedAt,
        user: this.mapUser(review.userId),
      };
    });

    return {
      success: true,
      summary: {
        avgRating: rating?.avgRating ? Number(rating.avgRating.toFixed(1)) : 0,
        reviewCount: rating?.reviewCount ?? 0,
      },
      reviews: mappedReviews,
    };
  }

  async createReview(userId: string, dto: CreateReviewDto) {
    const [user, location] = await Promise.all([
      this.userModel.findById(userId).exec(),
      this.locationModel
        .findOne({
          _id: this.toObjectId(dto.locationId, 'Địa điểm không hợp lệ'),
          status: LocationStatus.PUBLISHED,
        })
        .exec(),
    ]);

    if (!user || user.status === UserStatus.BANNED) {
      throw new ForbiddenException('Tài khoản không thể tạo đánh giá');
    }

    if (!location) {
      throw new NotFoundException('Không tìm thấy địa điểm');
    }

    if (
      user.role === UserRole.VENDOR &&
      location.ownerId &&
      location.ownerId.equals(user._id)
    ) {
      throw new ForbiddenException(
        'Vendor không được đánh giá địa điểm của mình',
      );
    }

    this.assertOnSiteProof(location, dto);
    const comment = this.normalizeComment(dto.comment);

    const existingReview = await this.reviewModel
      .findOne({
        locationId: location._id,
        userId: user._id,
      })
      .exec();

    if (existingReview) {
      throw new BadRequestException(
        'Bạn đã đánh giá địa điểm này. Hãy sửa đánh giá cũ thay vì tạo mới.',
      );
    }

    const review = await this.reviewModel.create({
      locationId: location._id,
      userId: user._id,
      rating: dto.rating,
      comment,
      images: this.toImages(dto.imageUrls),
      status: ReviewStatus.PUBLISHED,
    });

    await this.trustEngineService.recordEvent({
      userId: user._id,
      type: TrustEventType.LIVE_REVIEW,
      reason: 'Review published',
      refCollection: 'reviews',
      refId: review._id,
    });

    return {
      success: true,
      message: 'Tạo đánh giá thành công',
      review,
    };
  }

  async updateReview(userId: string, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.reviewModel
      .findById(this.toObjectId(reviewId, 'Đánh giá không hợp lệ'))
      .exec();

    if (!review || review.status !== ReviewStatus.PUBLISHED) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    if (
      !review.userId.equals(this.toObjectId(userId, 'Người dùng không hợp lệ'))
    ) {
      throw new ForbiddenException('Bạn chỉ được sửa đánh giá của mình');
    }

    if (dto.rating !== undefined) {
      review.rating = dto.rating;
    }
    if (dto.comment !== undefined) {
      review.comment = this.normalizeComment(dto.comment);
    }
    if (dto.imageUrls !== undefined) {
      review.images = this.toImages(dto.imageUrls);
    }

    await review.save();

    return {
      success: true,
      message: 'Cập nhật đánh giá thành công',
      review,
    };
  }

  async deleteReview(userId: string, reviewId: string) {
    const review = await this.reviewModel
      .findById(this.toObjectId(reviewId, 'Đánh giá không hợp lệ'))
      .exec();

    if (!review || review.status !== ReviewStatus.PUBLISHED) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    if (
      !review.userId.equals(this.toObjectId(userId, 'Người dùng không hợp lệ'))
    ) {
      throw new ForbiddenException('Bạn chỉ được xóa đánh giá của mình');
    }

    review.status = ReviewStatus.DELETED;
    await review.save();

    return {
      success: true,
      message: 'Xóa đánh giá thành công',
    };
  }

  private assertOnSiteProof(location: LocationDocument, dto: CreateReviewDto) {
    const hasGps =
      dto.deviceLatitude !== undefined &&
      dto.deviceLongitude !== undefined &&
      dto.accuracyMeters !== undefined;

    if (hasGps) {
      const distanceMeters = getDistanceMeters(
        dto.deviceLatitude as number,
        dto.deviceLongitude as number,
        location.geo.coordinates[1],
        location.geo.coordinates[0],
      );

      if (
        distanceMeters <= REVIEW_ON_SITE_DISTANCE_METERS &&
        (dto.accuracyMeters as number) <= REVIEW_ON_SITE_ACCURACY_METERS
      ) {
        return;
      }
    }

    // if ((dto.imageUrls ?? []).length > 0) {
    //   return;
    // }

    throw new BadRequestException('Bạn cần đứng tại địa điểm để gửi đánh giá');
  }

  private toImages(imageUrls?: string[]) {
    return (imageUrls ?? []).map((url, index) => ({
      url,
      isCover: index === 0,
      uploadedAt: new Date(),
    }));
  }

  private normalizeComment(comment: string) {
    const normalized = comment.trim();
    if (normalized.length < MIN_REVIEW_COMMENT_LENGTH) {
      throw new BadRequestException(
        'Nội dung đánh giá phải có ít nhất 20 ký tự',
      );
    }

    return normalized;
  }

  private mapUser(user: unknown) {
    if (!user || typeof user !== 'object') {
      return null;
    }

    const value = user as {
      _id?: Types.ObjectId;
      fullName?: string;
      avatarUrl?: string;
    };

    return {
      id: value._id ? String(value._id) : undefined,
      fullName: value.fullName ?? 'Người dùng',
      avatarUrl: value.avatarUrl ?? null,
    };
  }

  private toObjectId(value: string, message: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(message);
    }

    return new Types.ObjectId(value);
  }
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadius * c);
}
