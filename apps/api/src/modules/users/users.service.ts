// import { Injectable, NotFoundException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { promises as fs } from 'fs';
// import { extname, join } from 'path';
// import { Model } from 'mongoose';
// import { UpdateProfileDto } from './dto/update-profile.dto';
// import { UserDocument } from './schemas/user.schema';

// type AvatarUploadFile = {
//   buffer: Buffer;
//   mimetype: string;
//   originalname: string;
//   size: number;
// };

// @Injectable()
// export class UsersService {
//   constructor(
//     @InjectModel('User') private readonly userModel: Model<UserDocument>,
//   ) {}

//   async getProfile(userId: string) {
//     const user = await this.userModel.findById(userId);
//     if (!user) {
//       throw new NotFoundException('Khong tim thay nguoi dung');
//     }

//     return {
//       success: true,
//       user: this.toProfileResponse(user),
//     };
//   }

//   async updateProfile(
//     userId: string,
//     dto: UpdateProfileDto,
//     avatarFile?: AvatarUploadFile,
//   ) {
//     const user = await this.userModel.findById(userId);
//     if (!user) {
//       throw new NotFoundException('Khong tim thay nguoi dung');
//     }

//     if (dto.name !== undefined) {
//       user.name = dto.name.trim();
//     }

//     if (dto.phone !== undefined) {
//       user.phone = dto.phone;
//     }

//     if (avatarFile) {
//       user.avatar_url = await this.saveAvatarFile(
//         avatarFile,
//         user.avatar_url ?? undefined,
//       );
//     }

//     await user.save();

//     return {
//       success: true,
//       message: 'Cap nhat thong tin thanh cong',
//       user: this.toProfileResponse(user),
//     };
//   }

//   private toProfileResponse(user: UserDocument) {
//     return {
//       id: user.id,
//       display_name: user.name ?? null,
//       avatar_url: user.avatar_url ?? null,
//       phone: user.phone ?? null,
//       email: user.email,
//       role: user.role,
//       joined_at: user.created_at ?? null,
//     };
//   }

//   private async saveAvatarFile(
//     avatarFile: AvatarUploadFile,
//     currentAvatarUrl?: string,
//   ) {
//     const uploadDir = join(process.cwd(), 'uploads', 'avatars');
//     await fs.mkdir(uploadDir, { recursive: true });

//     const fileExtension = this.resolveExtension(avatarFile);
//     const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${fileExtension}`;
//     const filePath = join(uploadDir, fileName);

//     await fs.writeFile(filePath, avatarFile.buffer);

//     await this.removePreviousAvatar(currentAvatarUrl);

//     return `/api/uploads/avatars/${fileName}`;
//   }

//   private resolveExtension(avatarFile: AvatarUploadFile) {
//     if (avatarFile.mimetype === 'image/png') {
//       return '.png';
//     }

//     const originalExtension = extname(avatarFile.originalname).toLowerCase();
//     return originalExtension === '.jpeg' ? '.jpg' : '.jpg';
//   }

//   private async removePreviousAvatar(currentAvatarUrl?: string) {
//     if (!currentAvatarUrl?.startsWith('/api/uploads/avatars/')) {
//       return;
//     }

//     const fileName = currentAvatarUrl.replace('/api/uploads/avatars/', '');
//     const previousFilePath = join(
//       process.cwd(),
//       'uploads',
//       'avatars',
//       fileName,
//     );

//     try {
//       await fs.unlink(previousFilePath);
//     } catch (error) {
//       if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
//         throw error;
//       }
//     }
//   }
// }
