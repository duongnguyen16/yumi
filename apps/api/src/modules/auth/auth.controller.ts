import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Post,
  Req,
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
import { RegisterDTO } from './dto/register.dto';
import { RequestVendorOtpDTO } from './dto/request-vendor-otp.dto';
import { ResetPasswordDTO } from './dto/reset-password.dto';
import { VerifyVendorOtpDTO } from './dto/verify-vendor-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDTO) {
    const result = await this.authService.login(body.email, body.password);
    if (!result.success) {
      if (result.statusCode === 403)
        throw new ForbiddenException(result.message);
      if (result.statusCode === 500)
        throw new InternalServerErrorException(result.message);
      throw new UnauthorizedException(result.message);
    }
    return result;
  }

  @Post('register')
  async register(@Body() body: RegisterDTO) {
    const result = await this.authService.register(body);
    if (!result.success) {
      if (result.statusCode === 409)
        throw new ConflictException(result.message);
      throw new InternalServerErrorException(result.message);
    }
    return result;
  }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 15 * 60 * 1000 } })
  async refresh(@Body() body: RefreshTokenDTO) {
    const result = await this.authService.refresh(body.refreshToken);
    if (!result.success) {
      if (result.statusCode === 403)
        throw new ForbiddenException(result.message);
      if (result.statusCode === 500)
        throw new InternalServerErrorException(result.message);
      throw new UnauthorizedException(result.message);
    }
    return result;
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

  @Post('register/vendor/request-otp')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async requestVendorOtp(@Body() body: RequestVendorOtpDTO) {
    const result = await this.authService.requestVendorOtp(body);
    if (!result.success) {
      if (result.statusCode === 409)
        throw new ConflictException(result.message);
      throw new InternalServerErrorException(result.message);
    }
    return result;
  }

  @Post('register/vendor/verify-otp')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async verifyVendorOtp(@Body() body: VerifyVendorOtpDTO) {
    const result = await this.authService.verifyVendorOtp(body);
    if (!result.success) {
      if (result.statusCode === 404)
        throw new NotFoundException(result.message);
      if (result.statusCode === 409)
        throw new ConflictException(result.message);
      if (result.statusCode === 429) {
        throw new HttpException(
          result.message ?? 'Quá nhiều lần thử',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (result.statusCode === 400)
        throw new BadRequestException(result.message);
      throw new InternalServerErrorException(result.message);
    }
    return result;
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt-at'))
  async authMe(@Request() req: { user?: { userId?: string } }) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy người dùng');
    }
    const result = await this.authService.authMe(userId);
    if (!result.success) {
      throw new UnauthorizedException(result.message);
    }
    return result;
  }
}
