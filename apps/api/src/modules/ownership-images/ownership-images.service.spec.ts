import { ConfigService } from '@nestjs/config';
import { OwnershipImagesService } from './ownership-images.service';

const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: mockFrom,
    },
  })),
}));

describe('Kiểm thử OwnershipImagesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpload.mockImplementation((path: string) =>
      Promise.resolve({ data: { path }, error: null }),
    );
    mockGetPublicUrl.mockImplementation((path: string) => ({
      data: { publicUrl: `https://storage.example/${path}` },
    }));
    mockFrom.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });
  });

  function createService() {
    const values: Record<string, string> = {
      NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      SUPABASE_STORAGE_BUCKET: 'media',
    };
    const configService = {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;

    return new OwnershipImagesService(configService);
  }

  it('kiểm tra nội dung ảnh trước khi upload vào thư mục của người dùng', async () => {
    const file = {
      originalname: 'proof.jpeg',
      mimetype: 'image/jpeg',
      size: 4,
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
    } as Express.Multer.File;

    const result = await createService().upload('user-1', file);

    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^locations\/user-1\/.+\.jpg$/),
      file.buffer,
      {
        cacheControl: '3600',
        contentType: 'image/jpeg',
        upsert: false,
      },
    );
    expect(result).toEqual({
      success: true,
      url: expect.stringMatching(
        /^https:\/\/storage\.example\/locations\/user-1\/.+\.jpg$/,
      ),
    });
  });

  it('từ chối dữ liệu giả ảnh trước khi gọi Supabase', async () => {
    const file = {
      originalname: 'proof.jpg',
      mimetype: 'image/jpeg',
      size: 8,
      buffer: Buffer.from('not-jpeg'),
    } as Express.Multer.File;

    await expect(createService().upload('user-1', file)).rejects.toThrow(
      'Nội dung tệp không phải ảnh hợp lệ',
    );
    expect(mockUpload).not.toHaveBeenCalled();
  });
});
