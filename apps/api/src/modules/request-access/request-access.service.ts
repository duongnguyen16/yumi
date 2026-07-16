import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  NOTIFICATION_PORT,
  NotificationPort,
} from 'src/common/contracts/notification.port';
import {
  AuditLog,
  AuditLogDocument,
} from 'src/common/schemas/audit-log.schema';
import {
  ClaimRequest,
  ClaimRequestDocument,
} from 'src/common/schemas/claim-request.schema';
import {
  ClaimRequestStatus,
  LocationStatus,
  RequestAccessStatus,
} from 'src/common/schemas/common.enums';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import {
  RequestAccess,
  RequestAccessDocument,
} from 'src/common/schemas/request-access.schema';
import { CreateRequestAccessDTO } from './dto/create-request-access.dto';
import {
  RespondAction,
  RespondRequestAccessDTO,
} from './dto/respond-request-access.dto';
import { VerifyTakeoverDTO } from './dto/verify-takeover.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
const RESPONSE_DAYS = 3;
const HOLD_DAYS = 7;

export type EffectiveState =
  | 'PENDING_OPEN'
  | 'PENDING_TIMED_OUT'
  | 'GRANTED'
  | 'REJECTED'
  | 'AUTO_GRANTED'
  | 'EXPIRED'
  | 'ESCALATED';

@Injectable()
export class RequestAccessService {
  private readonly logger = new Logger(RequestAccessService.name);

  constructor(
    @InjectModel(RequestAccess.name)
    private readonly reqModel: Model<RequestAccessDocument>,
    @InjectModel(Location.name)
    private readonly locModel: Model<LocationDocument>,
    @InjectModel(ClaimRequest.name)
    private readonly claimModel: Model<ClaimRequestDocument>,
    @InjectModel(AuditLog.name)
    private readonly logModel: Model<AuditLogDocument>,
    @Inject(NOTIFICATION_PORT)
    private readonly notification: NotificationPort,
  ) {}

  resolveEffectiveState(
    req: Pick<RequestAccess, 'status' | 'timeoutAt'>,
    now = new Date(),
  ): EffectiveState {
    // nếu pending + timeoutAt < now => timed out
    if (req.status === RequestAccessStatus.PENDING) {
      return now > req.timeoutAt ? 'PENDING_TIMED_OUT' : 'PENDING_OPEN';
    }
    return req.status;
  }

  // tạo request access
  async createRequest(userId: string, dto: CreateRequestAccessDTO) {
    try {
      // validate userId
      if (!Types.ObjectId.isValid(userId)) {
        return this.fail(400, 'ID người yêu cầu không hợp lệ');
      }

      // lấy location
      const loc = await this.locModel.findById(dto.locationId).exec();
      if (!loc) return this.fail(404, 'Không tìm thấy địa điểm');
      if (loc.status !== LocationStatus.PUBLISHED) {
        return this.fail(409, 'Chỉ có thể xin quyền địa điểm đang công khai');
      }
      if (!loc.ownerId) {
        return this.fail(409, 'Địa điểm chưa có chủ, hãy dùng luồng claim');
      }
      if (String(loc.ownerId) === userId) {
        return this.fail(409, 'Bạn đã là chủ địa điểm này');
      }

      // check xem có claim hoặc request đang chờ xử lý không
      const [claim, req] = await Promise.all([
        this.claimModel.exists({
          locationId: loc._id,
          status: ClaimRequestStatus.PENDING,
        }),
        this.reqModel.exists({
          locationId: loc._id,
          status: RequestAccessStatus.PENDING,
        }),
      ]);
      if (claim) return this.fail(409, 'Địa điểm đang có claim chờ xử lý');
      if (req) return this.fail(409, 'Địa điểm đang có yêu cầu chuyển quyền');

      // create request access
      const now = new Date();
      const created = await this.reqModel.create({
        locationId: loc._id,
        requesterId: new Types.ObjectId(userId),
        currentOwnerId: loc.ownerId,
        evidenceFiles: dto.evidenceFiles ?? [],
        otpVerified: false,
        status: RequestAccessStatus.PENDING,
        timeoutAt: new Date(now.getTime() + RESPONSE_DAYS * DAY_MS),
        responseReason: dto.reason?.trim() || undefined,
      });

      await this.notification.notify({
        userId: String(loc.ownerId),
        type: 'REQUEST_ACCESS_RECEIVED',
        title: 'Có yêu cầu chuyển quyền mới',
        body: `Có người xin quyền quản lý "${loc.name}". Bạn có 3 ngày để phản hồi.`,
        refCollection: 'request_accesses',
        refId: String(created._id),
      });

      return {
        success: true,
        message: 'Đã gửi yêu cầu chuyển quyền',
        request: {
          id: created._id,
          status: created.status,
          timeoutAt: created.timeoutAt,
        },
      };
    } catch (err) {
      if (this.isDuplicate(err)) {
        return this.fail(409, 'Địa điểm đang có yêu cầu chuyển quyền');
      }
      this.logger.error('Không thể tạo yêu cầu chuyển quyền', err);
      return this.fail(500, 'Lỗi khi tạo yêu cầu chuyển quyền');
    }
  }


