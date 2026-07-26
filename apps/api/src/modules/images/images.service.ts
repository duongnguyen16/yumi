import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { ValidateImageDto } from './dto/validate-image.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'video/mp4',
  'video/quicktime',
  'video/mpeg',
];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const PRODUCT_IMAGE_ROOT = 'location-products';

@Injectable()
export class ImagesService {
  private supabaseClient?: SupabaseClient;

  constructor(private readonly configService: ConfigService) {}

  validateImage(dto: ValidateImageDto) {
    const normalizedExtension = extname(dto.fileName).toLowerCase();

    if (!ALLOWED_MIME_TYPES.includes(dto.mimeType)) {
      throw new BadRequestException(
        'Chỉ hỗ trợ ảnh JPG, JPEG hoặc PNG cho địa điểm',
      );
    }

    if (!['.jpg', '.jpeg', '.png'].includes(normalizedExtension)) {
      throw new BadRequestException(
        'Định dạng tệp không hợp lệ. Chỉ hỗ trợ .jpg, .jpeg, .png',
      );
    }

    if (dto.fileSize > MAX_IMAGE_SIZE) {
      throw new BadRequestException('Mọi ảnh phải nhỏ hơn hoặc bằng 10MB');
    }

    return {
      success: true,
      message: 'Ảnh hợp lệ',
      constraints: {
        mimeTypes: ALLOWED_MIME_TYPES,
        maxFileSize: MAX_IMAGE_SIZE,
      },
    };
  }

  async createUploadUrl(userId: string, dto: CreateUploadUrlDto) {
    this.validateImage({
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      fileSize: 1,
    });

    const extension = dto.mimeType === 'image/png' ? '.png' : '.jpg';
    const objectPath = `locations/${userId}/${randomUUID()}${extension}`;
    const bucket = this.getBucket();
    const supabase = this.getSupabaseClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(objectPath);

    if (error || !data) {
      throw new InternalServerErrorException(
        `Không tạo được signed upload url: ${error?.message ?? 'Unknown error'}`,
      );
    }

    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(objectPath);

    return {
      success: true,
      upload: {
        bucket,
        path: data.path,
        token: data.token,
        signedUrl: data.signedUrl,
        publicUrl: publicData.publicUrl,
      },
    };
  }

  private getSupabaseClient() {
    if (this.supabaseClient) {
      return this.supabaseClient;
    }

    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !serviceRoleKey) {
      throw new InternalServerErrorException(
        'Thieu SUPABASE_URL hoac SUPABASE_SERVICE_ROLE_KEY trong .env',
      );
    }

    this.supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    return this.supabaseClient;
  }

  async updateMedia(folderPath: string, file: Express.Multer.File) {
    const supabase = this.getSupabaseClient();
    const bucket = this.getBucket();
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('File không hợp lệ');
    }
    const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
    const maxSize =
      fileType === 'image' ? 10 * 1024 * 1024 : 1000 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File ${fileType} phải nhỏ hơn hoặc bằng ${maxSize / (1024 * 1024)}MB`,
      );
    }
    const fileExtension = extname(file.originalname).toLowerCase();
    const objectName = `${randomUUID()}${fileExtension}`;
    const filePath = `${folderPath}/${fileType}/${objectName}`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });
    if (error) {
      throw new BadRequestException(`Không thể tải lên tệp: ${error.message}`);
    }
    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      url: publicData.publicUrl,
      path: data.path,
    };
  }

  async uploadMultiMedia(baseFolder: string, files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Không có tệp nào được tải lên');
    }
    const folderPath = `${baseFolder}/${randomUUID()}`;
    return Promise.all(files.map((file) => this.updateMedia(folderPath, file)));
  }

  async uploadProductImage(
    locationId: string,
    productId: string,
    file: Express.Multer.File,
  ) {
    this.validateProductImage(file);

    const extension =
      file.mimetype === 'image/png'
        ? '.png'
        : extname(file.originalname).toLowerCase() === '.jpeg'
          ? '.jpeg'
          : '.jpg';
    const objectPath = `${PRODUCT_IMAGE_ROOT}/${locationId}/${productId}/${randomUUID()}${extension}`;
    const supabase = this.getSupabaseClient();
    const bucket = this.getBucket();
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '31536000',
        upsert: false,
      });

    if (error || !data) {
      throw new BadRequestException(
        `Không thể tải ảnh sản phẩm lên: ${error?.message ?? 'Unknown error'}`,
      );
    }

    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      url: publicData.publicUrl,
      path: data.path,
    };
  }

  async deleteProductImage(path?: string | null) {
    if (!path) {
      return;
    }

    if (!path.startsWith(`${PRODUCT_IMAGE_ROOT}/`)) {
      throw new BadRequestException('Đường dẫn ảnh sản phẩm không hợp lệ');
    }

    const { error } = await this.getSupabaseClient()
      .storage.from(this.getBucket())
      .remove([path]);

    if (error) {
      throw new InternalServerErrorException(
        `Không thể xóa ảnh sản phẩm: ${error.message}`,
      );
    }
  }

  assertOwnedLocationMediaUrl(
    userId: string | { toString(): string },
    url: string,
  ) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('URL bằng chứng không hợp lệ');
    }

    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    if (!supabaseUrl) {
      throw new InternalServerErrorException('Thiếu SUPABASE_URL trong .env');
    }

    const expectedOrigin = new URL(supabaseUrl).origin;
    if (parsed.origin !== expectedOrigin) {
      throw new BadRequestException('URL bằng chứng không thuộc Supabase');
    }

    const bucket = this.getBucket();
    const expectedPrefix = `/storage/v1/object/public/${bucket}/locations/${userId.toString()}/`;
    if (!parsed.pathname.startsWith(expectedPrefix)) {
      throw new BadRequestException('URL bằng chứng không thuộc người dùng');
    }
  }

  private validateProductImage(file: Express.Multer.File) {
    const extension = extname(file.originalname).toLowerCase();

    if (
      !['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype) ||
      !['.jpg', '.jpeg', '.png'].includes(extension)
    ) {
      throw new BadRequestException(
        'Định dạng tệp không hợp lệ. Chỉ hỗ trợ .jpg, .jpeg, .png',
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('Ảnh sản phẩm phải nhỏ hơn hoặc bằng 10MB');
    }
  }

  private getBucket() {
    return (
      this.configService.get<string>('SUPABASE_STORAGE_BUCKET') ?? 'images'
    );
  }
}
