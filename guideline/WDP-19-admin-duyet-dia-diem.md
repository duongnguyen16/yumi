# WDP-19 — F15: Admin duyệt địa điểm — Hướng dẫn tự triển khai (manual)

> Tài liệu cá nhân, **đã gitignore** (`/guideline/`). Không commit.
> **Tự chứa:** đọc file này là code được, **không cần mở Jira hay file nghiệp vụ (SPECS/SRS)**.
> 🔧 **Model duyệt = B (đã chốt):** admin duyệt trên **`LocationRequest`** (bảng "phiếu yêu cầu duyệt"), KHÔNG sửa thẳng `Location.status`. Cách này khớp **sơ đồ ERD** (`Location_Request`) và **đồng bộ** với `ClaimRequest`/`RequestAccess` (đều là "request entity").

---

## 📖 Trước khi code — thuật ngữ & bối cảnh (đọc 1 lần)

Bạn làm **màn hình Admin duyệt địa điểm**. Khi customer/vendor gửi 1 địa điểm (hoặc sửa 1 địa điểm đã có), hệ thống tạo **1 phiếu `LocationRequest`** (status `PENDING`) chứa **bản chụp dữ liệu họ gửi** (`submittedDataSnapshot`) + các cờ nghi ngờ. Admin xem hàng đợi phiếu này rồi **Duyệt** (áp dữ liệu → địa điểm công khai) hoặc **Từ chối** (kèm lý do). Mỗi quyết định phải: (1) đổi trạng thái phiếu + địa điểm, (2) **báo** người gửi, (3) **ghi log** admin, (4) **cộng** điểm uy tín khi duyệt.

**Vì sao có 2 bảng `Location` và `LocationRequest`?**
- **`Location`** = địa điểm thật trên bản đồ (có `status`, `ownerId`, toạ độ…). Đây là "bản chính".
- **`LocationRequest`** (collection `location_requests`) = **phiếu yêu cầu duyệt** cho 1 lần gửi/sửa. Giữ `submittedDataSnapshot` (dữ liệu đề xuất), `reviewerId` (admin nào xử), `rejectReason`, `isPotentialDuplicate`, `suspectedDuplicateLocationIds[]`, `deviceDistanceMeters`. Admin **duyệt cái phiếu này**, giống hệt cách F24 duyệt `ClaimRequest`.
- Tương tự: nộp claim → `ClaimRequest`; xin chuyển quyền → `RequestAccess`; gửi/sửa địa điểm → `LocationRequest`. **1 pattern chung.**

**Thuật ngữ:**
- **trustScore / trustLevel** = điểm & hạng uy tín của user. Duyệt bài họ → +15 điểm. Bạn **không tự tính**, gọi **Trust Engine**.
- **audit log** = nhật ký "admin nào, làm gì, lên cái gì, lúc nào" (bắt buộc — quy tắc **I4**).
- **I8** = **cấm** sửa điểm trust bằng tay (`user.trustScore += ...` = fail review). Chỉ gọi Trust Engine.
- **BR-30** = user sửa 1 địa điểm đã publish → tạo `LocationRequest` mới (bản chụp thay đổi) chờ duyệt lại; **duyệt mới áp** vào bản chính.

**3 thứ dùng lại (có sẵn, KHÔNG tự build) + 1 thứ chưa có:**

| Thứ | File thật | Trạng thái | Dùng thế nào |
|---|---|---|---|
| **Trust Engine** | `apps/api/src/modules/trust-engine/` (`TrustEngineService`) | ✅ Xong | `imports:[TrustEngineModule]`, inject, gọi `recordEvent(...)` |
| **Guard chặn non-admin** | `common/guard/admin.guard.ts` (`AdminGuard`) | ✅ Có sẵn | `@UseGuards(AuthGuard('jwt-at'), AdminGuard)` |
| **Schema** | `common/schemas/location-request.ts` (`LocationRequest`) + `location.schema.ts` | ⚠️ Schema có, **chưa đăng ký** trong `SchemaModule` | Bạn thêm nó vào `SchemaModule` (Bước 0) — sync với Long (F13) |
| **Notification** | Chỉ có `notification.schema.ts`, **chưa có module** (WDP-7, Đăng) | ⏳ Chưa | Dùng **stub** ghi 1 doc `notifications`; `// TODO: depends on WDP-7` |

