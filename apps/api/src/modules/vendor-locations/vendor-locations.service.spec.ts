import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { VendorLocationsService } from './vendor-locations.service';
import { LocationStatus } from 'src/common/schemas/common.enums';
import {
  LocationRequestStatus,
  LocationRequestType,
} from 'src/common/schemas/location-request';

function createService(location: Record<string, unknown>) {
  const userModel = {
    findById: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
  };
  const locationModel = {
    findById: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(location),
    }),
  };
  const session = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    abortTransaction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn().mockResolvedValue(undefined),
  };
  const connection = {
    startSession: jest.fn().mockResolvedValue(session),
  };
  const service = new VendorLocationsService(
    locationModel as never,
    { create: jest.fn() } as never,
    userModel as never,
    { findOne: jest.fn() } as never,
    { uploadMultiMedia: jest.fn().mockResolvedValue([]) } as never,
    {} as never,
    { getDistanceMeters: jest.fn() } as never,
    {} as never,
    {} as never,
    connection as never,
  );
  return { service, locationModel };
}

describe('VendorLocationsService ownership hold', () => {
  it('cho phép cập nhật giờ mở cửa trong thời gian hold', async () => {
    const userId = new Types.ObjectId();
    const location = {
      ownerId: userId,
      holdExpiresAt: new Date(Date.now() + 60_000),
      toObject: jest.fn().mockReturnValue({
        holdExpiresAt: new Date(Date.now() + 60_000),
      }),
      set: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const { service } = createService(location);

    const result = await service.updateLocation(
      String(new Types.ObjectId()),
      { openingHours: '08:00 - 22:00' },
      String(userId),
      [],
    );

    expect(result).toMatchObject({
      success: true,
      requiresReapproval: false,
      message: 'Cập nhật địa điểm thành công',
    });
    expect(location.set).toHaveBeenCalledWith({
      openingHours: '08:00 - 22:00',
    });
    expect(location.save).toHaveBeenCalledTimes(1);
  });

  it('vẫn chặn thay đổi core info trong thời gian hold', async () => {
    const userId = new Types.ObjectId();
    const location = {
      ownerId: userId,
      holdExpiresAt: new Date(Date.now() + 60_000),
      toObject: jest.fn().mockReturnValue({
        holdExpiresAt: new Date(Date.now() + 60_000),
      }),
      set: jest.fn(),
      save: jest.fn(),
    };
    const { service } = createService(location);

    const result = await service.updateLocation(
      String(new Types.ObjectId()),
      { name: 'Tên mới' },
      String(userId),
      [],
    );

    expect(result).toMatchObject({ success: false, statusCode: 403 });
    expect(location.set).not.toHaveBeenCalled();
    expect(location.save).not.toHaveBeenCalled();
  });
});

function createUpdateService({
  pendingUpdate = null,
  createError,
}: {
  pendingUpdate?: { _id: Types.ObjectId } | null;
  createError?: unknown;
} = {}) {
  const ownerId = new Types.ObjectId();
  const locationId = new Types.ObjectId();
  const location = {
    _id: locationId,
    ownerId,
    status: LocationStatus.PUBLISHED,
    name: 'Tên cũ',
    address: 'Địa chỉ cũ',
    geo: { type: 'Point', coordinates: [105.5, 21] },
    categoryId: new Types.ObjectId(),
    toObject: jest.fn().mockReturnValue({}),
    set: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const locationRequestModel = {
    findOne: jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(pendingUpdate),
      }),
    }),
    create: jest.fn().mockImplementation(() =>
      createError
        ? Promise.reject(createError)
        : Promise.resolve([{ _id: new Types.ObjectId() }]),
    ),
  };
  const imagesService = {
    uploadMultiMedia: jest
      .fn()
      .mockResolvedValue([{ url: 'https://storage/proof.jpg' }]),
  };
  const session = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    abortTransaction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn().mockResolvedValue(undefined),
  };
  const service = new VendorLocationsService(
    {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(location),
      }),
    } as never,
    locationRequestModel as never,
    {
      findById: jest.fn().mockResolvedValue({ _id: ownerId }),
    } as never,
    { findOne: jest.fn() } as never,
    {} as never,
    imagesService as never,
    {} as never,
    {
      getDistanceMeters: jest.fn().mockReturnValue(0),
    } as never,
    {
      findPossibleDuplicates: jest.fn().mockResolvedValue([]),
    } as never,
    {
      startSession: jest.fn().mockResolvedValue(session),
    } as never,
    {} as never,
  );

  return {
    service,
    ownerId,
    locationId,
    location,
    locationRequestModel,
    imagesService,
    session,
  };
}

