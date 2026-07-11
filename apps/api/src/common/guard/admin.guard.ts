import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request } from 'express';
import { UserRole } from 'src/common/schemas/common.enums';
import { UserDocument } from 'src/common/schemas/user.schema';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(@InjectModel('User') private userModel: Model<UserDocument>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = (request as unknown as { user?: { userId?: string } }).user
      ?.userId;

    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy thông tin xác thực');
    }

    const user = await this.userModel.findById(userId).select('-passwordHash');
    if (!user) {
      throw new UnauthorizedException('Không tìm thấy người dùng');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập trang quản trị',
      );
    }

    return true;
  }
}
