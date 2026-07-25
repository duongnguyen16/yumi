import { ConfigService } from '@nestjs/config';
import { ImagesService } from './images.service';

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

describe('ImagesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpload.mockImplementation((filePath: string) =>
      Promise.resolve({ data: { path: filePath }, error: null }),
    );
    mockGetPublicUrl.mockImplementation((filePath: string) => ({
      data: { publicUrl: `https://storage.example/${filePath}` },
    }));
    mockFrom.mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
      remove: jest.fn().mockResolvedValue({ error: null }),
    });
  });

  function createService() {
    const configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          SUPABASE_URL: 'https://project.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
          SUPABASE_STORAGE_BUCKET: 'images',
        };

        return values[key];
      }),
    } as unknown as ConfigService;

    return new ImagesService(configService);
  }

  it('uploads all files from one request into the same generated folder', async () => {
    const files = [
      {
        originalname: 'front.jpg',
        filename: 'front.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('front'),
      },
      {
        originalname: 'inside.jpg',
        filename: 'inside.jpg',
        mimetype: 'image/jpeg',
        size: 2048,
        buffer: Buffer.from('inside'),
      },
    ] as Express.Multer.File[];

    await createService().uploadMultiMedia('customer-contribution', files);

    const uploadedPaths = mockUpload.mock.calls.map(([filePath]) => filePath);
    const firstPathParts = uploadedPaths[0].split('/');
    const secondPathParts = uploadedPaths[1].split('/');

    expect(uploadedPaths).toHaveLength(2);
    expect(firstPathParts[0]).toBe('customer-contribution');
    expect(firstPathParts[1]).toBe(secondPathParts[1]);
    expect(firstPathParts[2]).toBe('image');
    expect(secondPathParts[2]).toBe('image');
  });

  it('uses unique object names inside the shared folder when original file names match', async () => {
    const files = [
      {
        originalname: 'photo.jpg',
        filename: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('first'),
      },
      {
        originalname: 'photo.jpg',
        filename: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: 2048,
        buffer: Buffer.from('second'),
      },
    ] as Express.Multer.File[];

    await createService().uploadMultiMedia('vendor-verification', files);

    const uploadedPaths = mockUpload.mock.calls.map(([filePath]) => filePath);
    const firstPathParts = uploadedPaths[0].split('/');
    const secondPathParts = uploadedPaths[1].split('/');
    const firstFileName = firstPathParts.at(-1);
    const secondFileName = secondPathParts.at(-1);

    expect(firstPathParts[1]).toBe(secondPathParts[1]);
    expect(firstFileName).not.toBe(secondFileName);
    expect(firstFileName).toMatch(/\.jpg$/);
    expect(secondFileName).toMatch(/\.jpg$/);
  });

  it('uploads product images to a generated location-product path', async () => {
    const result = await createService().uploadProductImage(
      'location-id',
      'product-id',
      {
        originalname: 'coffee.png',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from('image'),
      } as Express.Multer.File,
    );

    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^location-products\/location-id\/product-id\/.+\.png$/),
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'image/png', upsert: false }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        path: expect.stringMatching(/^location-products\/location-id\/product-id\//),
      }),
    );
  });

  it('rejects unsupported product image extensions and oversized product images', async () => {
    const service = createService();

    await expect(
      service.uploadProductImage('location-id', 'product-id', {
        originalname: 'coffee.gif',
        mimetype: 'image/gif',
        size: 1024,
        buffer: Buffer.from('image'),
      } as Express.Multer.File),
    ).rejects.toThrow('Định dạng tệp không hợp lệ');

    await expect(
      service.uploadProductImage('location-id', 'product-id', {
        originalname: 'coffee.jpg',
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024 + 1,
        buffer: Buffer.from('image'),
      } as Express.Multer.File),
    ).rejects.toThrow('Ảnh sản phẩm phải nhỏ hơn hoặc bằng 5MB');
  });

  it('accepts only location media owned by the expected user in the configured bucket', () => {
    const service = createService();

    expect(() =>
      service.assertOwnedLocationMediaUrl(
        'user-id',
        'https://project.supabase.co/storage/v1/object/public/images/locations/user-id/proof.jpg',
      ),
    ).not.toThrow();

    expect(() =>
      service.assertOwnedLocationMediaUrl(
        'user-id',
        'https://project.supabase.co/storage/v1/object/public/images/locations/other-user/proof.jpg',
      ),
    ).toThrow('không thuộc người dùng');
  });
});
