import { Module } from '@nestjs/common';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [SchemaModule],         // SchemaModule đã đăng ký Notification model
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService], // export để các module khác inject được
})
export class NotificationsModule {}