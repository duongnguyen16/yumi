import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  NOTIFICATION_PORT,
  NotificationStub,
} from 'src/common/contracts/notification.port';
import {
  Notification,
  NotificationSchema,
} from 'src/common/schemas/notification.schema';
import { User, UserSchema } from 'src/common/schemas/user.schema';
import { AuditModule } from 'src/common/services/audit.module';
import { TrustEngineModule } from '../trust-engine/trust-engine.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
    AuditModule,
    TrustEngineModule,
  ],
  controllers: [AdminUsersController],
  providers: [
    AdminUsersService,
    { provide: NOTIFICATION_PORT, useClass: NotificationStub },
  ],
})
export class AdminUsersModule {}