describe('VendorLocationsService sensitive update conflicts', () => {
  const imageFile = {
    mimetype: 'image/jpeg',
    originalname: 'proof.jpg',
    size: 1,
  } as Express.Multer.File;

  it('trả 409 trước khi upload nếu đã có yêu cầu cập nhật nhạy cảm đang chờ', async () => {
    const fixture = createUpdateService({
      pendingUpdate: { _id: new Types.ObjectId() },
    });

    const result = await fixture.service.updateLocation(
      String(fixture.locationId),
      { name: 'Tên mới' },
      String(fixture.ownerId),
      [imageFile],
    );

    expect(result).toMatchObject({ success: false, statusCode: 409 });
    expect(fixture.locationRequestModel.findOne).toHaveBeenCalledWith({
      locationId: fixture.locationId,
      type: LocationRequestType.UPDATE,
      status: {
        $in: [
          LocationRequestStatus.PENDING,
          LocationRequestStatus.PENDING_RE_APPROVAL,
        ],
      },
    });
    expect(fixture.imagesService.uploadMultiMedia).not.toHaveBeenCalled();
    expect(fixture.locationRequestModel.create).not.toHaveBeenCalled();
  });

  it('chuyển duplicate-key race thành 409', async () => {
    const fixture = createUpdateService({ createError: { code: 11000 } });

    const result = await fixture.service.updateLocation(
      String(fixture.locationId),
      { name: 'Tên mới' },
      String(fixture.ownerId),
      [imageFile],
    );

    expect(result).toMatchObject({ success: false, statusCode: 409 });
  });
});

describe('VendorLocationsService sensitive update publication', () => {
  const imageFile = {
    mimetype: 'image/jpeg',
    originalname: 'proof.jpg',
    size: 1,
  } as Express.Multer.File;

  it('keeps old public data and reports Admin review for a sensitive edit', async () => {
    const fixture = createUpdateService();

    const result = await fixture.service.updateLocation(
      String(fixture.locationId),
      {
        name: 'Tên mới',
        address: 'Địa chỉ mới',
        pinLatitude: 21.1,
        pinLongitude: 105.6,
        deviceLatitude: 21.1,
        deviceLongitude: 105.6,
      },
      String(fixture.ownerId),
      [imageFile],
    );

    expect(result).toMatchObject({
      success: true,
      requiresReapproval: true,
      message: expect.stringContaining('Admin duyệt'),
    });
    expect(fixture.location).toMatchObject({
      name: 'Tên cũ',
      address: 'Địa chỉ cũ',
      geo: { type: 'Point', coordinates: [105.5, 21] },
      status: LocationStatus.PUBLISHED,
    });
    expect(fixture.locationRequestModel.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          status: LocationRequestStatus.PENDING_RE_APPROVAL,
          oldData: expect.objectContaining({
            name: 'Tên cũ',
            address: 'Địa chỉ cũ',
          }),
          newData: expect.objectContaining({
            name: 'Tên mới',
            address: 'Địa chỉ mới',
            geo: { type: 'Point', coordinates: [105.6, 21.1] },
          }),
        }),
      ],
      { session: fixture.session },
    );
  });
});

