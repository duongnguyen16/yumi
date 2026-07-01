import { Model, Types } from 'mongoose';
import {
  TrustEventType,
  TrustLevel,
  UserStatus,
} from 'src/common/schemas/common.enums';
import { TrustEventDocument } from 'src/common/schemas/trust-event.schema';
import { UserDocument } from 'src/common/schemas/user.schema';
import { TrustEngineService } from './trust-engine.service';

type UserModelMock = {
  findById: jest.MockedFunction<
    (userId: Types.ObjectId) => Promise<UserDocument | null>
  >;
};

type TrustEventModelMock = {
  findOne: jest.MockedFunction<
    (query: Record<string, unknown>) => Promise<TrustEventDocument | null>
  >;
  create: jest.MockedFunction<
    (event: Record<string, unknown>) => Promise<TrustEventDocument>
  >;
};

type TestUserDocument = UserDocument & {
  save: jest.MockedFunction<() => Promise<void>>;
};

const NOW = new Date('2026-06-28T00:00:00.000Z');
const oldAccountDate = new Date('2026-06-01T00:00:00.000Z');
const youngAccountDate = new Date('2026-06-25T00:00:00.000Z');

describe('TrustEngineService', () => {
  let userModel: UserModelMock;
  let trustEventModel: TrustEventModelMock;
  let service: TrustEngineService;
  let event: TrustEventDocument;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);

    event = { _id: new Types.ObjectId() } as TrustEventDocument;
    userModel = {
      findById:
        jest.fn<(userId: Types.ObjectId) => Promise<UserDocument | null>>(),
    };
    trustEventModel = {
      findOne: jest
        .fn<
          (query: Record<string, unknown>) => Promise<TrustEventDocument | null>
        >()
        .mockResolvedValue(null),
      create: jest
        .fn<
          (
            eventToCreate: Record<string, unknown>,
          ) => Promise<TrustEventDocument>
        >()
        .mockResolvedValue(event),
    };
    service = new TrustEngineService(
      userModel as unknown as Model<UserDocument>,
      trustEventModel as unknown as Model<TrustEventDocument>,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('moves NEW to TRUSTED when score reaches 30 and account is at least 14 days old', async () => {
    const user = createUser({
      trustScore: 15,
      trustLevel: TrustLevel.NEW,
      createdAt: oldAccountDate,
    });
    userModel.findById.mockResolvedValue(user);

    const result = await service.recordEvent({
      userId: user._id,
      type: TrustEventType.LOCATION_APPROVED,
      refCollection: 'locations',
      refId: new Types.ObjectId(),
    });

    expect(user.trustScore).toBe(30);
    expect(user.trustLevel).toBe(TrustLevel.TRUSTED);
    expect(user.save.mock.calls).toHaveLength(1);
    expect(result.trustLevel).toBe(TrustLevel.TRUSTED);
  });

  it('keeps score 0-29 in NEW', async () => {
    const user = createUser({
      trustScore: 0,
      trustLevel: TrustLevel.NEW,
      createdAt: oldAccountDate,
    });
    userModel.findById.mockResolvedValue(user);

    await service.recordEvent({
      userId: user._id,
      type: TrustEventType.LIVE_REVIEW,
    });

    expect(user.trustScore).toBe(2);
    expect(user.trustLevel).toBe(TrustLevel.NEW);
  });

  it('keeps score 30 or higher in NEW until the account is at least 14 days old', async () => {
    const user = createUser({
      trustScore: 28,
      trustLevel: TrustLevel.NEW,
      createdAt: youngAccountDate,
    });
    userModel.findById.mockResolvedValue(user);

    await service.recordEvent({
      userId: user._id,
      type: TrustEventType.LIVE_REVIEW,
    });

    expect(user.trustScore).toBe(30);
    expect(user.trustLevel).toBe(TrustLevel.NEW);
  });

  it('moves TRUSTED back to NEW when score drops below 30 but stays non-negative', async () => {
    const user = createUser({
      trustScore: 35,
      trustLevel: TrustLevel.TRUSTED,
      createdAt: oldAccountDate,
    });
    userModel.findById.mockResolvedValue(user);

    await service.recordEvent({
      userId: user._id,
      type: TrustEventType.FALSE_REPORT,
    });

    expect(user.trustScore).toBe(25);
    expect(user.trustLevel).toBe(TrustLevel.NEW);
  });

  it('moves users to RESTRICTED when score drops below 0', async () => {
    const user = createUser({
      trustScore: 35,
      trustLevel: TrustLevel.TRUSTED,
      createdAt: oldAccountDate,
    });
    userModel.findById.mockResolvedValue(user);

    await service.recordEvent({
      userId: user._id,
      type: TrustEventType.ADMIN_ADJUSTMENT,
      pointChange: -40,
    });

    expect(user.trustScore).toBe(-5);
    expect(user.trustLevel).toBe(TrustLevel.RESTRICTED);
  });

  it('moves RESTRICTED back to NEW when score recovers to 0 or higher', async () => {
    const user = createUser({
      trustScore: -5,
      trustLevel: TrustLevel.RESTRICTED,
      createdAt: oldAccountDate,
    });
    userModel.findById.mockResolvedValue(user);

    await service.recordEvent({
      userId: user._id,
      type: TrustEventType.LOCATION_APPROVED,
    });

    expect(user.trustScore).toBe(10);
    expect(user.trustLevel).toBe(TrustLevel.NEW);
  });

  it('sets both trust level and user status when banning', async () => {
    const user = createUser({
      trustScore: 30,
      trustLevel: TrustLevel.TRUSTED,
      status: UserStatus.ACTIVE,
      createdAt: oldAccountDate,
    });
    userModel.findById.mockResolvedValue(user);

    const result = await service.banUser(user._id);

    expect(user.status).toBe(UserStatus.BANNED);
    expect(user.trustLevel).toBe(TrustLevel.BANNED);
    expect(result.trustLevel).toBe(TrustLevel.BANNED);
  });

  it.each([
    [-1, oldAccountDate, TrustLevel.RESTRICTED],
    [0, oldAccountDate, TrustLevel.NEW],
    [29, oldAccountDate, TrustLevel.NEW],
    [30, youngAccountDate, TrustLevel.NEW],
    [30, oldAccountDate, TrustLevel.TRUSTED],
  ])(
    'unbans and recomputes score %i with account age into %s',
    async (trustScore, createdAt, expectedLevel) => {
      const user = createUser({
        trustScore,
        trustLevel: TrustLevel.BANNED,
        status: UserStatus.BANNED,
        createdAt,
      });
      userModel.findById.mockResolvedValue(user);

      const result = await service.unbanUser(user._id);

      expect(user.status).toBe(UserStatus.ACTIVE);
      expect(user.trustLevel).toBe(expectedLevel);
      expect(result.trustLevel).toBe(expectedLevel);
    },
  );

  it('does not apply points again for duplicate reference events', async () => {
    const user = createUser({
      trustScore: 0,
      trustLevel: TrustLevel.NEW,
      createdAt: oldAccountDate,
    });
    const existingEvent = { _id: new Types.ObjectId() } as TrustEventDocument;
    userModel.findById.mockResolvedValue(user);
    trustEventModel.findOne.mockResolvedValue(existingEvent);

    const result = await service.recordEvent({
      userId: user._id,
      type: TrustEventType.LOCATION_APPROVED,
      refCollection: 'locations',
      refId: new Types.ObjectId(),
    });

    expect(user.trustScore).toBe(0);
    expect(user.trustLevel).toBe(TrustLevel.NEW);
    expect(trustEventModel.create.mock.calls).toHaveLength(0);
    expect(user.save.mock.calls).toHaveLength(0);
    expect(result.duplicate).toBe(true);
  });
});

function createUser(input: {
  trustScore: number;
  trustLevel: TrustLevel;
  createdAt: Date;
  status?: UserStatus;
}): TestUserDocument {
  return {
    _id: new Types.ObjectId(),
    trustScore: input.trustScore,
    trustLevel: input.trustLevel,
    status: input.status ?? UserStatus.ACTIVE,
    createdAt: input.createdAt,
    save: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  } as unknown as TestUserDocument;
}
