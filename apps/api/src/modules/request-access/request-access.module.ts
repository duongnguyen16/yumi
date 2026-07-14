import { Module } from '@nestjs/common';
import {
  NOTIFICATION_PORT,
  NotificationStub,
} from 'src/common/contracts/notification.port';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { RequestAccessController } from './request-access.controller';
import { RequestAccessService } from './request-access.service';

@Module({
  imports: [SchemaModule],
  controllers: [RequestAccessController],
  providers: [
    RequestAccessService,
    { provide: NOTIFICATION_PORT, useClass: NotificationStub },
  ],
})
export class RequestAccessModule {}