  // list request access của owner hoặc requester
  async listMine(userId: string, side: 'owner' | 'requester') {
    try {

      // validate userId
      if (!Types.ObjectId.isValid(userId)) {
        return this.fail(400, 'ID người dùng không hợp lệ');
      }

      const id = new Types.ObjectId(userId);
      const filter =
        side === 'owner' ? { currentOwnerId: id } : { requesterId: id };
      const items = await this.reqModel
        .find(filter)
        .sort({ createdAt: -1 })
        .populate('locationId', 'name address ownerId')
        .populate('requesterId', 'fullName email')
        .populate('currentOwnerId', 'fullName email')
        .lean()
        .exec();
      return {
        success: true,
        items: items.map((item) => this.toView(item, userId)),
      };
    } catch (err) {
      this.logger.error('Không thể lấy danh sách chuyển quyền', err);
      return this.fail(500, 'Lỗi khi lấy danh sách yêu cầu');
    }
  }

  // get request access by id
  async getRequestById(id: string, userId: string) {
    try {
      if (!Types.ObjectId.isValid(id)) return this.fail(400, 'ID không hợp lệ');
      const req = await this.reqModel
        .findById(id)
        .populate('locationId', 'name address ownerId')
        .populate('requesterId', 'fullName email')
        .populate('currentOwnerId', 'fullName email')
        .lean()
        .exec();
      if (!req) return this.fail(404, 'Không tìm thấy yêu cầu');
      if (!this.canView(req, userId)) {
        return this.fail(403, 'Bạn không có quyền xem yêu cầu này');
      }
      return { success: true, request: this.toView(req, userId) };
    } catch (err) {
      this.logger.error('Không thể lấy yêu cầu chuyển quyền', err);
      return this.fail(500, 'Lỗi khi lấy yêu cầu');
    }
  }

