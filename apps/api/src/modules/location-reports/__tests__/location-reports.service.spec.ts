import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ReportReason,
  ReportRoute,
  ReportStatus,
  ReportTargetType,
} from '@wdp301/shared';
import { Types } from 'mongoose';
import { UserStatus } from 'src/common/schemas/common.enums';
import { EvidenceFileType } from '../dto/create-location-report.dto';
import { LocationReportsService } from '../location-reports.service';

function query<T>(value: T) {
  return {
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

describe('LocationReportsService', () => {
  const reporterId = new Types.ObjectId();
  const locationId = new Types.ObjectId();
  const ownerId = new Types.ObjectId();

  function createService(options?: {
    reporter?: Record<string, unknown> | null;
    location?: Record<string, unknown> | null;
    createResult?: Record<string, unknown>;
    createError?: unknown;
  }) {
    const reporter =
      options && 'reporter' in options
        ? options.reporter
        : {
            _id: reporterId,
            status: UserStatus.ACTIVE,
          };
    const location =
      options && 'location' in options
        ? options.location
        : {
            _id: locationId,
            ownerId,
            status: 'PUBLISHED',
          };
    const reportModel = {
      create: jest.fn(),
    };
    const locationModel = {
      findById: jest.fn().mockReturnValue(query(location)),
    };
    const userModel = {
      findById: jest.fn().mockReturnValue(query(reporter)),
    };

    if (options?.createError) {
      reportModel.create.mockRejectedValue(options.createError);
    } else {
      reportModel.create.mockResolvedValue(
        options?.createResult ?? {
          _id: new Types.ObjectId(),
          reason: ReportReason.INCORRECT_INFORMATION,
          status: ReportStatus.PENDING,
          route: ReportRoute.STANDARD_REVIEW,
          affectedVendorId: null,
        },
      );
    }

    return {
      service: new LocationReportsService(
        reportModel as never,
        locationModel as never,
        userModel as never,
      ),
      reportModel,
      locationModel,
      userModel,
    };
  }

  it('creates a standard location report', async () => {
    const { service, reportModel } = createService({
      location: { _id: locationId, ownerId: null, status: 'PUBLISHED' },
    });

    const result = await service.create(String(reporterId), String(locationId), {
      reason: ReportReason.SPAM,
      description: '  Nội dung spam và không phù hợp  ',
    });

    expect(result).toMatchObject({
      success: true,
      report: {
        locationId: String(locationId),
        status: ReportStatus.PENDING,
        route: ReportRoute.STANDARD_REVIEW,
        affectedVendorId: null,
      },
    });
    expect(reportModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reporterId,
        targetType: ReportTargetType.LOCATION,
        targetId: locationId,
        reason: ReportReason.SPAM,
        description: 'Nội dung spam và không phù hợp',
        evidenceFiles: [],
        status: ReportStatus.PENDING,
        route: ReportRoute.STANDARD_REVIEW,
        affectedVendorId: undefined,
      }),
    );
  });

  it('routes wrong-owner reports to ownership review with evidence', async () => {
    const { service, reportModel } = createService({
      createResult: {
        _id: new Types.ObjectId(),
        reason: ReportReason.WRONG_OWNER,
        status: ReportStatus.PENDING,
        route: ReportRoute.OWNERSHIP_REVIEW,
        affectedVendorId: ownerId,
      },
    });

    const result = await service.create(String(reporterId), String(locationId), {
      reason: ReportReason.WRONG_OWNER,
      description: 'Chủ sở hữu hiện tại không đúng',
      evidence: [
        {
          url: 'https://example.com/evidence.jpg',
          fileType: EvidenceFileType.IMAGE,
          latitude: 10.75,
          longitude: 106.67,
          accuracyMeters: 12,
          capturedAt: '2026-07-16T08:00:00.000Z',
        },
      ],
    });

    expect(result).toMatchObject({
      success: true,
      report: {
        reason: ReportReason.WRONG_OWNER,
        route: ReportRoute.OWNERSHIP_REVIEW,
        affectedVendorId: String(ownerId),
      },
    });
    expect(reportModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        route: ReportRoute.OWNERSHIP_REVIEW,
        affectedVendorId: ownerId,
        evidenceFiles: [
          expect.objectContaining({
            url: 'https://example.com/evidence.jpg',
            fileType: EvidenceFileType.IMAGE,
            geo: {
              type: 'Point',
              coordinates: [106.67, 10.75],
            },
            accuracyMeters: 12,
          }),
        ],
      }),
    );
  });

  it('rejects wrong-owner reports without evidence', async () => {
    const { service, reportModel } = createService();

    await expect(
      service.create(String(reporterId), String(locationId), {
        reason: ReportReason.WRONG_OWNER,
        description: 'Chủ sở hữu hiện tại không đúng',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(reportModel.create).not.toHaveBeenCalled();
  });

  it('rejects wrong-owner reports when the location has no owner', async () => {
    const { service, reportModel } = createService({
      location: { _id: locationId, ownerId: null, status: 'PUBLISHED' },
    });

    await expect(
      service.create(String(reporterId), String(locationId), {
        reason: ReportReason.WRONG_OWNER,
        description: 'Chủ sở hữu hiện tại không đúng',
        evidence: [
          {
            url: 'https://example.com/evidence.jpg',
            fileType: EvidenceFileType.IMAGE,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(reportModel.create).not.toHaveBeenCalled();
  });

  it('blocks owners from reporting their own location', async () => {
    const { service, reportModel } = createService({
      location: { _id: locationId, ownerId: reporterId, status: 'PUBLISHED' },
    });

    await expect(
      service.create(String(reporterId), String(locationId), {
        reason: ReportReason.INCORRECT_INFORMATION,
        description: 'Thông tin địa điểm này cần kiểm tra lại',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(reportModel.create).not.toHaveBeenCalled();
  });

  it('converts duplicate pending report keys into a conflict', async () => {
    const { service } = createService({
      location: { _id: locationId, ownerId: null, status: 'PUBLISHED' },
      createError: { code: 11000 },
    });

    await expect(
      service.create(String(reporterId), String(locationId), {
        reason: ReportReason.SPAM,
        description: 'Nội dung spam và không phù hợp',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects banned reporters and missing locations before creating reports', async () => {
    const banned = createService({
      reporter: { _id: reporterId, status: UserStatus.BANNED },
    });

    await expect(
      banned.service.create(String(reporterId), String(locationId), {
        reason: ReportReason.SPAM,
        description: 'Nội dung spam và không phù hợp',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(banned.reportModel.create).not.toHaveBeenCalled();

    const missingLocation = createService({ location: null });
    await expect(
      missingLocation.service.create(String(reporterId), String(locationId), {
        reason: ReportReason.SPAM,
        description: 'Nội dung spam và không phù hợp',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(missingLocation.reportModel.create).not.toHaveBeenCalled();
  });
});
