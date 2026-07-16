import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  EditSuggestion,
  EditSuggestionDocument,
} from 'src/common/schemas/edit-suggestion.schema';
import {
  EditSuggestionStatus,
  RoutingTarget,
  UserRole,
  UserStatus,
} from 'src/common/schemas/common.enums';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import { User, UserDocument } from 'src/common/schemas/user.schema';

type PendingSuggestion = Partial<EditSuggestion> & { _id: Types.ObjectId };
type PendingLocation = Partial<Location> & { _id?: Types.ObjectId };

export type RoutedEditSuggestion = {
  suggestion: PendingSuggestion;
  location?: PendingLocation;
};

@Injectable()
export class EditSuggestionRoutingService {
  constructor(
    @InjectModel(EditSuggestion.name)
    private readonly editSuggestionModel: Model<EditSuggestionDocument>,
    @InjectModel(Location.name)
    private readonly locationModel: Model<LocationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  getRoutingTarget(location: Pick<Location, 'ownerId'>) {
    return location.ownerId ? RoutingTarget.VENDOR : RoutingTarget.ADMIN;
  }

  async getPendingSuggestionsForRoute(
    target: RoutingTarget,
    vendorId?: Types.ObjectId,
  ): Promise<RoutedEditSuggestion[]> {
    const pendingSuggestions = await this.editSuggestionModel
      .find({ status: EditSuggestionStatus.PENDING })
      .sort({ createdAt: -1 })
      .populate('userId', 'fullName email avatarUrl')
      .lean()
      .exec();

    const locationIds = [
      ...new Set(
        pendingSuggestions.map((suggestion) => String(suggestion.locationId)),
      ),
    ];

    const locations = await this.locationModel
      .find({ _id: { $in: locationIds.map((id) => new Types.ObjectId(id)) } })
      .lean()
      .exec();
    const locationById = new Map(
      locations.map((location) => [String(location._id), location]),
    );

    const routeUpdates: Promise<unknown>[] = [];
    const routed = pendingSuggestions.filter((suggestion) => {
      const location = locationById.get(String(suggestion.locationId));
      if (!location) {
        return false;
      }

      const currentRoute = this.getRoutingTarget(location);
      if (suggestion.routingTarget !== currentRoute) {
        routeUpdates.push(
          this.editSuggestionModel
            .updateOne(
              { _id: suggestion._id },
              { $set: { routingTarget: currentRoute } },
            )
            .exec(),
        );
      }

      if (currentRoute !== target) {
        return false;
      }

      if (
        target === RoutingTarget.VENDOR &&
        (!vendorId || !location.ownerId?.equals(vendorId))
      ) {
        return false;
      }

      return true;
    });

    if (routeUpdates.length) {
      await Promise.all(routeUpdates);
    }

    return routed.map((suggestion) => ({
      suggestion: { ...suggestion, routingTarget: target },
      location: locationById.get(String(suggestion.locationId)),
    }));
  }

  async loadReviewContext(
    reviewerId: Types.ObjectId,
    suggestionId: Types.ObjectId,
  ) {
    const [suggestion, reviewer] = await Promise.all([
      this.editSuggestionModel.findById(suggestionId).exec(),
      this.userModel.findById(reviewerId).select('role status').exec(),
    ]);

    if (!reviewer || reviewer.status === UserStatus.BANNED) {
      throw new ForbiddenException('Tài khoản không thể duyệt đề xuất');
    }

    if (!suggestion) {
      throw new NotFoundException('Không tìm thấy đề xuất chỉnh sửa');
    }

    if (suggestion.status !== EditSuggestionStatus.PENDING) {
      throw new BadRequestException('Đề xuất này đã được xử lý');
    }

    const location = await this.locationModel
      .findById(suggestion.locationId)
      .exec();

    if (!location) {
      throw new NotFoundException('Không tìm thấy địa điểm');
    }

    const currentRoute = this.getRoutingTarget(location);
    if (suggestion.routingTarget !== currentRoute) {
      suggestion.routingTarget = currentRoute;
      await suggestion.save();
    }

    return { suggestion, location, reviewer, currentRoute };
  }

  assertCanReview(
    reviewer: UserDocument,
    location: LocationDocument,
    currentRoute: RoutingTarget,
  ) {
    if (currentRoute === RoutingTarget.ADMIN) {
      if (reviewer.role !== UserRole.ADMIN) {
        throw new ForbiddenException(
          'Chỉ Admin được duyệt đề xuất của địa điểm chưa có chủ',
        );
      }
      return;
    }

    if (
      !location.ownerId ||
      !location.ownerId.equals(reviewer._id as Types.ObjectId)
    ) {
      throw new ForbiddenException(
        'Chỉ Vendor sở hữu địa điểm mới được duyệt đề xuất này',
      );
    }
  }
}
