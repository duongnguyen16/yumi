import { Module } from '@nestjs/common';
import { LocationController } from './location.controller';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { AtStrategy } from 'src/common/guard/at.strategy';
import { RtStrategy } from 'src/common/guard/rt.strategy';
import { LocationService } from './location.service';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { VendorGuard } from 'src/common/guard/vendor.guard';
import { ImagesService } from '../images/images.service';
import { TrustEngineService } from '../trust-engine/trust-engine.service';

@Module({
  controllers: [LocationController],
  imports: [SchemaModule],
  providers: [
    AtStrategy,
    RtStrategy,
    AdminGuard,
    LocationService,
    VendorGuard,
    ImagesService,
    TrustEngineService,
  ],
})
export class LocationModule {}
