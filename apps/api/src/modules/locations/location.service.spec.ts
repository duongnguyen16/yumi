import { Types } from 'mongoose';
import {
  LocationRequestStatus,
  LocationRequestType,
} from 'src/common/schemas/location-request';
import {
  LocationSource,
  LocationStatus,
} from 'src/common/schemas/common.enums';
import { LocationService } from './location.service';
import { SubmitLocationRequestDto } from './dto/submit-location-request.dto';

describe('LocationService', () => {
  const makeService = () => {
    const locationModel = {
      create: jest.fn(),
    };
    const reviewModel = {};
    const locationViewModel = {};
    const categoryModel = {
      findOne: jest.fn(),
    };
    const subCategoryModel = {
      countDocuments: jest.fn(),
    };
    const locationRequestModel = {
      create: jest.fn(),
    };
    const notificationModel = {
      create: jest.fn(),
    };
    const userModel = {};
    const aiTagService = {};

    const service = new LocationService(
      locationModel as never,
      reviewModel as never,
      locationViewModel as never,
      categoryModel as never,
      subCategoryModel as never,
      locationRequestModel as never,
      notificationModel as never,
      userModel as never,
      aiTagService as never,
    );

    return {
      service,
      locationModel,
      categoryModel,
      subCategoryModel,
      locationRequestModel,
      notificationModel,
    };
  };

  it('creates a location request using the LocationRequest schema shape', async () => {
    const {
      service,
      locationModel,
      categoryModel,
      locationRequestModel,
      notificationModel,
    } = makeService();
    const userId = new Types.ObjectId().toHexString();
    const categoryId = new Types.ObjectId().toHexString();
    const locationId = new Types.ObjectId();
    const requestId = new Types.ObjectId();
    const imageUrls = ['https://example.com/place.jpg'];
    const dto: SubmitLocationRequestDto = {
      name: 'Quan com sinh vien',
      description: 'Quan com gan truong, gia phu hop sinh vien.',
      categoryId,
      tagIds: [],
      address: '123 Nguyen Van Cu',
      latitude: 10.762622,
      longitude: 106.660172,
      deviceLatitude: 10.762622,
      deviceLongitude: 106.660172,
      accuracyMeters: 5,
      imageUrls,
    };

    categoryModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(categoryId),
        isActive: true,
      }),
    });
    jest
      .spyOn(
        service as unknown as { findPossibleDuplicates: jest.Mock },
        'findPossibleDuplicates',
      )
      .mockResolvedValue([]);
    locationModel.create.mockResolvedValue({
      _id: locationId,
      status: LocationStatus.SUBMITTED,
    });
    locationRequestModel.create.mockResolvedValue({
      _id: requestId,
      status: LocationRequestStatus.PENDING,
    });
    notificationModel.create.mockResolvedValue({});

    await service.submitContribution(userId, dto);

    expect(locationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: dto.name,
        source: LocationSource.CUSTOMER,
        status: LocationStatus.SUBMITTED,
      }),
    );
    expect(locationRequestModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: LocationRequestType.CREATE,
        status: LocationRequestStatus.PENDING,
        locationId,
        oldData: null,
        newData: {
          name: dto.name,
          description: dto.description,
          categoryId: dto.categoryId,
          tagIds: [],
          latitude: dto.latitude,
          longitude: dto.longitude,
          address: dto.address,
          imageUrls,
        },
        changedFields: [
          'name',
          'description',
          'categoryId',
          'tagIds',
          'latitude',
          'longitude',
          'address',
          'imageUrls',
        ],
      }),
    );
    expect(locationRequestModel.create).toHaveBeenCalledWith(
      expect.not.objectContaining({
        submittedDataSnapshot: expect.anything(),
      }),
    );
  });

  it('stores reject reasons in the LocationRequest reviewNote field', async () => {
    const { service, locationModel, locationRequestModel, notificationModel } =
      makeService();
    const requestId = new Types.ObjectId().toHexString();
    const reviewerId = new Types.ObjectId().toHexString();
    const locationId = new Types.ObjectId();
    const submittedBy = new Types.ObjectId();
    const rejectReason = 'Dia diem khong dung vi tri.';
    const request = {
      _id: new Types.ObjectId(requestId),
      locationId,
      submittedBy,
      status: LocationRequestStatus.PENDING,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const location = {
      _id: locationId,
      status: LocationStatus.SUBMITTED,
      rejectionReason: undefined as string | undefined,
      save: jest.fn().mockResolvedValue(undefined),
    };

    locationRequestModel.findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(request),
    });
    locationModel.findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(location),
    });
    notificationModel.create.mockResolvedValue({});

    await service.rejectRequest(requestId, reviewerId, rejectReason);

    expect(request).toMatchObject({
      status: LocationRequestStatus.REJECTED,
      reviewNote: rejectReason,
    });
    expect(request).not.toHaveProperty('rejectReason');
    expect(request.save).toHaveBeenCalled();
    expect(location).toMatchObject({
      status: LocationStatus.REJECTED,
      rejectionReason: rejectReason,
    });
  });
});
