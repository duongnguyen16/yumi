import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AppealAccessStrategy } from 'src/common/guard/appeal-access.strategy';
import { AtStrategy } from 'src/common/guard/at.strategy';
import { RtStrategy } from 'src/common/guard/rt.strategy';
import { UserSchema } from 'src/common/schemas/user.schema';
import { VendorsModule } from '../vendors/vendors.module';
import { AuthController } from './auth.controller';
import AuthService from './auth.service';
import { PasswordResetEmailService } from './password-reset-email.service';
import { PasswordResetCodeSchema } from './schemas/password-reset-code.schema';
import { SmsService } from './services/sms.service';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'PasswordResetCode', schema: PasswordResetCodeSchema },
    ]),
    VendorsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AppealAccessStrategy,
    AtStrategy,
    RtStrategy,
    SmsService,
    PasswordResetEmailService,
  ],
})
export class AuthModule {}
