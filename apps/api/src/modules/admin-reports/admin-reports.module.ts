import { Module } from '@nestjs/common';
import {
  NOTIFICATION_PORT,
  NotificationStub,
} from 'src/common/contracts/notification.port';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { TrustEngineModule } from '../trust-engine/trust-engine.module';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';

@Module({
  imports: [SchemaModule, TrustEngineModule],
  controllers: [AdminReportsController],
  providers: [
    AdminReportsService,
    { provide: NOTIFICATION_PORT, useClass: NotificationStub },
  ],
})
export class AdminReportsModule {}
