import { Module } from '@nestjs/common';
import {
  NOTIFICATION_PORT,
  NotificationStub,
} from 'src/common/contracts/notification.port';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { AuditModule } from 'src/common/services/audit.module';
import { TrustEngineModule } from 'src/modules/trust-engine/trust-engine.module';
import {
  AdminAppealController,
  AppealController,
} from './appeal.controller';
import { AppealRestoreService } from './appeal-restore.service';
import { AppealSourceService } from './appeal-source.service';
import { AppealService } from './appeal.service';

@Module({
  imports: [SchemaModule, AuditModule, TrustEngineModule],
  controllers: [AppealController, AdminAppealController],
  providers: [
    AppealService,
    AppealSourceService,
    AppealRestoreService,
    AdminGuard,
    { provide: NOTIFICATION_PORT, useClass: NotificationStub },
  ],
})
export class AppealModule {}
