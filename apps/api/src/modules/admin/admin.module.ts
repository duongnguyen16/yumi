import { Module } from '@nestjs/common';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { TrustEngineModule } from '../trust-engine/trust-engine.module';
import { AdminLocationController } from './admin-location.controller';
import { AdminLocationService } from './admin-location.service';
import { AdminGuard } from 'src/common/guard/admin.guard';
import {
  NOTIFICATION_PORT,
  NotificationStub,
} from 'src/common/contracts/notification.port';

@Module({
  imports: [SchemaModule, TrustEngineModule],
  controllers: [AdminLocationController],
  providers: [
    AdminLocationService,
    AdminGuard,
    { provide: NOTIFICATION_PORT, useClass: NotificationStub },
  ],
})
export class AdminModule {}
