import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ReportReason,
  ReportRoute,
  ReportStatus,
  ReportTargetType,
} from '@wdp301/shared';
import { Model, Types } from 'mongoose';
import {
  Location,
  LocationDocument,
} from 'src/common/schemas/location.schema';
import { Report, ReportDocument } from 'src/common/schemas/report.schema';
import { User, UserDocument } from 'src/common/schemas/user.schema';
import { UserStatus } from 'src/common/schemas/common.enums';
import { CreateLocationReportDto } from './dto/create-location-report.dto';

@Injectable()
export class LocationReportsService {
  constructor(
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,
    @InjectModel(Location.name)
    private readonly locationModel: Model<LocationDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(
    reporterId: string,
    locationId: string,
    dto: CreateLocationReportDto,
  ) {
    const reporterObjectId = this.toObjectId(reporterId, 'Người dùng không hợp lệ');
    const locationObjectId = this.toObjectId(
      locationId,
      'Địa điểm không hợp lệ',
    );

    const [reporter, location] = await Promise.all([
      this.userModel.findById(reporterObjectId).select('status').lean().exec(),
      this.locationModel
        .findById(locationObjectId)
        .select('ownerId status')
        .lean()
        .exec(),
    ]);

    if (!reporter || reporter.status === UserStatus.BANNED) {
      throw new ForbiddenException('Tài khoản không thể gửi báo cáo');
    }
    if (!location) {
      throw new NotFoundException('Không tìm thấy địa điểm');
    }

    const evidence = dto.evidence ?? [];
    if (dto.reason === ReportReason.WRONG_OWNER) {
      if (!location.ownerId) {
        throw new BadRequestException(
          'Địa điểm này chưa có chủ sở hữu để báo cáo',
        );
      }
      if (evidence.length === 0) {
        throw new BadRequestException(
          'Báo cáo chủ sở hữu sai bắt buộc phải có bằng chứng',
        );
      }
    }

    try {
      const report = await this.reportModel.create({
        reporterId: reporterObjectId,
        targetType: ReportTargetType.LOCATION,
        targetId: locationObjectId,
        reason: dto.reason,
        description: dto.description.trim(),
        evidenceFiles: evidence.map((file) => ({
          url: file.url,
          fileType: file.fileType,
          geo:
            file.latitude !== undefined && file.longitude !== undefined
              ? {
                  type: 'Point',
                  coordinates: [file.longitude, file.latitude],
                }
              : undefined,
          accuracyMeters: file.accuracyMeters,
          capturedAt: file.capturedAt
            ? new Date(file.capturedAt)
            : undefined,
        })),
        status: ReportStatus.PENDING,
        route:
          dto.reason === ReportReason.WRONG_OWNER
            ? ReportRoute.OWNERSHIP_REVIEW
            : ReportRoute.STANDARD_REVIEW,
        affectedVendorId:
          dto.reason === ReportReason.WRONG_OWNER
            ? location.ownerId
            : undefined,
      });

      return {
        success: true,
        message: 'Gửi báo cáo địa điểm thành công',
        report: {
          id: String(report._id),
          locationId,
          reason: report.reason,
          status: report.status,
          route: report.route,
          affectedVendorId: report.affectedVendorId
            ? String(report.affectedVendorId)
            : null,
        },
      };
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(
          'Đã có báo cáo đang chờ xử lý cho địa điểm và loại này',
        );
      }
      throw error;
    }
  }

  private toObjectId(value: string, message: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(message);
    }
    return new Types.ObjectId(value);
  }

  private isDuplicateKeyError(error: unknown): error is { code: number } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }
}
