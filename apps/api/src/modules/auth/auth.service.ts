import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserDocument } from '../users/schemas/user.schema';
import { Model } from 'mongoose';
// import bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

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
        return {
          success: false,
          message: 'Sai mật khẩu hoặc email',
          statusCode: 401,
        };
      }
      // const isPasswordValid = await bcrypt.compare(
      //   password,
      //   user.password_hash,
      // );
      const isPasswordValid = password === user.password_hash;
      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Sai mật khẩu hoặc email',
          statusCode: 401,
        };
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
      if (!accessToken || !refreshToken) {
        return {
          success: false,
          message: 'Đã xảy ra lỗi khi tạo phiên đăng nhập',
          statusCode: 500,
        };
      }
      if (user.status === 'banned') {
        return {
          success: false,
          message: 'Tài khoản của bạn đã bị cấm',
          statusCode: 403,
        };
      }
      return {
        success: true,
        user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        message: 'Đã xảy ra lỗi khi đăng nhập',
        success: false,
        statusCode: 500,
      };
    }
  }
  async authMe(userId: string) {
    try {
      const user = await this.userModel.findById(userId, '-password_hash');
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }
      return {
        success: true,
        user,
      };
    } catch (error) {
      console.error('AuthMe error:', error);
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi xác thực người dùng',
      };
    }
  }
}
