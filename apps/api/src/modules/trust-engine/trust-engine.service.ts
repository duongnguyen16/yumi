import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TrustEvent,
  TrustEventDocument,
} from 'src/common/schemas/trust-event.schema';
import { User, UserDocument } from 'src/common/schemas/user.schema';
import {
  TrustEventType,
  TrustLevel,
  UserStatus,
} from 'src/common/schemas/common.enums';

const TRUSTED_MIN_SCORE = 30;
const TRUSTED_MIN_ACCOUNT_AGE_DAYS = 14;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const TRUST_EVENT_POINTS: Record<
  Exclude<TrustEventType, TrustEventType.ADMIN_ADJUSTMENT>,
  number
> = {
  [TrustEventType.LOCATION_APPROVED]: 15,
  [TrustEventType.CORRECT_REPORT]: 5,
  [TrustEventType.LIVE_REVIEW]: 2,
  [TrustEventType.VIOLATING_CONTENT_REMOVED]: -10,
  [TrustEventType.FALSE_REPORT]: -10,
};

export type RecordTrustEventInput = {
  userId: string | Types.ObjectId;
  type: TrustEventType;
  reason?: string;
  refCollection?: string;
  refId?: string | Types.ObjectId;
  pointChange?: number;
};

export type TrustEngineResult = {
  userId: string;
  trustScore: number;
  trustLevel: TrustLevel;
  event?: TrustEventDocument;
  duplicate?: boolean;
};

@Injectable()
export class TrustEngineService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(TrustEvent.name)
    private readonly trustEventModel: Model<TrustEventDocument>,
  ) {}

  async recordEvent(input: RecordTrustEventInput): Promise<TrustEngineResult> {
    const user = await this.findUser(input.userId);
    const pointChange = this.resolvePointChange(input);
    const duplicateQuery = this.buildDuplicateQuery(input);

    if (duplicateQuery) {
      const existingEvent = await this.trustEventModel.findOne(duplicateQuery);
      if (existingEvent) {
        return this.toResult(user, existingEvent, true);
      }
    }

    const event = await this.trustEventModel.create({
      userId: this.toObjectId(input.userId),
      type: input.type,
      pointChange,
      reason: input.reason,
      refCollection: input.refCollection,
      refId: input.refId ? this.toObjectId(input.refId) : undefined,
    });

    user.trustScore = (user.trustScore ?? 0) + pointChange;
    user.trustLevel = this.resolveTrustLevel(user.trustScore, user.createdAt, {
      isBanned: this.isBanned(user),
    });
    await user.save();

    return this.toResult(user, event, false);
  }

  async evaluateUserTrust(userId: string | Types.ObjectId) {
    const user = await this.findUser(userId);

    user.trustLevel = this.resolveTrustLevel(
      user.trustScore ?? 0,
      user.createdAt,
      {
        isBanned: this.isBanned(user),
      },
    );
    await user.save();

    return this.toResult(user);
  }

  async banUser(
    userId: string | Types.ObjectId,
    adminId?: string | Types.ObjectId,
    reason?: string,
  ) {
    void adminId;
    void reason;

    const user = await this.findUser(userId);

    user.status = UserStatus.BANNED;
    user.trustLevel = TrustLevel.BANNED;
    await user.save();

    return this.toResult(user);
  }

  async unbanUser(userId: string | Types.ObjectId) {
    const user = await this.findUser(userId);

    user.status = UserStatus.ACTIVE;
    user.trustLevel = this.resolveTrustLevel(
      user.trustScore ?? 0,
      user.createdAt,
      {
        isBanned: false,
      },
    );
    await user.save();

    return this.toResult(user);
  }

  private async findUser(userId: string | Types.ObjectId) {
    const user = await this.userModel.findById(this.toObjectId(userId));
    if (!user) {
      throw new NotFoundException('Khong tim thay nguoi dung');
    }

    return user;
  }

  private resolvePointChange(input: RecordTrustEventInput) {
    if (input.type === TrustEventType.ADMIN_ADJUSTMENT) {
      if (typeof input.pointChange !== 'number') {
        throw new BadRequestException(
          'ADMIN_ADJUSTMENT can ghi ro pointChange',
        );
      }

      return input.pointChange;
    }

    return TRUST_EVENT_POINTS[input.type];
  }

  private resolveTrustLevel(
    trustScore: number,
    createdAt: Date | undefined,
    options: { isBanned: boolean },
  ) {
    if (options.isBanned) {
      return TrustLevel.BANNED;
    }

    if (trustScore < 0) {
      return TrustLevel.RESTRICTED;
    }

    if (
      trustScore >= TRUSTED_MIN_SCORE &&
      this.getAccountAgeDays(createdAt) >= TRUSTED_MIN_ACCOUNT_AGE_DAYS
    ) {
      return TrustLevel.TRUSTED;
    }

    return TrustLevel.NEW;
  }

  private getAccountAgeDays(createdAt?: Date) {
    if (!createdAt) {
      return 0;
    }

    return (Date.now() - createdAt.getTime()) / DAY_IN_MS;
  }

  private buildDuplicateQuery(input: RecordTrustEventInput) {
    if (!input.refCollection || !input.refId) {
      return undefined;
    }

    return {
      userId: this.toObjectId(input.userId),
      type: input.type,
      refCollection: input.refCollection,
      refId: this.toObjectId(input.refId),
    };
  }

  private isBanned(user: UserDocument) {
    return (
      user.status === UserStatus.BANNED || user.trustLevel === TrustLevel.BANNED
    );
  }

  private toObjectId(id: string | Types.ObjectId) {
    return typeof id === 'string' ? new Types.ObjectId(id) : id;
  }

  private toResult(
    user: UserDocument,
    event?: TrustEventDocument,
    duplicate = false,
  ): TrustEngineResult {
    return {
      userId: String(user._id),
      trustScore: user.trustScore,
      trustLevel: user.trustLevel,
      event,
      duplicate,
    };
  }
}
