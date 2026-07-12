import { BadRequestException } from '@nestjs/common';
import { LocationContributionsService } from './location-contributions.service';
import { LocationGeoService } from '../location-geo/location-geo.service';

const categoryId = '507f1f77bcf86cd799439011';
const userId = '507f1f77bcf86cd799439012';

function createService() {
  const locationModel = {
    countDocuments: jest.fn().mockResolvedValue(0),
    create: jest
      .fn()
      .mockResolvedValue({ _id: 'location-id', status: 'SUBMITTED' }),
  };
  const categoryModel = {
    findOne: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: categoryId }),
    }),
  };
  const subCategoryModel = {
    countDocuments: jest.fn(),
  };
  const locationRequestModel = {
    create: jest
      .fn()
      .mockResolvedValue({ _id: 'request-id', status: 'PENDING' }),
  };
  const notificationModel = {
    create: jest.fn().mockResolvedValue({}),
  };
  const userModel = {
    findById: jest.fn().mockReturnValue({
      exec: jest
        .fn()
        .mockResolvedValue({ status: 'ACTIVE', trustLevel: 'STANDARD' }),
    }),
  };
  const duplicateDetectionService = {
    findPossibleDuplicates: jest.fn().mockResolvedValue([]),
  };

  const service = new LocationContributionsService(
    locationModel as never,
    categoryModel as never,
    subCategoryModel as never,
    locationRequestModel as never,
    notificationModel as never,
    userModel as never,
    duplicateDetectionService as never,
    new LocationGeoService(),
  );

  return { service, locationModel, locationRequestModel };
}

const validPayload = {
  name: 'Quán ăn thử nghiệm',
  description: 'Mô tả địa điểm dài hơn mười ký tự.',
  openingHours: '07:00-21:00',
  categoryId,
  tagIds: [],
  address: '1 Đường Ví Dụ, Đà Nẵng',
  latitude: 16.0544,
  longitude: 108.2022,
  deviceLatitude: 16.0544,
  deviceLongitude: 108.2022,
  accuracyMeters: 8,
  imageUrls: ['https://example.com/place.jpg'],
};

describe('LocationContributionsService', () => {
  it('rejects a contribution whose pin is more than 50m from the device', async () => {
    const { service } = createService();

    await expect(
      service.submitContribution(userId, {
        ...validPayload,
        deviceLatitude: 16.0644,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('persists opening hours on both the location and its approval request', async () => {
    const { service, locationModel, locationRequestModel } = createService();

    await service.submitContribution(userId, validPayload);

    expect(locationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ openingHours: '07:00-21:00' }),
    );
    expect(locationRequestModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        newData: expect.objectContaining({ openingHours: '07:00-21:00' }),
      }),
    );
  });
});
