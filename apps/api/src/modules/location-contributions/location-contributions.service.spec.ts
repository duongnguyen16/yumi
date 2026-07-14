import { Types } from 'mongoose';
import { BadRequestException } from '@nestjs/common';
import {
  LocationStatus,
  TrustLevel,
  UserStatus,
} from 'src/common/schemas/common.enums';
import { LocationRequestStatus } from 'src/common/schemas/location-request';
import { SubmitLocationRequestDto } from './dto/submit-location-request.dto';
import { LocationContributionsService } from './location-contributions.service';

describe('LocationContributionsService', () => {
  const userId = '64b64c000000000000000001';
  const categoryId = '64b64c000000000000000002';
  const locationId = new Types.ObjectId('64b64c000000000000000003');
  const requestId = new Types.ObjectId('64b64c000000000000000004');
  const imageFiles = [
    {
      originalname: 'one.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('one'),
    },
    {
      originalname: 'two.jpg',
      mimetype: 'image/jpeg',
      size: 2048,
      buffer: Buffer.from('two'),
    },
  ] as Express.Multer.File[];
  const validDto = {
    name: 'Quán cà phê thử nghiệm',
    description: 'Địa điểm dùng để kiểm tra luồng đóng góp.',
    categoryId,
    tagIds: [],
    address: '1 Đường Test, Thành phố Hồ Chí Minh',
    latitude: 10.7769,
    longitude: 106.7009,
    deviceLatitude: 10.7769,
    deviceLongitude: 106.7009,
  } as SubmitLocationRequestDto;

  let locationModel: {
    countDocuments: jest.Mock;
    create: jest.Mock;
  };
  let categoryModel: { findOne: jest.Mock };
  let subCategoryModel: { countDocuments: jest.Mock };
  let locationRequestModel: { create: jest.Mock };
  let notificationModel: { create: jest.Mock };
  let userModel: { findById: jest.Mock };
  let duplicateDetectionService: { findPossibleDuplicates: jest.Mock };
  let locationGeoService: { validatePinDistance: jest.Mock };
  let imagesService: {
    validateImage: jest.Mock;
    uploadMultiMedia: jest.Mock;
  };
  let service: LocationContributionsService;

  beforeEach(() => {
    locationModel = {
      countDocuments: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({
        _id: locationId,
        status: LocationStatus.SUBMITTED,
      }),
    };
    categoryModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(categoryId),
          isActive: true,
        }),
      }),
    };
    subCategoryModel = { countDocuments: jest.fn() };
    locationRequestModel = {
      create: jest.fn().mockResolvedValue({
        _id: requestId,
        status: LocationRequestStatus.PENDING,
      }),
    };
    notificationModel = { create: jest.fn().mockResolvedValue({}) };
    userModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          status: UserStatus.ACTIVE,
          trustLevel: TrustLevel.TRUSTED,
        }),
      }),
    };
    duplicateDetectionService = {
      findPossibleDuplicates: jest.fn().mockResolvedValue([]),
    };
    locationGeoService = {
      validatePinDistance: jest.fn().mockReturnValue({
        success: true,
        withinRange: true,
        distanceMeters: 0,
      }),
    };
    imagesService = {
      validateImage: jest.fn().mockReturnValue({ success: true }),
      uploadMultiMedia: jest.fn().mockResolvedValue([
        { url: 'https://storage/one.jpg', path: 'one.jpg' },
        { url: 'https://storage/two.jpg', path: 'two.jpg' },
      ]),
    };

    const ServiceConstructor = LocationContributionsService as unknown as new (
      ...args: unknown[]
    ) => LocationContributionsService;
    service = new ServiceConstructor(
      locationModel,
      categoryModel,
      subCategoryModel,
      locationRequestModel,
      notificationModel,
      userModel,
      duplicateDetectionService,
      locationGeoService,
      imagesService,
    );
  });

  it('uploads contribution images on the backend and persists their URLs', async () => {
    const submitContribution = service.submitContribution.bind(service) as (
      userId: string,
      dto: SubmitLocationRequestDto,
      files: Express.Multer.File[],
    ) => Promise<unknown>;

    await submitContribution(userId, validDto, imageFiles);

    expect(imagesService.uploadMultiMedia).toHaveBeenCalledWith(
      'customer-contribution',
      imageFiles,
    );
    expect(locationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        imagesUrls: [
          expect.objectContaining({
            url: 'https://storage/one.jpg',
            isCover: true,
          }),
          expect.objectContaining({
            url: 'https://storage/two.jpg',
            isCover: false,
          }),
        ],
      }),
    );
    expect(locationRequestModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUrls: [
          'https://storage/one.jpg',
          'https://storage/two.jpg',
        ],
        newData: expect.objectContaining({
          imageUrls: [
            'https://storage/one.jpg',
            'https://storage/two.jpg',
          ],
        }),
      }),
    );
  });

  it('does not persist contribution records when image upload fails', async () => {
    imagesService.uploadMultiMedia.mockRejectedValueOnce(
      new Error('upload failed'),
    );
    const submitContribution = service.submitContribution.bind(service) as (
      userId: string,
      dto: SubmitLocationRequestDto,
      files: Express.Multer.File[],
    ) => Promise<unknown>;

    await expect(
      submitContribution(userId, validDto, imageFiles),
    ).rejects.toThrow('upload failed');
    expect(locationModel.create).not.toHaveBeenCalled();
    expect(locationRequestModel.create).not.toHaveBeenCalled();
  });

  it('rejects non-image contribution files before upload', async () => {
    const videoFiles = [
      {
        originalname: 'place.mp4',
        mimetype: 'video/mp4',
        size: 1024,
        buffer: Buffer.from('video'),
      },
    ] as Express.Multer.File[];
    imagesService.validateImage.mockImplementationOnce(() => {
      throw new BadRequestException('Chỉ hỗ trợ ảnh JPG, JPEG hoặc PNG');
    });
    const submitContribution = service.submitContribution.bind(service);

    await expect(
      submitContribution(userId, validDto, videoFiles),
    ).rejects.toThrow('Chỉ hỗ trợ ảnh JPG, JPEG hoặc PNG');
    expect(imagesService.uploadMultiMedia).not.toHaveBeenCalled();
    expect(locationModel.create).not.toHaveBeenCalled();
  });
});
