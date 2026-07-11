import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { SchemaModule } from './common/schemas/schema.module';
import { LocationModule } from './modules/locations/location.module';
import { TrustEngineModule } from './modules/trust-engine/trust-engine.module';
import { AdminCategoryModule } from './modules/admin-category/admin-category.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { UsersModule } from './modules/users/users.module';
import { ImagesModule } from './modules/images/images.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
import { AuditModule } from './common/services/audit.module';
import { ProductsModule } from './modules/products/products.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { LocationContributionsModule } from './modules/location-contributions/location-contributions.module';
import { LocationAdminModule } from './modules/location-admin/location-admin.module';
import { VendorLocationsModule } from './modules/vendor-locations/vendor-locations.module';
import { LocationReportsModule } from './modules/location-reports/location-reports.module';
import { AdminReportsModule } from './modules/admin-reports/admin-reports.module';
import { AdminDashboardModule } from './modules/admin-dashboard/admin-dashboard.module';
import { VendorDashboardModule } from './modules/vendor-dashboard/vendor-dashboard.module';
import { EditSuggestionsModule } from './modules/edit-suggestions/edit-suggestions.module';
import { ClaimModule } from './modules/claims/claim.module';
import { AdminClaimModule } from './modules/admin-claims/admin-claim.module';
import { RequestAccessModule } from './modules/request-access/request-access.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URL'),
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 5000, limit: 10 }],
    }),
    AuthModule,
    SchemaModule,
    LocationModule,
    TrustEngineModule,
    AdminCategoryModule,
    CategoriesModule,
    UsersModule,
    ImagesModule,
    AuditModule,
    AdminUsersModule,
    ProductsModule,
    ReviewsModule,
    LocationContributionsModule,
    LocationAdminModule,
    VendorLocationsModule,
    LocationReportsModule,
    AdminReportsModule,
    AdminDashboardModule,
    VendorDashboardModule,
    EditSuggestionsModule,
    ClaimModule,
    AdminClaimModule,
    RequestAccessModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
