import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AuditLog,
  AuditLogDocument,
} from 'src/common/schemas/audit-log.schema';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import { Report, ReportDocument } from 'src/common/schemas/report.schema';
import { Review, ReviewDocument } from 'src/common/schemas/review.schema';
import { User, UserDocument } from 'src/common/schemas/user.schema';

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Location.name)
    private readonly locationModel: Model<LocationDocument>,
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(Report.name)
    private readonly reportModel: Model<ReportDocument>,
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async getOverview() {
    const [
      totalUsers,
      totalLocations,
      totalReviews,
      totalReports,
      recentLogs,
      usersByRole,
      usersByStatus,
      locationsByStatus,
      reviewsByStatus,
      reportsByStatus,
    ] = await Promise.all([
      this.userModel.countDocuments().lean().exec(),
      this.locationModel.countDocuments().lean().exec(),
      this.reviewModel.countDocuments().lean().exec(),
      this.reportModel.countDocuments().lean().exec(),
      this.auditLogModel
        .find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('actorId', 'fullName email')
        .lean()
        .exec(),
      this.userModel
        .aggregate<{ _id: string; count: number }>([
          { $group: { _id: '$role', count: { $sum: 1 } } },
        ])
        .exec(),
      this.userModel
        .aggregate<{ _id: string; count: number }>([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        .exec(),
      this.locationModel
        .aggregate<{ _id: string; count: number }>([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        .exec(),
      this.reviewModel
        .aggregate<{ _id: string; count: number }>([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        .exec(),
      this.reportModel
        .aggregate<{ _id: string; count: number }>([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        .exec(),
    ]);

    return {
      success: true,
      data: {
        users: {
          total: totalUsers,
          byRole: this.toMap(usersByRole),
          byStatus: this.toMap(usersByStatus),
        },
        locations: {
          total: totalLocations,
          byStatus: this.toMap(locationsByStatus),
        },
        reviews: {
          total: totalReviews,
          byStatus: this.toMap(reviewsByStatus),
        },
        reports: {
          total: totalReports,
          byStatus: this.toMap(reportsByStatus),
        },
        recentActivity: recentLogs,
      },
    };
  }

  async listAuditLogs(
    page: number,
    limit: number,
    action?: string,
    actorId?: string,
  ) {
    const filter: Record<string, unknown> = {};
    if (action) {
      filter.action = action;
    }
    if (actorId) {
      filter.actorId = new Types.ObjectId(actorId);
    }

    const [data, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('actorId', 'fullName email')
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(filter).lean().exec(),
    ]);

    return {
      success: true,
      data,
      total,
      page,
      limit,
    };
  }

  private toMap(
    entries: { _id: string; count: number }[],
  ): Record<string, number> {
    const map: Record<string, number> = {};
    for (const entry of entries) {
      map[entry._id] = entry.count;
    }
    return map;
  }
}
