import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import AuthService from './auth.service';
import { AtStrategy } from 'src/common/guard/at.strategy';
import { RtStrategy } from 'src/common/guard/rt.strategy';
import { SchemaModule } from 'src/common/schemas/schema.module';

@Module({
  imports: [JwtModule.register({}), SchemaModule],
  controllers: [AuthController],
  providers: [AuthService, AtStrategy, RtStrategy],
})
export class AuthModule {}
