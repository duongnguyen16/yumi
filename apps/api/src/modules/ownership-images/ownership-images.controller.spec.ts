import { OwnershipImagesController } from './ownership-images.controller';
import { OwnershipImagesService } from './ownership-images.service';

describe('Kiểm thử OwnershipImagesController', () => {
  function createController() {
    const service = {
      upload: jest.fn().mockResolvedValue({
        success: true,
        url: 'https://example.com/proof.jpg',
      }),
    };

    return {
      controller: new OwnershipImagesController(
        service as unknown as OwnershipImagesService,
      ),
      service,
    };
  }

  it.each(['upload', 'uploadAppeal'] as const)(
    'chuyển file từ endpoint %s sang service dùng chung',
    async (method) => {
      const { controller, service } = createController();
      const request = { user: { userId: 'user-1' } };
      const file = {
        originalname: 'proof.jpg',
        mimetype: 'image/jpeg',
        size: 4,
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
      } as Express.Multer.File;

      await controller[method](request as never, file);

      expect(service.upload).toHaveBeenCalledWith('user-1', file);
    },
  );
});