function createRegistrationRetryService({
  pendingOtp = null,
  existingRequest = { _id: new Types.ObjectId() },
}: {
  pendingOtp?: { _id: Types.ObjectId; otpHash: string } | null;
  existingRequest?: { _id: Types.ObjectId } | null;
} = {}) {
  const userId = new Types.ObjectId();
  const locationRequestModel = {
    findOne: jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingRequest),
      }),
    }),
  };
  const session = {
    startTransaction: jest.fn(),
    abortTransaction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn().mockResolvedValue(undefined),
  };
  const service = new VendorLocationsService(
    {} as never,
    locationRequestModel as never,
    {
      findById: jest.fn().mockResolvedValue({
        _id: userId,
        phoneVerified: true,
      }),
    } as never,
    { findOne: jest.fn().mockResolvedValue(pendingOtp) } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {
      startSession: jest.fn().mockResolvedValue(session),
    } as never,
  );

  return { service, userId, locationRequestModel, session };
}

const registrationRequestData = {
  systemCode: 'ABC123',
  deviceLatitude: 10.7769,
  deviceLongitude: 106.7009,
  pinLatitude: 10.7769,
  pinLongitude: 106.7009,
};

const registrationLocationData = {
  name: 'Quán cà phê thử nghiệm',
  description: 'Địa điểm dùng để kiểm tra gửi lại.',
  address: '1 Đường Test, Thành phố Hồ Chí Minh',
  categoryId: String(new Types.ObjectId()),
  latitude: 10.7769,
  longitude: 106.7009,
};

describe('VendorLocationsService registration retries', () => {
  it('treats a retry as successful when the same system code already created a pending request', async () => {
    const { service, userId, locationRequestModel, session } =
      createRegistrationRetryService();

    const result = await service.registerLocation(
      String(userId),
      registrationRequestData,
      registrationLocationData,
    );

    expect(result).toMatchObject({
      success: true,
      statusCode: 200,
      alreadySubmitted: true,
    });
    expect(locationRequestModel.findOne).toHaveBeenCalledWith({
      submittedBy: userId,
      ownershipRequested: true,
      status: 'PENDING',
      'verificationProof.systemCode': 'ABC123',
    });
    expect(session.abortTransaction).toHaveBeenCalledTimes(1);
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('recognizes a committed retry even when a different system code is pending', async () => {
    const { service, userId } = createRegistrationRetryService({
      pendingOtp: {
        _id: new Types.ObjectId(),
        otpHash: bcrypt.hashSync('OTHER1', 4),
      },
    });

    const result = await service.registerLocation(
      String(userId),
      registrationRequestData,
      registrationLocationData,
    );

    expect(result).toMatchObject({
      success: true,
      statusCode: 200,
      alreadySubmitted: true,
    });
  });

  it('still rejects a system code without an exact persisted request', async () => {
    const { service, userId } = createRegistrationRetryService({
      existingRequest: null,
    });

    const result = await service.registerLocation(
      String(userId),
      registrationRequestData,
      registrationLocationData,
    );

    expect(result).toMatchObject({
      success: false,
      statusCode: 400,
    });
  });
});

describe('VendorLocationsService registration notifications', () => {
  it('persists a pending notification for the created location request in the same transaction', async () => {
    const userId = new Types.ObjectId();
    const locationId = new Types.ObjectId();
    const requestId = new Types.ObjectId();
    const session = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      abortTransaction: jest.fn().mockResolvedValue(undefined),
      endSession: jest.fn().mockResolvedValue(undefined),
    };
    const notificationModel = {
      create: jest.fn().mockResolvedValue([]),
    };
    const service = new VendorLocationsService(
      {
        create: jest.fn().mockResolvedValue([{ _id: locationId }]),
      } as never,
      {
        findOne: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(null),
          }),
        }),
        create: jest.fn().mockResolvedValue([{ _id: requestId }]),
      } as never,
      {
        findById: jest.fn().mockResolvedValue({
          _id: userId,
          phoneVerified: true,
          role: 'CUSTOMER',
        }),
      } as never,
      {
        findOne: jest.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          otpHash: bcrypt.hashSync('ABC123', 4),
        }),
        updateOne: jest.fn().mockResolvedValue({}),
      } as never,
      {} as never,
      {
        uploadMultiMedia: jest
          .fn()
          .mockResolvedValue([{ url: 'https://storage/evidence.jpg' }]),
      } as never,
      {} as never,
      {
        validatePinDistance: jest.fn().mockReturnValue({
          withinRange: true,
          distanceMeters: 0,
        }),
      } as never,
      {
        findPossibleDuplicates: jest.fn().mockResolvedValue([]),
      } as never,
      {
        startSession: jest.fn().mockResolvedValue(session),
      } as never,
      notificationModel as never,
    );

    const result = await service.registerLocation(
      String(userId),
      registrationRequestData,
      registrationLocationData,
      {
        imageFiles: [{} as Express.Multer.File],
        videoFiles: [{} as Express.Multer.File],
      },
    );

    expect(result).toMatchObject({ success: true, statusCode: 200 });
    expect(notificationModel.create).toHaveBeenCalledWith(
      [
        {
          userId,
          type: 'LOCATION_REQUEST_PENDING',
          refCollection: 'location_requests',
          refId: requestId,
          title: 'Địa điểm đang chờ phê duyệt',
          body: 'Địa điểm của bạn đang chờ phê duyệt.',
        },
      ],
      { session },
    );
    expect(notificationModel.create.mock.invocationCallOrder[0]).toBeLessThan(
      session.commitTransaction.mock.invocationCallOrder[0],
    );
  });
});

