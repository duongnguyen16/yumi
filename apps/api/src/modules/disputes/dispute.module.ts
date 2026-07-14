import { Module } from '@nestjs/common';
import {
  NOTIFICATION_PORT,
  NotificationStub,
} from 'src/common/contracts/notification.port';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { AuditModule } from 'src/common/services/audit.module';
import {
  AdminDisputeController,
  DisputeController,
} from './dispute.controller';
import { DisputeService } from './dispute.service';

@Module({
  imports: [SchemaModule, AuditModule],
  controllers: [DisputeController, AdminDisputeController],
  providers: [
    DisputeService,
    AdminGuard,
    { provide: NOTIFICATION_PORT, useClass: NotificationStub },
  ],
})
export class DisputeModule {}
