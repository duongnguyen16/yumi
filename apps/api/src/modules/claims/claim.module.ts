import { Module } from '@nestjs/common';
import {
  NOTIFICATION_PORT,
  NotificationStub,
} from 'src/common/contracts/notification.port';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { SmsService } from '../auth/services/sms.service';
import { ClaimController } from './claim.controller';
import { ClaimService } from './claim.service';
import { SiteCodeImageService } from './site-code-image.service';

@Module({
  imports: [SchemaModule],
  controllers: [ClaimController],
  providers: [
    ClaimService,
    SiteCodeImageService,
    SmsService,
    { provide: NOTIFICATION_PORT, useClass: NotificationStub },
  ],
})
export class ClaimModule {}
