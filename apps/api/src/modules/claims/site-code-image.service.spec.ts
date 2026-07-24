import { SiteCodeImageService } from './site-code-image.service';

describe('Kiểm thử SiteCodeImageService', () => {
  it('đối chiếu site code bất kể khoảng trắng và dấu gạch trong OCR', async () => {
    const scheduler = {
      addJob: jest.fn().mockResolvedValue({
        data: { text: 'Bien hieu CLG ABC123 tai dia diem' },
      }),
    };
    const Service = SiteCodeImageService as unknown as new (
      config: unknown,
    ) => SiteCodeImageService;
    const service = new Service({
      get: jest.fn().mockReturnValue('https://example.com'),
    });
    Object.assign(service, {
      schedulerPromise: Promise.resolve(scheduler),
    });

    const result = await service.contains(
      'https://example.com/proof.jpg',
      'CLG-ABC123',
    );

    expect(result).toBe(true);
    expect(scheduler.addJob).toHaveBeenCalledWith(
      'recognize',
      'https://example.com/proof.jpg',
    );
  });

  it('không tải ảnh từ host ngoài kho lưu trữ đã cấu hình', async () => {
    const scheduler = {
      addJob: jest.fn().mockResolvedValue({
        data: { text: 'CLG-ABC123' },
      }),
    };
    const Service = SiteCodeImageService as unknown as new (
      config: unknown,
    ) => SiteCodeImageService;
    const service = new Service({
      get: jest.fn().mockReturnValue('https://project.supabase.co'),
    });
    Object.assign(service, {
      schedulerPromise: Promise.resolve(scheduler),
    });

    const result = await service.contains(
      'http://127.0.0.1/internal.jpg',
      'CLG-ABC123',
    );

    expect(result).toBe(false);
    expect(scheduler.addJob).not.toHaveBeenCalled();
  });
});
