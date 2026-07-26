import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { Model, Types } from 'mongoose';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import {
  RequestAccessVerificationPurpose,
  RequestAccessVerificationSession,
  RequestAccessVerificationSessionDocument,
} from 'src/common/schemas/request-access-verification-session.schema';
import { SmsService } from '../auth/services/sms.service';

const SESSION_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;

interface ConsumeInput {
  sessionId: string;
  userId: string;
  locationId: string;
  purpose: RequestAccessVerificationPurpose;
  requestAccessId?: string;
  now?: Date;
}

@Injectable()
export class RequestAccessVerificationService {
  constructor(
    @InjectModel(RequestAccessVerificationSession.name)
    private readonly sessionModel: Model<RequestAccessVerificationSessionDocument>,
    @InjectModel(Location.name)
    private readonly locModel: Model<LocationDocument>,
    private readonly sms: SmsService,
  ) {}

  async start(
    userId: string,
    locationId: string,
    purpose: RequestAccessVerificationPurpose,
    requestAccessId?: string,
  ) {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(locationId)) {
      return this.fail(400, 'Thông tin phiên xác minh không hợp lệ');
    }

    const location = await this.locModel.findById(locationId).exec();
    if (!location) return this.fail(404, 'Không tìm thấy địa điểm');

    const otp = randomInt(100000, 1000000).toString();
    const otpRequired = Boolean(location.phone);
    const created = await this.sessionModel.create({
      userId: new Types.ObjectId(userId),
      locationId: new Types.ObjectId(locationId),
      requestAccessId: requestAccessId
        ? new Types.ObjectId(requestAccessId)
        : undefined,
      purpose,
      otpRequired,
      otpHash: otpRequired ? await bcrypt.hash(otp, 10) : null,
      otpVerified: !otpRequired,
      attempts: 0,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });

    if (otpRequired) {
      await this.sms.sendOtp(String(location.phone), otp);
    }

    return {
      success: true,
      sessionId: String(created._id),
      otpRequired,
      expiresAt: created.expiresAt,
      destinationPhone: otpRequired ? String(location.phone) : undefined,
      destinationType: otpRequired
        ? ('LOCATION_CONTACT' as const)
        : undefined,
    };
  }

  async verifyOtp(
    sessionId: string,
    userId: string,
    otp: string,
    now = new Date(),
  ) {
    if (!Types.ObjectId.isValid(sessionId) || !Types.ObjectId.isValid(userId)) {
      return this.fail(400, 'Phiên xác minh không hợp lệ');
    }

    const session = await this.sessionModel.findById(sessionId).exec();
    if (!session || String(session.userId) !== userId) {
      return this.fail(404, 'Không tìm thấy phiên xác minh');
    }
    if (session.expiresAt.getTime() <= now.getTime()) {
      return this.fail(410, 'Phiên xác minh đã hết hạn');
    }
    if (session.attempts >= MAX_ATTEMPTS) {
      return this.fail(429, 'Bạn đã nhập sai OTP quá số lần cho phép');
    }
    if (!session.otpRequired) {
      session.otpVerified = true;
      await session.save();
      return { success: true, otpVerified: true };
    }

    const matched = await bcrypt.compare(otp, session.otpHash ?? '');
    if (!matched) {
      session.attempts += 1;
      await session.save();
      return this.fail(400, 'OTP không hợp lệ');
    }

    session.otpVerified = true;
    await session.save();
    return { success: true, otpVerified: true };
  }

  async consume(input: ConsumeInput) {
    const filter = this.buildFilter(input);
    if (!filter.success) return filter;

    const session = await this.sessionModel
      .findOneAndDelete(filter.value)
      .exec();
    if (!session) {
      return this.fail(410, 'Phiên xác minh đã hết hạn hoặc đã được sử dụng');
    }

    return { success: true as const, otpVerified: session.otpVerified };
  }

  async check(input: ConsumeInput) {
    const filter = this.buildFilter(input);
    if (!filter.success) return filter;

    const session = await this.sessionModel.findOne(filter.value).lean().exec();
    if (!session) {
      return this.fail(410, 'Phiên xác minh đã hết hạn hoặc đã được sử dụng');
    }

    return { success: true as const, otpVerified: session.otpVerified };
  }

  private buildFilter(input: ConsumeInput) {
    const now = input.now ?? new Date();
    if (
      !Types.ObjectId.isValid(input.sessionId) ||
      !Types.ObjectId.isValid(input.userId) ||
      !Types.ObjectId.isValid(input.locationId)
    ) {
      return this.fail(400, 'Phiên xác minh không hợp lệ');
    }

    const value: Record<string, unknown> = {
      _id: new Types.ObjectId(input.sessionId),
      userId: new Types.ObjectId(input.userId),
      locationId: new Types.ObjectId(input.locationId),
      purpose: input.purpose,
      expiresAt: { $gt: now },
      $or: [{ otpRequired: false }, { otpVerified: true }],
    };

    if (input.purpose === 'TAKEOVER') {
      if (
        !input.requestAccessId ||
        !Types.ObjectId.isValid(input.requestAccessId)
      ) {
        return this.fail(400, 'Phiên tiếp quản không hợp lệ');
      }
      value.requestAccessId = new Types.ObjectId(input.requestAccessId);
    }

    return { success: true as const, value };
  }

  private fail(statusCode: number, message: string) {
    return { success: false as const, statusCode, message };
  }
}