> ⚠️ **Phụ thuộc mềm:** việc **tạo** `LocationRequest` là của **Long (F13 — gửi địa điểm)** và **Minh (F32 — sửa địa điểm)**. Hai flow đó chưa xong → bạn **seed tay** phiếu để test (§6), và **sync với Long** về đúng cách phiếu ↔ Location liên kết (xem §9).

---

## 0. Tóm tắt task

| | |
|---|---|
| **Issue** | [WDP-19](https://fptp.atlassian.net/browse/WDP-19) — `[S2] F15 — Admin duyệt địa điểm` |
| **Quan trọng** | Cao · Sprint S2 |
| **Mô tả** | Hàng đợi `LocationRequest` (`PENDING`); **duyệt/từ chối kèm lý do**; hiện **cờ nghi trùng** + **cờ pin lệch xa thiết bị**; **cộng trust** khi duyệt |
| **Đụng tới** | `web` (Admin queue UI) + `api` (backend) |
| **Xong khi (DoD)** | (1) Duyệt → phiếu `APPROVED` + địa điểm `PUBLISHED`; (2) **báo** người gửi; (3) ghi **audit**; (4) **trust** +15 khi duyệt |

### Phân rã DoD
1. Admin xem **hàng đợi** `LocationRequest` status `PENDING` (kèm thông tin địa điểm liên kết).
2. Mỗi phiếu hiện **cờ nghi trùng** (`isPotentialDuplicate` + `suspectedDuplicateLocationIds[]`) + **cờ pin lệch xa** (`deviceDistanceMeters` lớn).
3. **Duyệt** → phiếu `APPROVED`, áp `submittedDataSnapshot` vào `Location` + `Location.status = PUBLISHED`.
4. **Từ chối** kèm **lý do** → phiếu `REJECTED` + `rejectReason`; không áp gì vào bản chính.
5. **Cộng trust** khi duyệt (gọi Trust Engine). **Từ chối KHÔNG trừ trust** (đã chốt).
6. **Báo** người gửi (Notification — tạm stub).
7. **Ghi AuditLog** mọi hành động admin (I4).
8. Ghi `reviewerId` + `reviewedAt` lên phiếu (ai xử, lúc nào) — phục vụ F28 kháng cáo.

---

## 1. Cái gì DÙNG LẠI, cái gì TỰ VIẾT

| Thành phần | Trạng thái | Bạn làm gì |
|---|---|---|
| **AdminGuard** | ✅ Có sẵn `common/guard/admin.guard.ts` | **DÙNG LẠI.** `@UseGuards(AuthGuard('jwt-at'), AdminGuard)`. Không tự dựng RolesGuard. |
| **Trust Engine (M2)** | ✅ Xong `modules/trust-engine/` | **GỌI** `recordEvent(...)`. Không tự cộng điểm (I8). |
| **LocationRequest schema** | ⚠️ Có file `location-request.ts` nhưng **chưa đăng ký** `SchemaModule` & chưa ai dùng | **Đăng ký** vào `SchemaModule` (Bước 0). Sync Long (F13). |
| **Notification (M3/WDP-7, Đăng)** | ⏳ Chưa có module | **STUB** ghi doc `notifications`. `// TODO: depends on WDP-7`. |
| **AuditLog util (WDP-39, Trung)** | ⏳ Chưa có util | Ghi thẳng collection `audit_logs`. |
| **Tạo `LocationRequest` PENDING** | ⏳ Long F13 (gửi) / Minh F32 (sửa) chưa xong | **Seed tay** để test (§6). |

> **I8 (không thương lượng):** đổi điểm trust chỉ qua `TrustEngineService.recordEvent`.

**Field của `LocationRequest`** (từ [location-request.ts](apps/api/src/common/schemas/location-request.ts)): `submittedBy`, `locationId`, `status` (`LocationRequestStatus`: `PENDING/APPROVED/REJECTED/CANCELLED`), `submittedDataSnapshot`, `imageUrls[]`, `pinLocation`, `deviceLocation`, `deviceDistanceMeters`, `isPotentialDuplicate`, `suspectedDuplicateLocationIds[]`, `reviewerId`, `reviewedAt`, `rejectReason`.

---

## 2. Convention repo (bám theo cho khớp)

1. **Service trả object, KHÔNG throw:** `{ success, statusCode?, message?, ...data }` (xem [auth.service.ts](apps/api/src/modules/auth/auth.service.ts)).
2. **Controller** map object đó sang `HttpException` (xem [auth.controller.ts](apps/api/src/modules/auth/auth.controller.ts)).
3. **Auth:** `@UseGuards(AuthGuard('jwt-at'))`, lấy user qua `req.user.userId`. `AdminGuard` tự query DB lấy role.
4. **Module:** `imports: [SchemaModule, TrustEngineModule]`. `providers: [service, AdminGuard]` — **không cần** `AtStrategy` (AuthModule đã đăng ký 'jwt-at' toàn cục).
5. **DTO:** `class-validator`. `ValidationPipe({ whitelist: true, transform: true })` đã bật global.
6. **Prefix `api`** → route thật `/api/...`. Swagger `/api/docs`.
7. Message tiếng Việt có dấu.
8. **Enum lấy từ `common.enums.ts`** (và `LocationRequestStatus` từ `location-request.ts`) — không hardcode string.

---

## 3. Quyết định kỹ thuật (chốt trước khi code)

### 3.1. Bảng chuyển trạng thái (trên `LocationRequest`, tác động sang `Location`)
| Phiếu (hiện tại) | Hành động | Phiếu (mới) | Tác động lên `Location` | Trust |
|---|---|---|---|---|
| `PENDING` | **duyệt** | `APPROVED` + `reviewerId` + `reviewedAt` | áp `submittedDataSnapshot` + `status = PUBLISHED` | `LOCATION_APPROVED` (+15) |
| `PENDING` | **từ chối** | `REJECTED` + `rejectReason` + `reviewerId` + `reviewedAt` | **không** áp; nếu là địa điểm mới → giữ ẩn/`REJECTED`; nếu là edit (BR-30) → **giữ bản cũ** | *(KHÔNG chấm trust — đã chốt)* |
| khác `PENDING` | bất kỳ | — | — | trả 409 "Phiếu không ở trạng thái PENDING" |

> **Mới vs sửa (BR-30):** phân biệt bằng trạng thái của `Location` liên kết — nếu Location đang `PUBLISHED` thì phiếu này là **edit re-approval** (duyệt → áp snapshot lên bản đang chạy); nếu chưa publish thì là **địa điểm mới**. *(Chi tiết cách F13/F32 khởi tạo phiếu là seam — xem §9.)*

### 3.2. Trust — gọi Trust Engine, KHÔNG tự tính
- **Duyệt** → `TrustEventType.LOCATION_APPROVED` → engine tự cộng **+15** cho `submittedBy`.
- **Từ chối** → ✅ **ĐÃ CHỐT: KHÔNG trừ trust.** Nhánh reject không gọi `recordEvent`. (Enum thật KHÔNG có `CONTENT_REJECTED` — đừng gọi, lỗi compile. Nội dung vi phạm xử bằng luồng report/kiểm duyệt khác.)

`TrustEventType` hợp lệ: `LOCATION_APPROVED`, `CORRECT_REPORT`, `LIVE_REVIEW`, `VIOLATING_CONTENT_REMOVED`, `FALSE_REPORT`, `ADMIN_ADJUSTMENT`.

### 3.3. Cờ hiển thị trong hàng đợi (lấy từ `LocationRequest`)
- **Nghi trùng:** `isPotentialDuplicate === true` (kèm danh sách `suspectedDuplicateLocationIds[]` để admin đối chiếu bản gốc).
- **Pin lệch xa thiết bị:** `deviceDistanceMeters > FAR_PIN_THRESHOLD` (khoảng cách giữa pin đặt và vị trí thiết bị lúc gửi). Ngưỡng chốt với team (BR-42/59).

---

## 4. Cây file

```
apps/api/src/
├─ common/schemas/schema.module.ts   (SỬA: đăng ký LocationRequest — xem Bước 0)
├─ common/contracts/
│  └─ notification.port.ts           (TẠO) interface M3 + stub — TODO swap WDP-7
├─ modules/admin/
│  ├─ dto/
│  │  ├─ list-pending-requests.dto.ts
│  │  └─ reject-request.dto.ts
│  ├─ admin-location.service.ts
│  ├─ admin-location.controller.ts
│  └─ admin.module.ts
└─ app.module.ts                     (SỬA: thêm AdminModule vào imports)
```

> **Không cần** `roles.guard.ts` (dùng `AdminGuard`) và **không cần** `trust.port.ts` (gọi `TrustEngineService` trực tiếp). Chỉ còn Notification là stub.

---

## 5. Triển khai

### Bước 0 — Đăng ký `LocationRequest` vào `SchemaModule`

`location-request.ts` đã có nhưng **chưa** nằm trong [schema.module.ts](apps/api/src/common/schemas/schema.module.ts) → chưa inject được Model. Thêm vào `MongooseModule.forFeature`:
```ts
import { LocationRequest, LocationRequestSchema } from './location-request';
// ...trong forFeature([...]):
{ name: LocationRequest.name, schema: LocationRequestSchema },
```
> ⚠️ **Sync với Long (F13):** đây là schema dùng chung cho cả flow gửi (F13) và duyệt (bạn). Báo Long để không đăng ký trùng / lệch tên collection (`location_requests`).

### Bước 1 — Notification stub (M3 chưa xong)

**`common/contracts/notification.port.ts`**
```ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from 'src/common/schemas/notification.schema';

export interface NotificationPort {
  notify(params: {
    userId: string; type: string; title: string; body: string;
    refCollection?: string; refId?: string;
  }): Promise<void>;
}
export const NOTIFICATION_PORT = Symbol('NOTIFICATION_PORT');

/** STUB TẠM — chỉ tạo in-app notification. Email/SMS + template là việc M3/WDP-7. */
@Injectable()
export class NotificationStub implements NotificationPort {
  constructor(@InjectModel(Notification.name) private model: Model<Notification>) {}
  async notify(p: {
    userId: string; type: string; title: string; body: string;
    refCollection?: string; refId?: string;
  }): Promise<void> {
    // TODO: depends on WDP-7 — thay bằng M3 service thật
    await this.model.create({ ...p, isRead: false });
  }
}
```

### Bước 2 — DTO

**`modules/admin/dto/list-pending-requests.dto.ts`**
```ts
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListPendingRequestsDTO {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;
}
```

**`modules/admin/dto/reject-request.dto.ts`**
```ts
import { IsOptional, IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class RejectRequestDTO {
  @IsString() @IsNotEmpty({ message: 'Phải nhập lý do từ chối' })
  @MinLength(5) @MaxLength(500)
  reason!: string;

  // từ chối vì trùng → kèm ID bản gốc để lưu vào lý do
  @IsOptional() @IsString()
  duplicateOfLocationId?: string;
}
```

### Bước 3 — AdminLocationService (duyệt trên `LocationRequest`)

**`modules/admin/admin-location.service.ts`**
```ts
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  LocationRequest, LocationRequestDocument, LocationRequestStatus,
} from 'src/common/schemas/location-request';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import { AuditLog } from 'src/common/schemas/audit-log.schema';
import { LocationStatus, TrustEventType } from 'src/common/schemas/common.enums';
import { TrustEngineService } from 'src/modules/trust-engine/trust-engine.service';
import { NOTIFICATION_PORT, NotificationPort } from 'src/common/contracts/notification.port';
import { ListPendingRequestsDTO } from './dto/list-pending-requests.dto';

const FAR_PIN_THRESHOLD = 50; // mét — BR-42/59, chốt số với team

@Injectable()
export class AdminLocationService {
  constructor(
    @InjectModel(LocationRequest.name) private reqModel: Model<LocationRequestDocument>,
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
    private readonly trust: TrustEngineService,
    @Inject(NOTIFICATION_PORT) private notification: NotificationPort,
  ) {}

  async getQueue(query: ListPendingRequestsDTO) {
    try {
      const page = query.page ?? 1, limit = query.limit ?? 20;
      const filter = { status: LocationRequestStatus.PENDING };

      const [items, total] = await Promise.all([
        this.reqModel.find(filter)
          .sort({ isPotentialDuplicate: -1, createdAt: 1 })
          .skip((page - 1) * limit).limit(limit)
          .populate('submittedBy', 'fullName email')
          .populate('locationId', 'name address status')
          .lean().exec(),
        this.reqModel.countDocuments(filter).exec(),
      ]);

      const data = items.map((r) => ({
        ...r,
        flags: {
          suspectedDuplicate: r.isPotentialDuplicate === true,
          suspectedDuplicateLocationIds: r.suspectedDuplicateLocationIds ?? [],
          farPin: typeof r.deviceDistanceMeters === 'number' && r.deviceDistanceMeters > FAR_PIN_THRESHOLD,
        },
      }));
      return { success: true, total, page, limit, items: data };
    } catch (error) {
      console.log('getQueue error:', error);
      return { success: false, statusCode: 500, message: 'Lỗi khi lấy hàng đợi duyệt' };
    }
  }

  approve(id: string, adminId: string) { return this.decide(id, adminId, 'APPROVE'); }
  reject(id: string, adminId: string, reason: string, dupId?: string) {
    return this.decide(id, adminId, 'REJECT', reason, dupId);
  }

  private async decide(
    requestId: string, adminId: string,
    action: 'APPROVE' | 'REJECT', reason?: string, duplicateOfLocationId?: string,
  ) {
    try {
      if (!Types.ObjectId.isValid(requestId))
        return { success: false, statusCode: 400, message: 'ID phiếu không hợp lệ' };

      const req = await this.reqModel.findById(requestId).exec();
      if (!req)
        return { success: false, statusCode: 404, message: 'Không tìm thấy phiếu duyệt' };
      if (req.status !== LocationRequestStatus.PENDING)
        return { success: false, statusCode: 409,
          message: `Phiếu đang ở trạng thái ${req.status}, không thể duyệt` };

      const location = await this.locationModel.findById(req.locationId).exec();
      if (!location)
        return { success: false, statusCode: 404, message: 'Không tìm thấy địa điểm liên kết' };
      const fromLocStatus = location.status;

      req.reviewerId = new Types.ObjectId(adminId);
      req.reviewedAt = new Date();

      if (action === 'APPROVE') {
        req.status = LocationRequestStatus.APPROVED;
        // Áp dữ liệu đề xuất vào bản chính rồi công khai.
        // SEAM (tùy F13/F32 tạo snapshot): copy field từ req.submittedDataSnapshot vào location.
        // Object.assign(location, pickAllowedFields(req.submittedDataSnapshot));
        location.status = LocationStatus.PUBLISHED;
        location.rejectionReason = undefined;
      } else {
        req.status = LocationRequestStatus.REJECTED;
        req.rejectReason = duplicateOfLocationId
          ? `${reason} (trùng với địa điểm ${duplicateOfLocationId})`
          : reason ?? null;
        // Không áp snapshot. Địa điểm mới → để REJECTED; edit (Location đang PUBLISHED) → giữ nguyên bản cũ.
        if (location.status !== LocationStatus.PUBLISHED) {
          location.status = LocationStatus.REJECTED;
          location.rejectionReason = req.rejectReason ?? undefined;
        }
      }

      await req.save();
      await location.save();

      // (1) Trust — CHỈ khi duyệt (I8). Từ chối KHÔNG trừ trust (đã chốt) → không gọi recordEvent.
      if (action === 'APPROVE') {
        await this.trust.recordEvent({
          userId: String(req.submittedBy),
          type: TrustEventType.LOCATION_APPROVED,
          reason: 'Địa điểm được duyệt',
          refCollection: 'location_requests', refId: String(req._id),
        });
      }

      // (2) Notification — stub M3
      await this.notification.notify({
        userId: String(req.submittedBy),
        type: action === 'APPROVE' ? 'LOCATION_APPROVED' : 'LOCATION_REJECTED',
        title: action === 'APPROVE' ? 'Địa điểm của bạn đã được duyệt' : 'Địa điểm của bạn bị từ chối',
        body: action === 'APPROVE'
          ? `"${location.name}" đã được công khai.`
          : `"${location.name}" bị từ chối. Lý do: ${reason}`,
        refCollection: 'location_requests', refId: String(req._id),
      });

      // (3) Audit (I4)
      await this.auditLogModel.create({
        actorId: new Types.ObjectId(adminId),
        action: action === 'APPROVE' ? 'LOCATION_APPROVE' : 'LOCATION_REJECT',
        targetCollection: 'location_requests', targetId: req._id,
        reason,
        diff: {
          requestStatus: { from: LocationRequestStatus.PENDING, to: req.status },
          locationStatus: { from: fromLocStatus, to: location.status },
        },
      });

      return { success: true,
        message: action === 'APPROVE' ? 'Đã duyệt địa điểm' : 'Đã từ chối địa điểm',
        request: { id: req._id, status: req.status },
        location: { id: location._id, status: location.status } };
    } catch (error) {
      console.log('decide error:', error);
      return { success: false, statusCode: 500, message: 'Lỗi khi xử lý duyệt địa điểm' };
    }
  }
}
```

### Bước 4 — Controller

**`modules/admin/admin-location.controller.ts`**
```ts
import {
  BadRequestException, Body, Controller, ForbiddenException, Get,
  InternalServerErrorException, NotFoundException, Param, Patch, Query, Request, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { AdminLocationService } from './admin-location.service';
import { ListPendingRequestsDTO } from './dto/list-pending-requests.dto';
import { RejectRequestDTO } from './dto/reject-request.dto';

@ApiTags('admin-location-requests')
@ApiBearerAuth()
@Controller('admin/location-requests')
@UseGuards(AuthGuard('jwt-at'), AdminGuard)   // chỉ ADMIN qua được
export class AdminLocationController {
  constructor(private readonly service: AdminLocationService) {}

  @Get('queue')
  async getQueue(@Query() query: ListPendingRequestsDTO) {
    const r = await this.service.getQueue(query);
    if (!r.success) throw new InternalServerErrorException(r.message);
    return r;
  }

  @Patch(':id/approve')
  async approve(@Param('id') id: string, @Request() req: any) {
    return this.handle(await this.service.approve(id, req.user.userId));
  }

  @Patch(':id/reject')
  async reject(@Param('id') id: string, @Body() body: RejectRequestDTO, @Request() req: any) {
    return this.handle(
      await this.service.reject(id, req.user.userId, body.reason, body.duplicateOfLocationId),
    );
  }

  private handle(r: any) {
    if (!r.success) {
      if (r.statusCode === 400) throw new BadRequestException(r.message);
      if (r.statusCode === 404) throw new NotFoundException(r.message);
      if (r.statusCode === 409) throw new ForbiddenException(r.message);
      throw new InternalServerErrorException(r.message);
    }
    return r;
  }
}
```

### Bước 5 — Module + nối AppModule

**`modules/admin/admin.module.ts`**
```ts
import { Module } from '@nestjs/common';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { TrustEngineModule } from 'src/modules/trust-engine/trust-engine.module';
import { NOTIFICATION_PORT, NotificationStub } from 'src/common/contracts/notification.port';
import { AdminLocationController } from './admin-location.controller';
import { AdminLocationService } from './admin-location.service';

@Module({
  imports: [SchemaModule, TrustEngineModule],
  controllers: [AdminLocationController],
  providers: [
    AdminLocationService,
    AdminGuard,
    { provide: NOTIFICATION_PORT, useClass: NotificationStub }, // TODO: swap M3 khi WDP-7 xong
  ],
})
export class AdminModule {}
```

**Sửa `app.module.ts`** — `imports` hiện có `AuthModule, SchemaModule, LocationModule, TrustEngineModule, AdminCategoryModule`:
```ts
import { AdminModule } from './modules/admin/admin.module';
imports: [ /* ... */ AdminCategoryModule, AdminModule ],
```

---

## 6. Seed data để test (không cần Long/Minh)

Tạo **1 `Location`** (draft) + **1 `LocationRequest`** PENDING trỏ vào nó. Dùng MongoDB Compass/mongosh:
```js
// 1) location (bản chính, chưa publish)
db.locations.insertOne({
  submittedBy: ObjectId('<userId>'), name: 'Quán Cà Phê Test',
  description: 'Địa điểm test luồng duyệt', address: '123 Test',
  geo: { type: 'Point', coordinates: [105.84, 21.02] },
  source: 'CUSTOMER', categoryId: ObjectId('<categoryId>'),
  status: 'SUBMITTED',
});
// 2) location_requests (phiếu chờ duyệt) — lấy _id location vừa tạo
db.location_requests.insertOne({
  submittedBy: ObjectId('<userId>'), locationId: ObjectId('<locationId>'),
  status: 'PENDING',
  submittedDataSnapshot: { name: 'Quán Cà Phê Test', address: '123 Test' },
  imageUrls: [], isPotentialDuplicate: true,     // cờ nghi trùng
  suspectedDuplicateLocationIds: [], deviceDistanceMeters: 120, // > 50 → cờ pin xa
});
```
Tạo **1 user role `ADMIN`** để login lấy token. Test xong xoá seed.

---

## 7. Chạy & test

```bash
# từ thư mục gốc repo (repo đã chuyển pnpm → npm)
npm run start:dev --workspace=api
# hoặc: npm run dev:api
```
1. Swagger `http://localhost:3000/api/docs` → login ADMIN → Authorize.
2. Test:

| API | Kỳ vọng |
|---|---|
| `GET /api/admin/location-requests/queue` | list phiếu PENDING + `flags.suspectedDuplicate` / `flags.farPin` |
| `PATCH .../:id/approve` | phiếu → `APPROVED`, location → `PUBLISHED`, `reviewerId` set |
| `PATCH .../:id/reject` `{reason}` | phiếu → `REJECTED` + `rejectReason` |
| reject `{reason, duplicateOfLocationId}` | reason kèm link gốc |
| approve/reject phiếu đã xử | 403/409 |
| token CUSTOMER | 403 · không token | 401 |

3. Kiểm DB: sau **duyệt** → `users.<submittedBy>.trustScore` +15 + 1 doc `trust_events`; `notifications` có doc (stub); `audit_logs` có doc.

---

## 8. Checklist nghiệm thu

- [ ] `LocationRequest` đã đăng ký trong `SchemaModule` (Bước 0)
- [ ] Queue hiện phiếu `PENDING` + cờ **nghi trùng** (`isPotentialDuplicate`) + cờ **pin xa** (`deviceDistanceMeters`)
- [ ] Duyệt → phiếu `APPROVED` + `reviewerId`/`reviewedAt` + location `PUBLISHED`
- [ ] Từ chối **bắt buộc lý do** → phiếu `REJECTED` + `rejectReason`; reject-trùng kèm link gốc
- [ ] Duyệt gọi `recordEvent(LOCATION_APPROVED)` → điểm submitter +15 (I8). **Từ chối KHÔNG chấm trust**
- [ ] **Báo** người gửi (stub) · Audit log ghi lại (I4)
- [ ] Chỉ ADMIN qua `AdminGuard`; CUSTOMER/VENDOR 403; no-token 401
- [ ] Không duyệt lại phiếu đã xử

---

## 9. Việc cần chốt với team

1. **Sync Long (F13 — gửi địa điểm) & Minh (F32 — sửa):** chốt **ai đăng ký `LocationRequest` vào `SchemaModule`** (đừng trùng) và **hợp đồng dữ liệu `submittedDataSnapshot`** (những field nào, để bạn biết áp gì vào `Location` lúc duyệt). Chốt luôn: địa điểm **mới** khởi tạo `Location` ở status nào (SUBMITTED?) trước khi có phiếu.
2. **BR-30 (edit re-approval):** khi duyệt phiếu của 1 địa điểm đang `PUBLISHED` → áp snapshot lên bản đang chạy; khi từ chối → giữ bản cũ. Xác nhận cơ chế với Minh (F32).
3. **Trust khi từ chối — ✅ ĐÃ CHỐT: KHÔNG trừ trust** (chỉ cộng khi duyệt). Nội dung vi phạm xử bằng report/ban.
4. **Sync Notification (Đăng, WDP-7):** chốt `notify(...)` type + payload; stub hiện chỉ in-app.
5. **Ngưỡng pin-xa (BR-42/59):** chốt số mét cho `FAR_PIN_THRESHOLD` (so trên `deviceDistanceMeters`).
6. **Báo Trung (WDP-39 audit):** đang ghi `audit_logs` trực tiếp; sau gộp về util chung.
7. **UI Admin queue** ở `web` (Next.js 15 + MUI) — bàn giao contract API trên nếu bạn không làm web.

---

## 10. Thứ tự code (commit nhỏ)

1. Đăng ký `LocationRequest` vào `SchemaModule` (Bước 0).
2. Notification stub.
3. Seed 1 location + 1 location_request PENDING.
4. `getQueue` + controller `GET queue` → test list + flags.
5. approve → test phiếu APPROVED + location PUBLISHED + trust +15.
6. reject (+ duplicate link) → test phiếu REJECTED + reason.
7. Gắn `notify` + audit vào `decide()`.
8. Chạy full checklist §8 → PR → Done.

```bash
git checkout -b WDP-19-admin-duyet-dia-diem
git push -u origin WDP-19-admin-duyet-dia-diem
```
> KHÔNG commit `/guideline` (đã gitignore) và record seed tạm.
