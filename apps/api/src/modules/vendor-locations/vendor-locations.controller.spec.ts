import { ForbiddenException } from '@nestjs/common';
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
