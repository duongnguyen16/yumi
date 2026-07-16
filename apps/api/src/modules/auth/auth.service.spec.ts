import * as bcrypt from 'bcryptjs';
import { UserStatus } from 'src/common/schemas/common.enums';
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
