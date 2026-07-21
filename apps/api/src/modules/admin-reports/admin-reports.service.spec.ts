import { ReportStatus } from '@wdp301/shared';
import { Model, Types } from 'mongoose';
import { NotificationPort } from 'src/common/contracts/notification.port';
import { AuditLogDocument } from 'src/common/schemas/audit-log.schema';
import {
  NotificationType,
  ReviewStatus,
} from 'src/common/schemas/common.enums';
import { ReportDocument } from 'src/common/schemas/report.schema';
import { ReviewDocument } from 'src/common/schemas/review.schema';
import { TrustEngineService } from '../trust-engine/trust-engine.service';
import { AdminReportsService } from './admin-reports.service';

function query<T>(value: T) {
  return {
    exec: jest.fn().mockResolvedValue(value),
  };
}

describe('Kiểm thử AdminReportsService', () => {
  it('thông báo cho tác giả khi đánh giá bị gỡ', async () => {
    const adminId = new Types.ObjectId();
    const reportId = new Types.ObjectId();
    const reporterId = new Types.ObjectId();
    const reviewId = new Types.ObjectId();
    const reviewAuthorId = new Types.ObjectId();
    const locationId = new Types.ObjectId();
    const reason = 'Đánh giá vi phạm tiêu chuẩn cộng đồng';

    const report = {
      _id: reportId,
      reporterId,
      status: ReportStatus.PENDING,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const review = {
      _id: reviewId,
      userId: reviewAuthorId,
      locationId,
      status: ReviewStatus.PUBLISHED,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const reportModel = {
      findById: jest.fn().mockReturnValue(query(report)),
    };
    const reviewModel = {
      findById: jest.fn().mockReturnValue(query(review)),
      aggregate: jest.fn().mockResolvedValue([]),
    };
    const auditLogModel = {
      create: jest.fn().mockResolvedValue({}),
    };
    const trustEngine = {
      recordEvent: jest.fn().mockResolvedValue({}),
    };
    const notification = {
      notify: jest.fn().mockResolvedValue(undefined),
    };

    const service = new AdminReportsService(
      reportModel as Model<ReportDocument>,
      reviewModel as Model<ReviewDocument>,
      auditLogModel as Model<AuditLogDocument>,
      trustEngine as TrustEngineService,
      notification as NotificationPort,
    );

    await service.resolveReport(String(adminId), String(reportId), {
      removeReviewId: String(reviewId),
      resultReason: reason,
    });

    expect(notification.notify).toHaveBeenCalledWith({
      userId: String(reviewAuthorId),
      type: NotificationType.REVIEW_REMOVED,
      title: 'Đánh giá đã bị gỡ',
      body: reason,
      refCollection: 'reviews',
      refId: String(reviewId),
    });
  });
});
