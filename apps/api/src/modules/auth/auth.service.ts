import {
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
// import bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserDocument } from 'src/common/schemas/user.schema';
import { UserStatus } from 'src/common/schemas/common.enums';

@Injectable()
export default class AuthService {
  constructor(
    @InjectModel('User') private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}
  async login(email: string, password: string) {
    try {
      const user = await this.userModel.findOne({ email });
      if (!user) {
        throw new UnauthorizedException('Sai mật khẩu hoặc email');
      }
      // const isPasswordValid = await bcrypt.compare(
      //   password,
      //   user.password_hash,
      // );
      const isPasswordValid = password === user.passwordHash;
      if (!isPasswordValid) {
        throw new UnauthorizedException('Sai mật khẩu hoặc email');
      }
      if (user.status === UserStatus.BANNED) {
        throw new ForbiddenException('Tài khoản của bạn đã bị cấm truy cập');
      }
      const accessToken = this.jwtService.sign(
        { userId: user._id },
        {
          secret: this.configService.get('ACCESS_TOKEN_SECRET'),
          expiresIn: '1h',
        },
      );
      const refreshToken = this.jwtService.sign(
        { userId: user._id },
        {
          secret: this.configService.get('REFRESH_TOKEN_SECRET'),
          expiresIn: '7d',
        },
      );
      return {
        success: true,
        user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Login error:', error);
      throw new InternalServerErrorException('Đã xảy ra lỗi khi đăng nhập');
    }
  }
  async authMe(userId: string) {
    try {
      const user = await this.userModel.findById(userId, '-password_hash');
      if (!user) {
        throw new UnauthorizedException('Không tìm thấy người dùng');
      }
      return user;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('AuthMe error:', error);
      throw new InternalServerErrorException(
        'Đã xảy ra lỗi khi xác thực người dùng',
      );
    }
  }
}
