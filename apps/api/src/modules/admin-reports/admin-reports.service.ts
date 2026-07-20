import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ReportStatus } from '@wdp301/shared';
import { Model, Types } from 'mongoose';
import {
  NOTIFICATION_PORT,
  NotificationPort,
} from 'src/common/contracts/notification.port';
import {
  NotificationType,
  ReviewStatus,
  TrustEventType,
} from 'src/common/schemas/common.enums';
import {
  AuditLog,
  AuditLogDocument,
} from 'src/common/schemas/audit-log.schema';
import { Report, ReportDocument } from 'src/common/schemas/report.schema';
import { Review, ReviewDocument } from 'src/common/schemas/review.schema';
import { TrustEngineService } from '../trust-engine/trust-engine.service';
import { DismissReportDto } from './dto/dismiss-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

const PAGINATION_DEFAULT_LIMIT = 20;

type RatingSummary = {
  _id: Types.ObjectId;
  avgRating: number;
  reviewCount: number;
};

@Injectable()
export class AdminReportsService {
  constructor(
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
    private readonly trustEngineService: TrustEngineService,
    @Inject(NOTIFICATION_PORT)
    private readonly notification: NotificationPort,
  ) {}

  async listReports(page = 1, limit = PAGINATION_DEFAULT_LIMIT) {
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      this.reportModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reporterId', 'fullName email')
        .populate('handledBy', 'fullName email')
        .lean()
        .exec(),
      this.reportModel.countDocuments().exec(),
    ]);

    const mapped = reports.map((r) => ({
      id: String(r._id),
      targetType: r.targetType,
      targetId: String(r.targetId),
      reason: r.reason,
      description: r.description,
      evidenceFiles: r.evidenceFiles,
      route: r.route,
      status: r.status,
      affectedVendorId: r.affectedVendorId ? String(r.affectedVendorId) : null,
      resultReason: r.resultReason,
      resolvedAt: r.resolvedAt,
      createdAt: (r as any).createdAt,
      reporter:
        r.reporterId && typeof r.reporterId === 'object'
          ? {
              id: String((r.reporterId as any)._id),
              fullName: (r.reporterId as any).fullName ?? 'N/A',
              email: (r.reporterId as any).email ?? '',
            }
          : null,
      handledBy:
        r.handledBy && typeof r.handledBy === 'object'
          ? {
              id: String((r.handledBy as any)._id),
              fullName: (r.handledBy as any).fullName ?? 'N/A',
              email: (r.handledBy as any).email ?? '',
            }
          : null,
    }));

    return {
      success: true,
      data: mapped,
      total,
      page,
      limit,
    };
  }

  async resolveReport(
    adminId: string,
    reportId: string,
    dto: ResolveReportDto,
  ) {
    const adminObjectId = this.toObjectId(adminId, 'Admin không hợp lệ');
    const reportObjectId = this.toObjectId(reportId, 'Báo cáo không hợp lệ');

    const report = await this.reportModel.findById(reportObjectId).exec();
    if (!report) {
      throw new NotFoundException('Không tìm thấy báo cáo');
    }
    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException('Báo cáo đã được xử lý trước đó');
    }

    // If a review should be removed
    if (dto.removeReviewId) {
      await this.removeReview(
        report,
        adminObjectId,
        dto.removeReviewId,
        dto.resultReason,
      );
    }

    // Mark report as RESOLVED
    report.status = ReportStatus.RESOLVED;
    report.handledBy = adminObjectId;
    report.resultReason = dto.resultReason;
    report.resolvedAt = new Date();
    await report.save();

    // Trust: +5 for correct report
    await this.trustEngineService.recordEvent({
      userId: report.reporterId,
      type: TrustEventType.CORRECT_REPORT,
      reason: `Báo cáo được xác nhận đúng: ${dto.resultReason}`,
      refCollection: 'reports',
      refId: report._id,
    });

    // Audit log
    await this.auditLogModel.create({
      actorId: adminObjectId,
      action: 'REPORT_RESOLVED',
      targetCollection: 'reports',
      targetId: report._id,
      reason: dto.resultReason,
      diff: {
        previousStatus: ReportStatus.PENDING,
        newStatus: ReportStatus.RESOLVED,
      },
    });

    return {
      success: true,
      message: 'Đã xử lý báo cáo thành công',
      report: {
        id: String(report._id),
        status: report.status,
        handledBy: String(adminObjectId),
        resultReason: dto.resultReason,
        resolvedAt: report.resolvedAt,
      },
    };
  }

  async dismissReport(
    adminId: string,
    reportId: string,
    dto: DismissReportDto,
  ) {
    const adminObjectId = this.toObjectId(adminId, 'Admin không hợp lệ');
    const reportObjectId = this.toObjectId(reportId, 'Báo cáo không hợp lệ');

    const report = await this.reportModel.findById(reportObjectId).exec();
    if (!report) {
      throw new NotFoundException('Không tìm thấy báo cáo');
    }
    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException('Báo cáo đã được xử lý trước đó');
    }

    // Mark report as DISMISSED (malicious/false)
    report.status = ReportStatus.DISMISSED;
    report.handledBy = adminObjectId;
    report.resultReason = dto.resultReason;
    report.resolvedAt = new Date();
    await report.save();

    // Trust: -10 for false/malicious report
    await this.trustEngineService.recordEvent({
      userId: report.reporterId,
      type: TrustEventType.FALSE_REPORT,
      reason: `Báo cáo bị từ chối: ${dto.resultReason}`,
      refCollection: 'reports',
      refId: report._id,
    });

    // Audit log
    await this.auditLogModel.create({
      actorId: adminObjectId,
      action: 'REPORT_DISMISSED',
      targetCollection: 'reports',
      targetId: report._id,
      reason: dto.resultReason,
      diff: {
        previousStatus: ReportStatus.PENDING,
        newStatus: ReportStatus.DISMISSED,
      },
    });

    return {
      success: true,
      message: 'Đã từ chối báo cáo',
      report: {
        id: String(report._id),
        status: report.status,
        handledBy: String(adminObjectId),
        resultReason: dto.resultReason,
        resolvedAt: report.resolvedAt,
      },
    };
  }

  private async removeReview(
    report: ReportDocument,
    adminObjectId: Types.ObjectId,
    reviewId: string,
    reason: string,
  ) {
    const reviewObjectId = this.toObjectId(reviewId, 'Đánh giá không hợp lệ');

    const review = await this.reviewModel.findById(reviewObjectId).exec();
    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }
    if (review.status !== ReviewStatus.PUBLISHED) {
      throw new BadRequestException('Đánh giá đã bị xóa trước đó');
    }

    // Soft remove: set status to REMOVED_BY_ADMIN
    review.status = ReviewStatus.REMOVED_BY_ADMIN;
    await review.save();

    // Recompute avg rating for the location
    await this.recomputeAvgRating(review.locationId);

    // Audit log for review removal
    await this.auditLogModel.create({
      actorId: adminObjectId,
      action: 'REVIEW_REMOVED_BY_ADMIN',
      targetCollection: 'reviews',
      targetId: review._id,
      reason,
      diff: {
        previousStatus: ReviewStatus.PUBLISHED,
        newStatus: ReviewStatus.REMOVED_BY_ADMIN,
        reportId: String(report._id),
      },
    });

    const userId = String(review.userId);
    const refId = String(review._id);
    await this.notification.notify({
      userId,
      type: NotificationType.REVIEW_REMOVED,
      title: 'Đánh giá đã bị gỡ',
      body: reason,
      refCollection: 'reviews',
      refId,
    });
  }

  private async recomputeAvgRating(locationId: Types.ObjectId) {
    const [rating] = await this.reviewModel.aggregate<RatingSummary>([
      {
        $match: {
          locationId,
          status: ReviewStatus.PUBLISHED,
        },
      },
      {
        $group: {
          _id: '$locationId',
          avgRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    // We store avgRating on location if schema has it, or just return it.
    // The location schema doesn't have a denormalized rating field yet,
    // so we just recompute on read. The calculation is done in ReviewsService.
    // Future: could store ratingSummary on location for faster reads.
    void rating;
  }

  private toObjectId(value: string, message: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(message);
    }
    return new Types.ObjectId(value);
  }
}
