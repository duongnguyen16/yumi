import { Types } from 'mongoose';
import { VendorLocationsService } from './vendor-locations.service';

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

    expect(result).toMatchObject({ success: true });
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