const locationId = '667200000000000000000001';
const vendorId = '66a000000000000000000001';
const otherVendorId = '66a000000000000000000002';
const file1 = {
  mimetype: 'image/jpeg',
  originalname: 'first.jpg',
  size: 1,
} as Express.Multer.File;
const file2 = {
  mimetype: 'image/png',
  originalname: 'second.png',
  size: 1,
} as Express.Multer.File;

function createOwnedLocation({
  imagesUrls = [],
}: {
  imagesUrls?: Array<{ url: string; isCover: boolean }>;
} = {}) {
  return {
    ownerId: new Types.ObjectId(vendorId),
    imagesUrls,
    save: jest.fn().mockResolvedValue(undefined),
  };
}

function createImageService(
  location: ReturnType<typeof createOwnedLocation> | null,
  {
    locations = [location],
    transaction = async <T>(work: (session: unknown) => Promise<T>) =>
      work({}),
  }: {
    locations?: Array<ReturnType<typeof createOwnedLocation> | null>;
    transaction?: <T>(work: (session: unknown) => Promise<T>) => Promise<T>;
  } = {},
) {
  const imagesService = {
    uploadMultiMedia: jest.fn(),
  };
  let locationLookupCount = 0;
  const connection = { transaction: jest.fn(transaction) };
  const service = new VendorLocationsService(
    {
      findById: jest.fn().mockImplementation(() => {
        const resolvedLocation =
          locations[Math.min(locationLookupCount++, locations.length - 1)];
        const query = {
          exec: jest.fn().mockResolvedValue(resolvedLocation),
          session: jest.fn(),
        };
        query.session.mockReturnValue(query);
        return query;
      }),
    } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    imagesService as never,
    {} as never,
    {} as never,
    {} as never,
    connection as never,
    {} as never,
  );

  return { service, imagesService, connection };
}

type ImageManagementService = VendorLocationsService & {
  addImagesToLocation(
    locationId: string,
    vendorId: string,
    files: Express.Multer.File[],
  ): Promise<unknown>;
  setLocationCoverImage(
    locationId: string,
    vendorId: string,
    imageUrl: string,
  ): Promise<unknown>;
};

