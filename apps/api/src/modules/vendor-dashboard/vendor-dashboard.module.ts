import { Module } from '@nestjs/common';
import { AtStrategy } from 'src/common/guard/at.strategy';
import { VendorGuard } from 'src/common/guard/vendor.guard';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { VendorDashboardController } from './vendor-dashboard.controller';
import { VendorDashboardService } from './vendor-dashboard.service';

@Module({
  imports: [SchemaModule],
  controllers: [VendorDashboardController],
  providers: [AtStrategy, VendorGuard, VendorDashboardService],
})
export class VendorDashboardModule {}
