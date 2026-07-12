import { BadRequestException } from '@nestjs/common';
import { VendorLocationsController } from './vendor-locations.controller';

const validLocationData = {
  name: 'Quán ăn thử nghiệm',
  description: 'Mô tả địa điểm dài hơn mười ký tự.',
  openingHours: '07:00-21:00',
  categoryId: '507f1f77bcf86cd799439011',
  address: '1 Đường Ví Dụ, Đà Nẵng',
  latitude: 16.0544,
  longitude: 108.2022,
};

const validRequestData = {
  systemCode: '123456',
  deviceLatitude: 16.0544,
  deviceLongitude: 108.2022,
  newData: validLocationData,
  isPotentialDuplicate: false,
  pinLatitude: 16.0544,
  pinLongitude: 108.2022,
  captureAt: '2026-07-12T00:00:00.000Z',
};

describe('VendorLocationsController registerLocation', () => {
  it('rejects invalid multipart JSON before calling the service', async () => {
    const service = { registerLocation: jest.fn() };
    const controller = new VendorLocationsController(service as never);

    await expect(
      controller.registerLocation(
        JSON.stringify(validRequestData),
        JSON.stringify({ categoryId: 'not-a-mongo-id' }),
        { user: { userId: '507f1f77bcf86cd799439012' } } as never,
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(service.registerLocation).not.toHaveBeenCalled();
  });

  it('preserves a service 400 instead of rewriting it as a 500', async () => {
    const service = {
      registerLocation: jest.fn().mockResolvedValue({
        success: false,
        statusCode: 400,
        message: 'Số điện thoại chưa được xác minh',
      }),
    };
    const controller = new VendorLocationsController(service as never);

    await expect(
      controller.registerLocation(
        JSON.stringify(validRequestData),
        JSON.stringify(validLocationData),
        { user: { userId: '507f1f77bcf86cd799439012' } } as never,
        {},
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
