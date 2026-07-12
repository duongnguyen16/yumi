import { BadRequestException } from '@nestjs/common';
import { VendorLocationsService } from './vendor-locations.service';

const categoryId = '507f1f77bcf86cd799439011';
const userId = '507f1f77bcf86cd799439012';
const clientDuplicateId = '507f1f77bcf86cd799439013';
const detectedDuplicateId = '507f1f77bcf86cd799439014';

const requestData = {
  systemCode: '123456',
  deviceLatitude: 16.0544,
  deviceLongitude: 108.2022,
  newData: { name: 'Quán ăn thử nghiệm' },
  isPotentialDuplicate: false,
  suspectedDuplicateLocationIds: [clientDuplicateId],
  pinLatitude: 16.0544,
  pinLongitude: 108.2022,
  captureAt: '2026-07-12T00:00:00.000Z',
};

const locationData = {
  name: 'Quán ăn thử nghiệm',
  description: 'Mô tả địa điểm dài hơn mười ký tự.',
  openingHours: '07:00-21:00',
  categoryId,
  address: '1 Đường Ví Dụ, Đà Nẵng',
  latitude: 16.0544,
  longitude: 108.2022,
};

function createService(
  distanceMeters: number,
  duplicates = [] as Array<{ id: string }>,
) {
  const locationModel = {
    create: jest.fn().mockResolvedValue({ _id: 'location-id' }),
  };
  const locationRequestModel = { create: jest.fn().mockResolvedValue({}) };
  const userModel = {
    findById: jest
      .fn()
      .mockResolvedValue({ role: 'VENDOR', phoneVerified: true }),
  };
  const otpModel = {};
  const imagesService = {
    uploadMultiMedia: jest
      .fn()
      .mockResolvedValue([{ url: 'https://example.com/file' }]),
  };
  const smsService = {};
  const locationGeoService = {
    getDistanceMeters: jest.fn().mockReturnValue(distanceMeters),
  };
  const duplicateDetectionService = {
    findPossibleDuplicates: jest.fn().mockResolvedValue(duplicates),
  };
  const ServiceConstructor = VendorLocationsService as unknown as new (
    ...args: unknown[]
  ) => VendorLocationsService;
  const service = new ServiceConstructor(
    locationModel,
    locationRequestModel,
    userModel,
    otpModel,
    imagesService,
    smsService,
    locationGeoService,
    duplicateDetectionService,
  );

  return {
    service,
    locationModel,
    locationRequestModel,
    imagesService,
    duplicateDetectionService,
  };
}

describe('VendorLocationsService registerLocation', () => {
  it('rejects a pin more than 50m from the device before uploading evidence', async () => {
    const { service, imagesService } = createService(51);

    await expect(
      service.registerLocation(
        userId,
        requestData as never,
        locationData as never,
        {
          imageFiles: [{} as Express.Multer.File],
          videoFiles: [{} as Express.Multer.File],
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(imagesService.uploadMultiMedia).not.toHaveBeenCalled();
  });

  it('persists duplicate metadata calculated by the server', async () => {
    const { service, locationRequestModel, duplicateDetectionService } =
      createService(10, [{ id: detectedDuplicateId }]);

    await service.registerLocation(
      userId,
      requestData as never,
      locationData as never,
      {
        imageFiles: [{} as Express.Multer.File],
        videoFiles: [{} as Express.Multer.File],
      },
    );

    expect(
      duplicateDetectionService.findPossibleDuplicates,
    ).toHaveBeenCalledWith(
      locationData.name,
      locationData.latitude,
      locationData.longitude,
      locationData.categoryId,
    );
    expect(locationRequestModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        isPotentialDuplicate: true,
        suspectedDuplicateLocationIds: expect.arrayContaining([
          expect.objectContaining({ toString: expect.any(Function) }),
        ]),
      }),
    );
    const payload = locationRequestModel.create.mock.calls[0][0];
    expect(payload.suspectedDuplicateLocationIds[0].toString()).toBe(
      detectedDuplicateId,
    );
  });
});
