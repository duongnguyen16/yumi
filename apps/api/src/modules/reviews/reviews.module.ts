import { Module } from '@nestjs/common';
import { AtStrategy } from 'src/common/guard/at.strategy';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { TrustEngineService } from '../trust-engine/trust-engine.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [ReviewsController],
  imports: [SchemaModule],
  providers: [AtStrategy, ReviewsService, TrustEngineService],
})
export class ReviewsModule {}
