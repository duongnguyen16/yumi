import { Module } from '@nestjs/common';
import {
  NOTIFICATION_PORT,
  NotificationStub,
} from 'src/common/contracts/notification.port';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { SmsService } from '../auth/services/sms.service';
import { OwnershipImagesModule } from '../ownership-images/ownership-images.module';
import { ClaimController } from './claim.controller';
import { ClaimService } from './claim.service';

@Module({
  imports: [SchemaModule, OwnershipImagesModule],
  controllers: [ClaimController],
  providers: [
    ClaimService,
    SmsService,
    { provide: NOTIFICATION_PORT, useClass: NotificationStub },
  ],
})
export class ClaimModule {}
