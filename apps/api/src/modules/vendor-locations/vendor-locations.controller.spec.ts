import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { VendorLocationsController } from './vendor-locations.controller';

describe('VendorLocationsController', () => {
  it('giữ nguyên HTTP 403 khi service từ chối cập nhật', async () => {
    const service = {
      updateLocation: jest.fn().mockResolvedValue({
        success: false,
        statusCode: 403,
        message: 'Địa điểm đang trong thời gian hold',
      }),
    };
    const controller = new VendorLocationsController(service as never);

    await expect(
      controller.updateLocation(
        '667200000000000000000001',
        JSON.stringify({ name: 'Tên mới' }),
        [],
        { user: { userId: '66a000000000000000000001' } } as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

const request = {
  user: { userId: '66a000000000000000000001' },
} as never;
const jpegFile = {
  mimetype: 'image/jpeg',
  originalname: 'location.jpg',
  size: 1,
} as Express.Multer.File;

type ImageManagementController = VendorLocationsController & {
  addImages(
    locationId: string,
    files: Express.Multer.File[],
    request: typeof request,
  ): Promise<unknown>;
  setCoverImage(
    locationId: string,
    imageUrl: string,
    request: typeof request,
  ): Promise<unknown>;
};

describe('VendorLocationsController location image management', () => {
  it('returns HTTP 403 when the image service denies a non-owner upload', async () => {
    const controller = new VendorLocationsController({
      addImagesToLocation: jest.fn().mockResolvedValue({
        success: false,
        statusCode: 403,
        message: 'Bạn không có quyền quản lý ảnh của địa điểm này',
      }),
    } as never);

    await expect(
      (controller as ImageManagementController).addImages(
        'location-1',
        [jpegFile],
        request,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([
    ['no files', [] as Express.Multer.File[]],
    ['more than five files', Array.from({ length: 6 }, () => jpegFile)],
    [
      'an unsupported MIME type',
      [{ ...jpegFile, mimetype: 'image/gif' }] as Express.Multer.File[],
    ],
    [
      'a file larger than 10 MiB',
      [{ ...jpegFile, size: 10 * 1024 * 1024 + 1 }] as Express.Multer.File[],
    ],
  ])('rejects %s before uploading', async (_case, files) => {
    const addImagesToLocation = jest.fn();
    const controller = new VendorLocationsController({
      addImagesToLocation,
    } as never);

    await expect(
      (controller as ImageManagementController).addImages(
        'location-1',
        files,
        request,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(addImagesToLocation).not.toHaveBeenCalled();
  });

  it('passes valid images to the service and returns its success result', async () => {
    const addImagesToLocation = jest.fn().mockResolvedValue({
      success: true,
      message: 'Đã thêm ảnh vào địa điểm',
      images: [{ url: 'https://cdn/image.jpg', isCover: true }],
    });
    const controller = new VendorLocationsController({
      addImagesToLocation,
    } as never);

    await expect(
      (controller as ImageManagementController).addImages(
        'location-1',
        [jpegFile],
        request,
      ),
    ).resolves.toMatchObject({ success: true });
  });

  it('passes a valid cover request to the service and returns its success result', async () => {
    const setLocationCoverImage = jest.fn().mockResolvedValue({
      success: true,
      message: 'Đã đặt ảnh bìa',
      imageUrl: 'https://cdn/image.jpg',
    });
    const controller = new VendorLocationsController({
      setLocationCoverImage,
    } as never);

    await expect(
      (controller as ImageManagementController).setCoverImage(
        'location-1',
        'https://cdn/image.jpg',
        request,
      ),
    ).resolves.toMatchObject({
      success: true,
      imageUrl: 'https://cdn/image.jpg',
    });
  });

  it('rejects a cover request without an image URL', async () => {
    const controller = new VendorLocationsController({} as never);

    await expect(
      (controller as ImageManagementController).setCoverImage(
        'location-1',
        ' ',
        request,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