  // owner trả lời request access
  async respond(id: string, ownerId: string, dto: RespondRequestAccessDTO) {
    try {
      // validate id
      const data = await this.loadPendingRequest(id);
      // nếu không thành công thì return fail
      if (!data.success) return data;

      const { req } = data;
      if (String(req.currentOwnerId) !== ownerId) {
        return this.fail(403, 'Chỉ chủ địa điểm mới được phản hồi');
      }
      if (this.resolveEffectiveState(req) !== 'PENDING_OPEN') {
        return this.fail(409, 'Yêu cầu đã hết hạn phản hồi');
      }
      const loc = await this.locModel.findById(req.locationId).exec();
      if (!loc) return this.fail(404, 'Không tìm thấy địa điểm');
      if (String(loc.ownerId) !== String(req.currentOwnerId)) {
        return this.fail(409, 'Chủ địa điểm đã thay đổi');
      }

      // nếu reject thì set status = REJECTED, nếu grant thì set status = GRANTED và chuyển quyền sở hữu
      const now = new Date();
      req.respondedAt = now;

      // từ chối 
      if (dto.action === RespondAction.REJECT) {
        req.status = RequestAccessStatus.REJECTED;
        req.responseReason = dto.reason?.trim();
        await req.save();
        await Promise.all([
          this.notification.notify({
            userId: String(req.requesterId),
            type: 'REQUEST_ACCESS_REJECTED',
            title: 'Yêu cầu chuyển quyền bị từ chối',
            body: `Yêu cầu cho "${loc.name}" bị từ chối. Lý do: ${req.responseReason}`,
            refCollection: 'request_accesses',
            refId: String(req._id),
          }),
          this.notification.notify({
            userId: ownerId,
            type: 'REQUEST_ACCESS_RESPONSE_RECORDED',
            title: 'Đã ghi nhận phản hồi',
            body: `Bạn đã từ chối yêu cầu chuyển quyền "${loc.name}".`,
            refCollection: 'request_accesses',
            refId: String(req._id),
          }),
        ]);
        await this.writeLog(
          ownerId,
          'REQUEST_ACCESS_REJECT',
          loc._id,
          dto.reason,
          {
            requestId: String(req._id),
            status: { from: RequestAccessStatus.PENDING, to: req.status },
          },
        );
        return {
          success: true,
          message: 'Đã từ chối yêu cầu chuyển quyền',
          canAppeal: true,
          request: { id: req._id, status: req.status },
        };
      }

      // đồng ý
      const oldOwner = String(loc.ownerId);
      loc.ownerId = req.requesterId;
      loc.holdExpiresAt = new Date(now.getTime() + HOLD_DAYS * DAY_MS);
      await loc.save();
      req.status = RequestAccessStatus.GRANTED;
      await req.save();
      await this.notifyTransfer(loc, req, oldOwner, false);
      await this.writeLog(
        ownerId,
        'REQUEST_ACCESS_GRANT',
        loc._id,
        dto.reason,
        {
          requestId: String(req._id),
          owner: { from: oldOwner, to: String(req.requesterId) },
          holdExpiresAt: loc.holdExpiresAt,
        },
      );
      return this.transferResult(req, loc, 'Đã chuyển quyền sở hữu');
    } catch (err) {
      this.logger.error('Không thể phản hồi yêu cầu', err);
      return this.fail(500, 'Lỗi khi phản hồi yêu cầu');
    }
  }

  async verifyTakeover(id: string, userId: string, dto: VerifyTakeoverDTO) {
    try {
      // ktra như bthg
      const data = await this.loadPendingRequest(id);
      if (!data.success) return data;
      const { req } = data;
      if (String(req.requesterId) !== userId) {
        return this.fail(403, 'Chỉ người gửi yêu cầu mới được xác minh');
      }
      if (this.resolveEffectiveState(req) !== 'PENDING_TIMED_OUT') {
        return this.fail(409, 'Chưa hết hạn 3 ngày');
      }
      const loc = await this.locModel.findById(req.locationId).exec();
      if (!loc) return this.fail(404, 'Không tìm thấy địa điểm');
      if (String(loc.ownerId) !== String(req.currentOwnerId)) {
        return this.fail(409, 'Chủ địa điểm đã thay đổi');
      }
      if (!this.hasOnSiteProof(dto.evidenceFiles)) {
        return this.fail(422, 'Cần ảnh tại chỗ có vị trí và thời gian chụp');
      }

      // bắt đầu check đổi chủ 
      const now = new Date();
      const oldOwner = String(loc.ownerId);
      loc.ownerId = req.requesterId;
      loc.holdExpiresAt = new Date(now.getTime() + HOLD_DAYS * DAY_MS);
      await loc.save();

      req.evidenceFiles = dto.evidenceFiles;
      req.otpVerified = true;
      req.respondedAt = now;
      req.status = RequestAccessStatus.AUTO_GRANTED;

      await req.save();
      await this.notifyTransfer(loc, req, oldOwner, true);
      await this.writeLog(
        userId,
        'REQUEST_ACCESS_AUTO_GRANT',
        loc._id,
        'Chủ cũ không phản hồi trong 3 ngày',
        {
          requestId: String(req._id),
          owner: { from: oldOwner, to: String(req.requesterId) },
          holdExpiresAt: loc.holdExpiresAt,
        },
      );
      return this.transferResult(req, loc, 'Đã tự động chuyển quyền sở hữu');
    } catch (err) {
      this.logger.error('Không thể xác minh chuyển quyền', err);
      return this.fail(500, 'Lỗi khi xác minh chuyển quyền');
    }
  }

