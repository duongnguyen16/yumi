import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { LoginDTO } from './dto/login.dto';
import AuthService from './auth.service';

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
      throw new UnauthorizedException('Login failed');
    }
  }
}
