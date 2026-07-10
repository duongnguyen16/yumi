import { Types } from 'mongoose';
import { LocationStatus } from 'src/common/schemas/common.enums';
import { ClaimService } from './claim.service';

function query<T>(value: T) {
  return { lean: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(value) };
}

describe('ClaimService', () => {
  it('starts a verified claim session for an unowned published location', async () => {
    const locationId = new Types.ObjectId();
    const vendorId = new Types.ObjectId();
    const locationModel = {
      findById: jest.fn().mockReturnValue(
        query({
          _id: locationId,
          name: 'Quán cà phê Campus',
          status: LocationStatus.PUBLISHED,
          ownerId: null,
          phone: '0901000000',
        }),
      ),
    };
    const claimModel = { exists: jest.fn().mockResolvedValue(null) };
    const requestAccessModel = { exists: jest.fn().mockResolvedValue(null) };
    const sessionModel = { findOneAndUpdate: jest.fn().mockResolvedValue({}) };
    const notification = { notify: jest.fn() };
    const sms = { sendOtp: jest.fn().mockResolvedValue(undefined) };
    const service = new ClaimService(
      locationModel as never,
      claimModel as never,
      requestAccessModel as never,
      sessionModel as never,
      notification as never,
      sms as never,
    );

    const result = await service.start(String(locationId), String(vendorId));

    expect(result).toMatchObject({ success: true, otpRequired: true });
    expect(result.siteCode).toMatch(/^CLG-[A-Z0-9]{6}$/);
    expect(sms.sendOtp).toHaveBeenCalledWith(
      '0901000000',
      expect.stringMatching(/^\d{6}$/),
    );
    expect(sessionModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('blocks a new claim when the pending slot is already occupied', async () => {
    const locationId = new Types.ObjectId();
    const vendorId = new Types.ObjectId();
    const locationModel = {
      findById: jest.fn().mockReturnValue(
        query({
          _id: locationId,
          status: LocationStatus.PUBLISHED,
          ownerId: null,
          phone: '0901000000',
        }),
      ),
    };
    const claimModel = { exists: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }) };
    const requestAccessModel = { exists: jest.fn().mockResolvedValue(null) };
    const sessionModel = { findOneAndUpdate: jest.fn() };
    const notification = { notify: jest.fn() };
    const sms = { sendOtp: jest.fn() };
    const service = new ClaimService(
      locationModel as never,
      claimModel as never,
      requestAccessModel as never,
      sessionModel as never,
      notification as never,
      sms as never,
    );

    const result = await service.start(String(locationId), String(vendorId));

    expect(result).toMatchObject({ success: false, statusCode: 409 });
    expect(sessionModel.findOneAndUpdate).not.toHaveBeenCalled();
    expect(sms.sendOtp).not.toHaveBeenCalled();
  });

  it('submits a pending claim without changing the location owner', async () => {
    const locationId = new Types.ObjectId();
    const vendorId = new Types.ObjectId();
    const location = {
      _id: locationId,
      name: 'Quán cà phê Campus',
      status: LocationStatus.PUBLISHED,
      ownerId: null,
    };
    const locationModel = { findById: jest.fn().mockReturnValue(query(location)) };
    const claimModel = {
      exists: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        status: 'PENDING',
      }),
    };
    const requestAccessModel = { exists: jest.fn().mockResolvedValue(null) };
    const sessionModel = {
      findOne: jest.fn().mockReturnValue(
        query({
          _id: new Types.ObjectId(),
          siteCode: 'CLG-ABC123',
          otpRequired: false,
          otpVerified: false,
        }),
      ),
      deleteOne: jest.fn().mockReturnValue(query({})),
    };
    const notification = { notify: jest.fn().mockResolvedValue(undefined) };
    const sms = { sendOtp: jest.fn() };
    const service = new ClaimService(
      locationModel as never,
      claimModel as never,
      requestAccessModel as never,
      sessionModel as never,
      notification as never,
      sms as never,
    );

    const result = await service.submit(
      {
        locationId: String(locationId),
        evidenceFiles: [
          {
            url: 'https://example.com/proof.jpg',
            fileType: 'IMAGE',
            geo: { type: 'Point', coordinates: [105.5, 21.0] },
            capturedAt: '2026-07-10T08:00:00.000Z',
            metadata: { siteCode: 'CLG-ABC123' },
          },
        ],
      },
      String(vendorId),
    );

    expect(result).toMatchObject({ success: true, claim: { status: 'PENDING' } });
    expect(claimModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        vendorId,
        locationId,
        otpVerified: false,
        status: 'PENDING',
      }),
    );
    expect(location.ownerId).toBeNull();
    expect(notification.notify).toHaveBeenCalledTimes(1);
  });
});
