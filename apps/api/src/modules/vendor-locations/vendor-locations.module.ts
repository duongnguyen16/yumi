import { Module } from '@nestjs/common';
import { AtStrategy } from 'src/common/guard/at.strategy';
import { VendorGuard } from 'src/common/guard/vendor.guard';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { SmsService } from '../auth/services/sms.service';
import { ImagesService } from '../images/images.service';
import { LocationGeoService } from '../location-geo/location-geo.service';
import { VendorLocationsController } from './vendor-locations.controller';
import { VendorLocationsService } from './vendor-locations.service';

@Module({
  controllers: [VendorLocationsController],
  imports: [SchemaModule],
  providers: [
    AtStrategy,
    VendorGuard,
    VendorLocationsService,
    ImagesService,
    SmsService,
    LocationGeoService,
  ],
})
export class VendorLocationsModule {}
