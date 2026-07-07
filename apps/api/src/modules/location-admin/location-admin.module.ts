import { Module } from '@nestjs/common';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { AtStrategy } from 'src/common/guard/at.strategy';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { TrustEngineService } from '../trust-engine/trust-engine.service';
import { LocationAdminController } from './location-admin.controller';
import { LocationAdminService } from './location-admin.service';

@Module({
  controllers: [LocationAdminController],
  imports: [SchemaModule],
  providers: [AtStrategy, AdminGuard, LocationAdminService, TrustEngineService],
})
export class LocationAdminModule {}
