import { AppealImagesController } from './images.controller';
import { ImagesService } from './images.service';

describe('Kiểm thử AppealImagesController', () => {
  function createController() {
    const imagesService = {
      validateImage: jest.fn().mockReturnValue({ success: true }),
      createUploadUrl: jest.fn().mockResolvedValue({
        success: true,
        upload: {
          publicUrl: 'https://example.com/evidence.jpg',
        },
      }),
    };
    const controller = new AppealImagesController(
      imagesService as ImagesService,
    );

    return {
      controller,
      imagesService,
    };
  }

  it('kiểm tra tệp bằng dịch vụ ảnh hiện có', () => {
    const { controller, imagesService } = createController();
    const dto = {
      fileName: 'evidence.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024,
    };

    controller.validateImage(dto);

    expect(imagesService.validateImage).toHaveBeenCalledWith(dto);
  });

  it('tạo đường dẫn tải lên cho người gửi kháng cáo', async () => {
    const { controller, imagesService } = createController();
    const dto = {
      fileName: 'evidence.jpg',
      mimeType: 'image/jpeg',
    };
    const request = {
      user: {
        userId: 'user-1',
      },
    };

    await controller.createUploadUrl(request as never, dto);

    expect(imagesService.createUploadUrl).toHaveBeenCalledWith('user-1', dto);
  });
});