describe('VendorLocationsService location image management', () => {
  it('appends uploaded images without replacing existing images or cover', async () => {
    const location = createOwnedLocation({
      imagesUrls: [{ url: 'https://cdn/cover.jpg', isCover: true }],
    });
    const { service, imagesService } = createImageService(location);
    imagesService.uploadMultiMedia.mockResolvedValue([
      { url: 'https://cdn/new-1.jpg' },
      { url: 'https://cdn/new-2.jpg' },
    ]);

    const result = await (service as ImageManagementService).addImagesToLocation(
      locationId,
      vendorId,
      [file1, file2],
    );

    expect(result).toMatchObject({ success: true });
    expect(location.imagesUrls).toEqual([
      { url: 'https://cdn/cover.jpg', isCover: true },
      expect.objectContaining({ url: 'https://cdn/new-1.jpg', isCover: false }),
      expect.objectContaining({ url: 'https://cdn/new-2.jpg', isCover: false }),
    ]);
    expect(location.save).toHaveBeenCalledTimes(1);
  });

  it('uses only the first new image as cover when the gallery has no cover', async () => {
    const location = createOwnedLocation();
    const { service, imagesService } = createImageService(location);
    imagesService.uploadMultiMedia.mockResolvedValue([
      { url: 'https://cdn/first.jpg' },
      { url: 'https://cdn/second.jpg' },
    ]);

    await (service as ImageManagementService).addImagesToLocation(
      locationId,
      vendorId,
      [file1, file2],
    );

    expect(location.imagesUrls.map((image) => [image.url, image.isCover])).toEqual([
      ['https://cdn/first.jpg', true],
      ['https://cdn/second.jpg', false],
    ]);
  });

  it('recomputes first-upload cover assignment in a transaction after a concurrent upload', async () => {
    const initialLocation = createOwnedLocation();
    const latestLocation = createOwnedLocation({
      imagesUrls: [{ url: 'https://cdn/concurrent-cover.jpg', isCover: true }],
    });
    const { service, imagesService, connection } = createImageService(
      initialLocation,
      { locations: [initialLocation, latestLocation] },
    );
    imagesService.uploadMultiMedia.mockResolvedValue([
      { url: 'https://cdn/retried-upload.jpg' },
    ]);

    await (service as ImageManagementService).addImagesToLocation(
      locationId,
      vendorId,
      [file1],
    );

    expect(connection.transaction).toHaveBeenCalledTimes(1);
    expect(latestLocation.imagesUrls.map((image) => [image.url, image.isCover]))
      .toEqual([
        ['https://cdn/concurrent-cover.jpg', true],
        ['https://cdn/retried-upload.jpg', false],
      ]);
  });

  it('rejects an image upload when the location does not exist', async () => {
    const { service } = createImageService(null);

    await expect(
      (service as ImageManagementService).addImagesToLocation(locationId, vendorId, [file1]),
    ).resolves.toMatchObject({ success: false, statusCode: 404 });
  });

  it('rejects an image upload from a user who does not own the location', async () => {
    const { service } = createImageService(createOwnedLocation());

    await expect(
      (service as ImageManagementService).addImagesToLocation(
        locationId,
        otherVendorId,
        [file1],
      ),
    ).resolves.toMatchObject({ success: false, statusCode: 403 });
  });

  it('changes the selected location image into the only cover', async () => {
    const location = createOwnedLocation({
      imagesUrls: [
        { url: 'https://cdn/old-cover.jpg', isCover: true },
        { url: 'https://cdn/new-cover.jpg', isCover: false },
      ],
    });
    const { service } = createImageService(location);

    const result = await (service as ImageManagementService).setLocationCoverImage(
      locationId,
      vendorId,
      'https://cdn/new-cover.jpg',
    );

    expect(result).toMatchObject({
      success: true,
      imageUrl: 'https://cdn/new-cover.jpg',
    });
    expect(location.imagesUrls.map((image) => [image.url, image.isCover])).toEqual([
      ['https://cdn/old-cover.jpg', false],
      ['https://cdn/new-cover.jpg', true],
    ]);
    expect(location.save).toHaveBeenCalledTimes(1);
  });

  it('marks only the selected image instance as cover when gallery URLs are duplicated', async () => {
    const location = createOwnedLocation({
      imagesUrls: [
        { url: 'https://cdn/old-cover.jpg', isCover: true },
        { url: 'https://cdn/duplicate.jpg', isCover: false },
        { url: 'https://cdn/duplicate.jpg', isCover: false },
      ],
    });
    const { service } = createImageService(location);

    await (service as ImageManagementService).setLocationCoverImage(
      locationId,
      vendorId,
      'https://cdn/duplicate.jpg',
    );

    expect(location.imagesUrls.map((image) => image.isCover)).toEqual([
      false,
      true,
      false,
    ]);
    expect(location.imagesUrls.filter((image) => image.isCover)).toHaveLength(1);
  });

  it('reapplies a cover change in a retried transaction against the latest gallery', async () => {
    const firstAttempt = createOwnedLocation({
      imagesUrls: [
        { url: 'https://cdn/old-cover.jpg', isCover: true },
        { url: 'https://cdn/new-cover.jpg', isCover: false },
      ],
    });
    const latestLocation = createOwnedLocation({
      imagesUrls: [
        { url: 'https://cdn/other-cover.jpg', isCover: true },
        { url: 'https://cdn/new-cover.jpg', isCover: false },
      ],
    });
    const { service, connection } = createImageService(firstAttempt, {
      locations: [firstAttempt, latestLocation],
      transaction: async (work) => {
        await work({});
        return work({});
      },
    });

    await (service as ImageManagementService).setLocationCoverImage(
      locationId,
      vendorId,
      'https://cdn/new-cover.jpg',
    );

    expect(connection.transaction).toHaveBeenCalledTimes(1);
    expect(latestLocation.imagesUrls.map((image) => [image.url, image.isCover]))
      .toEqual([
        ['https://cdn/other-cover.jpg', false],
        ['https://cdn/new-cover.jpg', true],
      ]);
    expect(latestLocation.imagesUrls.filter((image) => image.isCover)).toHaveLength(1);
  });

  it('rejects a cover URL that is not in the location gallery', async () => {
    const { service } = createImageService(createOwnedLocation());

    await expect(
      (service as ImageManagementService).setLocationCoverImage(
        locationId,
        vendorId,
        'https://cdn/other.jpg',
      ),
    ).resolves.toMatchObject({ success: false, statusCode: 400 });
  });
});

