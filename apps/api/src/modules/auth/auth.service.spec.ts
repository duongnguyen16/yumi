import * as bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from 'src/common/schemas/common.enums';
import AuthService from './auth.service';

describe('AuthService appeal sessions', () => {
  const userModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    updateOne: jest.fn(),
  };
  const jwtService = {
    sign: jest.fn((payload: object) => JSON.stringify(payload)),
    verifyAsync: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string) => `${key}-value`),
  };
  const service = new AuthService(
    userModel as never,
    {} as never,
    {} as never,
    jwtService as never,
    configService as never,
    {} as never,
    {} as never,
  );

  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('secret123', 4);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function user(status: UserStatus) {
    const value = {
      _id: 'user-1',
      email: 'user@example.com',
      passwordHash,
      status,
    };
    return {
      ...value,
      toObject: () => value,
    };
  }

  it('returns appeal-scoped tokens when a banned user logs in', async () => {
    userModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(user(UserStatus.BANNED)),
    });

    const result = await service.login('user@example.com', 'secret123');

    expect(result).toMatchObject({ success: true, appealOnly: true });
    expect(jwtService.sign).toHaveBeenNthCalledWith(
      1,
      { userId: 'user-1', scope: 'appeal' },
      expect.any(Object),
    );
    expect(jwtService.sign).toHaveBeenNthCalledWith(
      2,
      { userId: 'user-1', scope: 'appeal' },
      expect.any(Object),
    );
  });

  it('returns normal tokens when an active user logs in', async () => {
    userModel.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(user(UserStatus.ACTIVE)),
    });

    const result = await service.login('user@example.com', 'secret123');

    expect(result).toMatchObject({ success: true, appealOnly: false });
    expect(jwtService.sign).toHaveBeenNthCalledWith(
      1,
      { userId: 'user-1' },
      expect.any(Object),
    );
    expect(jwtService.sign).toHaveBeenNthCalledWith(
      2,
      { userId: 'user-1' },
      expect.any(Object),
    );
  });

  it('returns new appeal-scoped tokens when a banned user refreshes', async () => {
    jwtService.verifyAsync.mockResolvedValue({ userId: 'user-1' });
    userModel.findById.mockResolvedValue(user(UserStatus.BANNED));

    const result = await service.refresh('refresh-token');

    expect(result).toMatchObject({ success: true, appealOnly: true });
    expect(jwtService.sign).toHaveBeenNthCalledWith(
      1,
      { userId: 'user-1', scope: 'appeal' },
      expect.any(Object),
    );
    expect(jwtService.sign).toHaveBeenNthCalledWith(
      2,
      { userId: 'user-1', scope: 'appeal' },
      expect.any(Object),
    );
  });
});

describe('AuthService vendor registration', () => {
  const userModel = {
    findOne: jest.fn(),
    create: jest.fn(),
  };
  const pendingVendorModel = {
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
    deleteOne: jest.fn(),
  };
  const jwtService = {
    sign: jest.fn((payload: object) => JSON.stringify(payload)),
  };
  const configService = {
    get: jest.fn((key: string) => `${key}-value`),
  };
  const smsService = {
    sendOtp: jest.fn(),
  };
  const service = new AuthService(
    userModel as never,
    pendingVendorModel as never,
    {} as never,
    jwtService as never,
    configService as never,
    smsService as never,
    {} as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores only account and phone data while waiting for vendor OTP', async () => {
    userModel.findOne.mockResolvedValue(null);
    pendingVendorModel.findOneAndUpdate.mockResolvedValue({});
    smsService.sendOtp.mockResolvedValue(undefined);

    const result = await service.requestVendorOtp({
      email: 'Vendor@Example.com',
      password: 'secret123',
      name: 'Vendor User',
      phone: '0900000001',
    });

    expect(result).toMatchObject({ success: true });
    const [, pendingUpdate] = pendingVendorModel.findOneAndUpdate.mock.calls[0];
    expect(pendingUpdate).not.toHaveProperty('business_name');
    expect(pendingUpdate).not.toHaveProperty('business_phone');
    expect(pendingUpdate).not.toHaveProperty('business_address');
  });

  it('creates the vendor user directly after OTP verification', async () => {
    const pending = {
      email: 'vendor@example.com',
      password_hash: await bcrypt.hash('secret123', 4),
      name: 'Vendor User',
      phone: '0900000001',
      otp_hash: await bcrypt.hash('123456', 4),
      attempts: 0,
      expires_at: new Date(Date.now() + 60_000),
      save: jest.fn(),
    };
    const createdUser = {
      _id: 'vendor-1',
      email: pending.email,
      fullName: pending.name,
      phone: pending.phone,
      phoneVerified: true,
      role: UserRole.VENDOR,
      status: UserStatus.ACTIVE,
      toObject: () => ({
        _id: 'vendor-1',
        email: pending.email,
        fullName: pending.name,
        phone: pending.phone,
        phoneVerified: true,
        role: UserRole.VENDOR,
        status: UserStatus.ACTIVE,
      }),
    };
    pendingVendorModel.findOne.mockResolvedValue(pending);
    userModel.findOne.mockResolvedValue(null);
    userModel.create.mockResolvedValue(createdUser);
    pendingVendorModel.deleteOne.mockResolvedValue({});

    const result = await service.verifyVendorOtp({
      email: 'vendor@example.com',
      otp: '123456',
    });

    expect(result).toMatchObject({
      success: true,
      user: {
        role: UserRole.VENDOR,
        phone: '0900000001',
        phoneVerified: true,
      },
    });
    expect(userModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'vendor@example.com',
        phone: '0900000001',
        phoneVerified: true,
        role: UserRole.VENDOR,
      }),
    );
  });

  it('rejects an expired vendor registration OTP', async () => {
    const pending = {
      email: 'vendor@example.com',
      password_hash: await bcrypt.hash('secret123', 4),
      name: 'Vendor User',
      phone: '0900000001',
      otp_hash: await bcrypt.hash('123456', 4),
      attempts: 0,
      expires_at: new Date(Date.now() - 1),
      save: jest.fn(),
    };
    pendingVendorModel.findOne.mockResolvedValue(pending);

    const result = await service.verifyVendorOtp({
      email: pending.email,
      otp: '123456',
    });

    expect(result).toMatchObject({ success: false, statusCode: 400 });
    expect(userModel.create).not.toHaveBeenCalled();
  });
});
