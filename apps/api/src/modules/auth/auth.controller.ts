import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { LoginDTO } from './dto/login.dto';
import AuthService from './auth.service';
import { AuthGuard } from '@nestjs/passport';
// import { NodeEventHandler } from 'rxjs/internal/observable/fromEvent';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('login')
  async login(@Body() body: LoginDTO) {
    try {
      const { email, password } = body;
      const result = await this.authService.login(email, password);
      if (!result.success) {
        if (result.statusCode === 403) {
          throw new ForbiddenException(result.message);
        } else if (result.statusCode === 500) {
          throw new InternalServerErrorException(result.message);
        } else {
          throw new UnauthorizedException(result.message);
        }
      }
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw new UnauthorizedException('Đã xảy ra lỗi khi đăng nhập');
    }
  }
  @Get('me')
  @UseGuards(AuthGuard('jwt-at'))
  async authMe(@Request() req: any) {
    console.log('Received request for /auth/me');
    try {
      const authenticatedReq = req as { user: { userId: string } };
      const userId = authenticatedReq.user?.userId;
      if (!userId) {
        throw new UnauthorizedException('Không tìm thấy người dùng');
      }
      return await this.authService.authMe(userId);
    } catch (error) {
      console.error('AuthMe error:', error);
      throw new UnauthorizedException('Đã xảy ra lỗi khi xác thực người dùng');
    }
  }
}
