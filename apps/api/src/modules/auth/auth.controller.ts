import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { LoginDTO } from './dto/login.dto';
import AuthService from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('login')
  async login(@Body() body: LoginDTO) {
    try {
      const { email, password } = body;
      const result = await this.authService.login(email, password);
      if (!result.success) {
        throw new UnauthorizedException(result.message);
      }
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw new UnauthorizedException(error.message || 'Đăng nhập thất bại');
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
      throw new UnauthorizedException(
        error.message || 'Đã xảy ra lỗi khi xác thực người dùng',
      );
    }
  }
}