  // check xem có tồn tại request access pending không, nếu có thì trả về req, nếu không thì trả về fail
  private async loadPendingRequest(id: string) {
  
    if (!Types.ObjectId.isValid(id)) return this.fail(400, 'ID không hợp lệ');
    const req = await this.reqModel.findById(id).exec();
    if (!req) return this.fail(404, 'Không tìm thấy yêu cầu');
    if (req.status !== RequestAccessStatus.PENDING) {
      return this.fail(409, `Yêu cầu đang ở trạng thái ${req.status}`);
    }
    return { success: true as const, req };
  }

  private async notifyTransfer(
    loc: LocationDocument,
    req: RequestAccessDocument,
    oldOwner: string,
    auto: boolean,
  ) {
    const reason = auto ? 'chủ cũ không phản hồi' : 'chủ cũ đã đồng ý';
    await Promise.all([
      this.notification.notify({
        userId: String(req.requesterId),
        type: 'OWNERSHIP_TRANSFERRED_TO_YOU',
        title: 'Bạn đã nhận quyền quản lý',
        body: `Bạn đã nhận quyền "${loc.name}" vì ${reason}.`,
        refCollection: 'locations',
        refId: String(loc._id),
      }),
      this.notification.notify({
        userId: oldOwner,
        type: 'OWNERSHIP_TRANSFERRED_AWAY',
        title: 'Quyền quản lý đã chuyển đi',
        body: `Quyền quản lý "${loc.name}" đã chuyển cho người khác.`,
        refCollection: 'locations',
        refId: String(loc._id),
      }),
    ]);
  }

  private async writeLog(
    actorId: string,
    action: string,
    targetId: Types.ObjectId,
    reason?: string,
    diff?: Record<string, unknown>,
  ) {
    await this.logModel.create({
      actorId: new Types.ObjectId(actorId),
      action,
      targetCollection: 'locations',
      targetId,
      reason,
      diff,
    });
  }

  private hasOnSiteProof(files: VerifyTakeoverDTO['evidenceFiles']) {
    return files.some(
      (file) =>
        file.fileType === 'IMAGE' &&
        file.geo?.coordinates.length === 2 &&
        Boolean(file.capturedAt),
    );
  }

  // chuyển đổi request access sang view model
  private toView(item: unknown, userId: string) {
    const data = item as RequestAccess & Record<string, unknown>;
    const state = this.resolveEffectiveState(data);
    return {
      ...data,
      effectiveState: state,
      isExpired: state === 'PENDING_TIMED_OUT',
      canVerifyTakeover:
        this.idOf(data.requesterId) === userId && state === 'PENDING_TIMED_OUT',
    };
  }

  // check xem đc coi k, ko phải 1 trong 2 thì nghỉ
  private canView(item: unknown, userId: string) {
    const data = item as RequestAccess;
    return (
      this.idOf(data.requesterId) === userId ||
      this.idOf(data.currentOwnerId) === userId
    );
  }
   // 
  private idOf(value: unknown) {
    if (value && typeof value === 'object' && '_id' in value) {
      return String(value._id);
    }
    return String(value);
  }

  private transferResult(
    req: RequestAccessDocument,
    loc: LocationDocument,
    message: string,
  ) {
    return {
      success: true,
      message,
      request: { id: req._id, status: req.status },
      location: {
        id: loc._id,
        ownerId: loc.ownerId,
        holdExpiresAt: loc.holdExpiresAt,
      },
    };
  }

  private isDuplicate(err: unknown) {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: number }).code === 11000
    );
  }

  private fail(statusCode: number, message: string) {
    return { success: false as const, statusCode, message };
  }
}
