import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { extname } from 'path';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

@Injectable()
export class OwnershipImagesService {
  private supabaseClient?: SupabaseClient;

  constructor(private readonly configService: ConfigService) {}

  async upload(userId: string, file: Express.Multer.File) {
    const extension = this.validate(file);
    const path = `locations/${userId}/${randomUUID()}${extension}`;
    const bucket = this.getBucket();
    const { data, error } = await this.getSupabaseClient()
      .storage.from(bucket)
      .upload(path, file.buffer, {
        cacheControl: '3600',
        contentType: file.mimetype,
        upsert: false,
      });

    if (error || !data) {
      throw new InternalServerErrorException(
        `Không thể tải ảnh lên Supabase: ${error?.message ?? 'Unknown error'}`,
      );
    }

    const { data: publicData } = this.getSupabaseClient()
      .storage.from(bucket)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: publicData.publicUrl,
    };
  }

  async uploadMany(userId: string, files: Express.Multer.File[]) {
    files.forEach((file) => this.validate(file));
    return Promise.all(
      files.map(async (file) => (await this.upload(userId, file)).url),
    );
  }

  private validate(file: Express.Multer.File) {
    const extension = extname(file.originalname).toLowerCase();
    const isJpeg =
      ['image/jpeg', 'image/jpg'].includes(file.mimetype) &&
      ['.jpg', '.jpeg'].includes(extension);
    const isPng = file.mimetype === 'image/png' && extension === '.png';

    if (!isJpeg && !isPng) {
      throw new BadRequestException(
        'Định dạng tệp không hợp lệ. Chỉ hỗ trợ JPG, JPEG hoặc PNG',
      );
    }

    if (
      file.size < 1 ||
      file.size > MAX_IMAGE_SIZE ||
      file.buffer.length < 1 ||
      file.buffer.length > MAX_IMAGE_SIZE
    ) {
      throw new BadRequestException('Ảnh phải có dung lượng tối đa 5MB');
    }

    const signature = isPng ? PNG_SIGNATURE : JPEG_SIGNATURE;
    if (!file.buffer.subarray(0, signature.length).equals(signature)) {
      throw new BadRequestException('Nội dung tệp không phải ảnh hợp lệ');
    }

    return isPng ? '.png' : '.jpg';
  }

  private getSupabaseClient() {
    if (this.supabaseClient) {
      return this.supabaseClient;
    }

    const url =
      this.configService.get<string>('SUPABASE_URL') ??
      this.configService.get<string>('NEXT_PUBLIC_SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!url || !serviceRoleKey) {
      throw new InternalServerErrorException(
        'Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env',
      );
    }

    this.supabaseClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    return this.supabaseClient;
  }

  private getBucket() {
    return (
      this.configService.get<string>('SUPABASE_STORAGE_BUCKET') ?? 'images'
    );
  }
}
