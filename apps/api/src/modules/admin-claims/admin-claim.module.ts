import { Module } from '@nestjs/common';
import {
  NOTIFICATION_PORT,
  NotificationStub,
} from 'src/common/contracts/notification.port';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { TrustEngineModule } from '../trust-engine/trust-engine.module';
import { AdminClaimController } from './admin-claim.controller';
import { AdminClaimService } from './admin-claim.service';

@Module({
  imports: [SchemaModule, TrustEngineModule],
  controllers: [AdminClaimController],
  providers: [
    AdminClaimService,
    AdminGuard,
    { provide: NOTIFICATION_PORT, useClass: NotificationStub },
  ],
})
export class AdminClaimModule {}
