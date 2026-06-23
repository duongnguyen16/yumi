import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Request,
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
    const { email, password } = body;
    const result = await this.authService.login(email, password);
    return result;
  }
  @Get('me')
  @UseGuards(AuthGuard('jwt-at'))
  async authMe(@Request() req: any) {
    console.log('Received request for /auth/me');
    const authenticatedReq = req as { user: { userId: string } };
    const userId = authenticatedReq.user?.userId;
    if (!userId) {
      throw new BadRequestException('Không tìm thấy người dùng');
    }
    return await this.authService.authMe(userId);
  }
}
