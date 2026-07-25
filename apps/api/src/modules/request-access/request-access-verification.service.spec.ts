import { Types } from 'mongoose';
import { RequestAccessVerificationService } from './request-access-verification.service';
import { RequestAccessVerificationPurpose } from 'src/common/schemas/request-access-verification-session.schema';

function query<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

describe('RequestAccessVerificationService', () => {
  const userId = new Types.ObjectId();
  const otherUserId = new Types.ObjectId();
  const locationId = new Types.ObjectId();
  const requestAccessId = new Types.ObjectId();
  const now = new Date('2026-07-25T10:00:00.000Z');

  function setup() {
    const sessionModel = {
      findById: jest.fn(),
      findOneAndDelete: jest.fn(),
    };
    const locModel = {
      findById: jest.fn().mockReturnValue(
        query({
          _id: locationId,
          phone: '0900000000',
          ownerId: new Types.ObjectId(),
        }),
      ),
    };
    const sms = { sendOtp: jest.fn().mockResolvedValue(undefined) };
    const service = new RequestAccessVerificationService(
      sessionModel as never,
      locModel as never,
      sms as never,
    );
    return { service, sessionModel, locModel, sms };
  }

  function session(data: Record<string, unknown> = {}) {
    return {
      _id: new Types.ObjectId(),
      userId,
      locationId,
      requestAccessId,
      purpose: 'TAKEOVER' as RequestAccessVerificationPurpose,
      otpRequired: true,
      otpHash: '$2b$10$hash',
      otpVerified: true,
      attempts: 0,
      expiresAt: new Date(now.getTime() + 60_000),
      save: jest.fn().mockResolvedValue(undefined),
      ...data,
    };
  }

  it('rejects consuming an expired session', async () => {
    const { service, sessionModel } = setup();
    sessionModel.findOneAndDelete.mockReturnValue(
      query(null),
    );

    const result = await service.consume({
      sessionId: new Types.ObjectId().toHexString(),
      userId: String(userId),
      locationId: String(locationId),
      purpose: 'CREATE',
      now,
    });

    expect(result).toMatchObject({ success: false, statusCode: 410 });
    expect(sessionModel.findOneAndDelete).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        locationId,
        purpose: 'CREATE',
        expiresAt: { $gt: now },
      }),
    );
  });

  it('rejects a session owned by another user', async () => {
    const { service, sessionModel } = setup();
    sessionModel.findOneAndDelete.mockReturnValue(query(null));

    const result = await service.consume({
      sessionId: new Types.ObjectId().toHexString(),
      userId: String(otherUserId),
      locationId: String(locationId),
      purpose: 'TAKEOVER',
      requestAccessId: String(requestAccessId),
      now,
    });

    expect(result).toMatchObject({ success: false, statusCode: 410 });
  });

  it('rejects a takeover session for another request', async () => {
    const { service, sessionModel } = setup();
    sessionModel.findOneAndDelete.mockReturnValue(query(null));

    const result = await service.consume({
      sessionId: new Types.ObjectId().toHexString(),
      userId: String(userId),
      locationId: String(locationId),
      purpose: 'TAKEOVER',
      requestAccessId: new Types.ObjectId().toHexString(),
      now,
    });

    expect(result).toMatchObject({ success: false, statusCode: 410 });
  });

  it('rejects after five OTP attempts', async () => {
    const { service, sessionModel } = setup();
    const record = session({
      otpVerified: false,
      attempts: 5,
      expiresAt: new Date(now.getTime() + 60_000),
    });
    sessionModel.findById.mockReturnValue(query(record));

    const result = await service.verifyOtp(
      String(record._id),
      String(userId),
      '123456',
      now,
    );

    expect(result).toMatchObject({ success: false, statusCode: 429 });
    expect(record.save).not.toHaveBeenCalled();
  });
});
