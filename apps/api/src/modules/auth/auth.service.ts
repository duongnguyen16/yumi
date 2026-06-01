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
          message: 'Wrong email or password',
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
          message: 'Wrong email or password',
        };
      }
      const accessToken = this.jwtService.sign(
        { userId: user._id },
        {
          secret: this.configService.get('ACCESS_TOKEN_SECRET'),
          expiresIn: '1h',
        },
      );
      console.log(this.configService.get('REFRESH_TOKEN_SECRET'));
      const refreshToken = this.jwtService.sign(
        { userId: user._id },
        {
          secret: this.configService.get('REFRESH_TOKEN_SECRET'),
          expiresIn: '7d',
        },
      );
      return {
        success: true,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        message: 'An error occurred while logging in',
        success: false,
      };
    }
  }
  async logout(userId: string) {}
}
