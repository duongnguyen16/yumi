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
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { LoginDTO } from './dto/login.dto';
import { RegisterDTO } from './dto/register.dto';
import { RequestVendorOtpDTO } from './dto/request-vendor-otp.dto';
import { VerifyVendorOtpDTO } from './dto/verify-vendor-otp.dto';
import AuthService from './auth.service';
import { RefreshTokenDTO } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDTO) {
    const { email, password } = body;
    const result = await this.authService.login(email, password);
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

  @Post('register/vendor/request-otp')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // tối đa 3 lần gửi OTP / phút / IP, tránh spam SMS
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
  async authMe(@Request() req: any) {
    try {
      const authenticatedReq = req as { user: { userId: string } };
      const userId = authenticatedReq.user?.userId;
      if (!userId) throw new UnauthorizedException('Không tìm thấy người dùng');
      return await this.authService.authMe(userId);
    } catch (error) {
      console.error('AuthMe error:', error);
      throw new UnauthorizedException('Đã xảy ra lỗi khi xác thực người dùng');
    }
  }
}
