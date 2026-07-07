import { Module } from '@nestjs/common';
import { LocationController } from './location.controller';
import { AtStrategy } from 'src/common/guard/at.strategy';
import { RtStrategy } from 'src/common/guard/rt.strategy';
import { LocationService } from './location.service';
import { SchemaModule } from 'src/common/schemas/schema.module';

@Module({
  controllers: [LocationController],
  imports: [SchemaModule],
  providers: [AtStrategy, RtStrategy, LocationService],
})
export class LocationModule {}
