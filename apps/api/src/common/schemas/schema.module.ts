import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { Category, CategorySchema } from './category.schema';
import { SubCategory, SubCategorySchema } from './sub-category.schema';
import { Location, LocationSchema } from './location.schema';
import { Product, ProductSchema } from './product.schema';
import { Review, ReviewSchema } from './review.schema';
import { ClaimRequest, ClaimRequestSchema } from './claim-request.schema';
import { RequestAccess, RequestAccessSchema } from './request-access.schema';
import { EditSuggestion, EditSuggestionSchema } from './edit-suggestion.schema';
import { Dispute, DisputeSchema } from './dispute.schema';
import { Appeal, AppealSchema } from './appeal.schema';
import { Report, ReportSchema } from './report.schema';
import { Bookmark, BookmarkSchema } from './bookmark.schema';
import { Notification, NotificationSchema } from './notification.schema';
import { AuditLog, AuditLogSchema } from './audit-log.schema';
import { TrustEvent, TrustEventSchema } from './trust-event.schema';
import { LocationView, LocationViewSchema } from './location-view';
import { LocationRequest, LocationRequestSchema } from './location-request';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Category.name, schema: CategorySchema },
      { name: SubCategory.name, schema: SubCategorySchema },
      { name: Location.name, schema: LocationSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: ClaimRequest.name, schema: ClaimRequestSchema },
      { name: RequestAccess.name, schema: RequestAccessSchema },
      { name: EditSuggestion.name, schema: EditSuggestionSchema },
      { name: Dispute.name, schema: DisputeSchema },
      { name: Appeal.name, schema: AppealSchema },
      { name: Report.name, schema: ReportSchema },
      { name: Bookmark.name, schema: BookmarkSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: TrustEvent.name, schema: TrustEventSchema },
      { name: LocationView.name, schema: LocationViewSchema },
      { name: LocationRequest.name, schema: LocationRequestSchema }
    ]),
  ],
  exports: [MongooseModule],
})
export class SchemaModule {}
