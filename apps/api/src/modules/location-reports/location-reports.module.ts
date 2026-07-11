import { Module } from '@nestjs/common';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { LocationReportsController } from './location-reports.controller';
import { LocationReportsService } from './location-reports.service';

@Module({
  imports: [SchemaModule],
  controllers: [LocationReportsController],
  providers: [LocationReportsService],
})
export class LocationReportsModule {}
