import { Module } from '@nestjs/common';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { AtStrategy } from 'src/common/guard/at.strategy';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';

@Module({
  imports: [SchemaModule],
  controllers: [AdminDashboardController],
  providers: [AtStrategy, AdminGuard, AdminDashboardService],
})
export class AdminDashboardModule {}
