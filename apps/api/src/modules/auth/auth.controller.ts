import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import AuthService from './auth.service';
import { ForgotPasswordDTO } from './dto/forgot-password.dto';
import { LoginDTO } from './dto/login.dto';
import { RefreshTokenDTO } from './dto/refresh-token.dto';
import { ResetPasswordDTO } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDTO) {
    return this.authService.login(body.email, body.password);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 15 * 60 * 1000 } })
  async refresh(@Body() body: RefreshTokenDTO) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 15 * 60 * 1000 } })
  async forgotPassword(@Body() body: ForgotPasswordDTO) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  async resetPassword(@Body() body: ResetPasswordDTO) {
    return this.authService.resetPassword(
      body.email,
      body.code,
      body.newPassword,
    );
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt-at'))
  async authMe(@Request() req: { user?: { userId?: string } }) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy người dùng');
    }
    return this.authService.authMe(userId);
  }
}