function createReplyEditService({
  replyAuthorId,
  currentOwnerId,
}: {
  replyAuthorId: string;
  currentOwnerId: string;
}) {
  const createdAt = new Date('2026-07-19T08:00:00.000Z');
  const replyAuthorObjectId = new Types.ObjectId(replyAuthorId);
  const review = {
    status: 'PUBLISHED',
    locationId: new Types.ObjectId(),
    reply: {
      vendorId: replyAuthorObjectId,
      content: 'Nội dung cũ',
      createdAt,
    },
    save: jest.fn().mockResolvedValue(undefined),
  };
  const reviewModel = {
    findById: jest.fn().mockResolvedValue(review),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  };
  const locationModel = {
    findById: jest.fn().mockResolvedValue({
      ownerId: new Types.ObjectId(currentOwnerId),
    }),
  };
  const service = new VendorLocationsService(
    locationModel as never,
    {} as never,
    { findById: jest.fn().mockResolvedValue({}) } as never,
    {} as never,
    reviewModel as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  return {
    createdAt,
    locationModel,
    replyAuthorObjectId,
    review,
    reviewModel,
    service,
  };
}

describe('VendorLocationsService review reply editing', () => {
  const replyAuthorId = '66a000000000000000000011';
  const newOwnerId = '66a000000000000000000012';
  const reviewId = '667200000000000000000011';

  it('allows the persisted reply author to edit after location ownership changes', async () => {
    const {
      createdAt,
      replyAuthorObjectId,
      review,
      service,
    } = createReplyEditService({ replyAuthorId, currentOwnerId: newOwnerId });

    const result = await service.editReply(
      replyAuthorId,
      'Nội dung mới',
      reviewId,
    );

    expect(result).toMatchObject({ success: true });
    expect(review.reply).toMatchObject({
      vendorId: replyAuthorObjectId,
      content: 'Nội dung mới',
      createdAt,
    });
    expect(review.reply.vendorId).toBe(replyAuthorObjectId);
    expect(review.reply.createdAt).toBe(createdAt);
    expect(review.save).toHaveBeenCalledTimes(1);
  });

  it('rejects the current location owner when they did not write the reply', async () => {
    const { review, reviewModel, service } = createReplyEditService({
      replyAuthorId,
      currentOwnerId: newOwnerId,
    });

    const result = await service.editReply(
      newOwnerId,
      'Nội dung trái phép',
      reviewId,
    );

    expect(result).toMatchObject({ success: false, statusCode: 403 });
    expect(review.reply.content).toBe('Nội dung cũ');
    expect(review.save).not.toHaveBeenCalled();
    expect(reviewModel.updateOne).not.toHaveBeenCalled();
  });
});
