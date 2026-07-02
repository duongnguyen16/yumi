import { Module } from '@nestjs/common';
import { LocationController } from './location.controller';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { AtStrategy } from 'src/common/guard/at.strategy';
import { RtStrategy } from 'src/common/guard/rt.strategy';
import { LocationService } from './location.service';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { AiTagService } from './ai-tag.service';

@Module({
  controllers: [LocationController],
  imports: [SchemaModule],
  providers: [
    AtStrategy,
    RtStrategy,
    AdminGuard,
    AiTagService,
    LocationService,
  ],
})
export class LocationModule {}
