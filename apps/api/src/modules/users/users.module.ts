import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserSchema } from 'src/common/schemas/user.schema';
import { OtpSchema } from 'src/common/schemas/otp.schema';
import { SmsService } from '../auth/services/sms.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Otp', schema: OtpSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, SmsService],
  exports: [MongooseModule],
})
export class UsersModule {}
