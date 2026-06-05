import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UserDocument } from './schemas/user.schema';
import { Model } from 'mongoose';
import bcrypt from 'bcryptjs';
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
