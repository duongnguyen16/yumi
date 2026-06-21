import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import AuthService from './auth.service';
import { AtStrategy } from 'src/common/guard/at.strategy';
import { RtStrategy } from 'src/common/guard/rt.strategy';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema } from './schemas/user.schema';
import { PasswordResetCodeSchema } from './schemas/password-reset-code.schema';
import { PasswordResetEmailService } from './password-reset-email.service';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'PasswordResetCode', schema: PasswordResetCodeSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordResetEmailService, AtStrategy, RtStrategy],
})
export class AuthModule {}
