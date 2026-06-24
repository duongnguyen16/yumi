import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import AuthService from './auth.service';
import { SmsService } from './services/sms.service';
import { AtStrategy } from 'src/common/guard/at.strategy';
import { RtStrategy } from 'src/common/guard/rt.strategy';
import { UserSchema } from '../users/schemas/user.schema';
import { VendorsModule } from '../vendors/vendors.module';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    VendorsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AtStrategy, RtStrategy, SmsService],
})
export class AuthModule {}