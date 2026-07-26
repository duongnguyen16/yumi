import { Module } from '@nestjs/common';
import {
  NOTIFICATION_PORT,
  NotificationStub,
} from 'src/common/contracts/notification.port';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { ImagesModule } from '../images/images.module';
import { OwnershipImagesModule } from '../ownership-images/ownership-images.module';
import { SmsService } from '../auth/services/sms.service';
import { OwnershipEvidenceService } from './ownership-evidence.service';
import { RequestAccessController } from './request-access.controller';
import { RequestAccessVerificationService } from './request-access-verification.service';
import { RequestAccessService } from './request-access.service';

@Module({
  imports: [SchemaModule, ImagesModule, OwnershipImagesModule],
  controllers: [RequestAccessController],
  providers: [
    RequestAccessService,
    RequestAccessVerificationService,
    OwnershipEvidenceService,
    SmsService,
    { provide: NOTIFICATION_PORT, useClass: NotificationStub },
  ],
})
export class RequestAccessModule {}
