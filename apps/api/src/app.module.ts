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
      throttlers: [{ ttl: 60000, limit: 10 }],
    }),
    AuthModule,
    SchemaModule,
    LocationModule,
    TrustEngineModule,
    AdminCategoryModule,
    CategoriesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
