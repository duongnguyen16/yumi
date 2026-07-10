import { Module } from '@nestjs/common';
import { AtStrategy } from 'src/common/guard/at.strategy';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { DuplicateDetectionService } from '../duplicate-detection/duplicate-detection.service';
import { LocationGeoService } from '../location-geo/location-geo.service';
import { LocationContributionsController } from './location-contributions.controller';
import { LocationContributionsService } from './location-contributions.service';

@Module({
  controllers: [LocationContributionsController],
  imports: [SchemaModule],
  providers: [
    AtStrategy,
    LocationContributionsService,
    DuplicateDetectionService,
    LocationGeoService,
  ],
})
export class LocationContributionsModule {}
