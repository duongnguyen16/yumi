# WDP-28 — F24: Admin xét claim (Admin review claim) — Hướng dẫn tự triển khai (manual)

> Tài liệu cá nhân, **đã gitignore** (`/guideline/`). Không commit.
> **Tự chứa:** đọc file này là code được, **không cần mở Jira hay file nghiệp vụ (SPECS/SRS)**.
> Mục tiêu: tự code WDP-28 từ đầu đến cuối, đúng convention repo.
> Anh em sinh đôi với [WDP-19](WDP-19-admin-duyet-dia-diem.md) (cùng là luồng "Admin quyết định"): dùng lại **`AdminGuard`** (đã có sẵn) + **Notification stub** (đã tạo ở WDP-19), và **gọi thẳng** `TrustEngineService.recordEvent(...)`. KHÔNG dựng lại guard/port.

---

## 📖 Trước khi code — thuật ngữ & bối cảnh (đọc 1 lần)

Bạn đang làm **màn hình Admin xét "claim"** (yêu cầu nhận sở hữu địa điểm). Một vendor gửi yêu cầu "địa điểm này là của tôi" kèm bằng chứng → yêu cầu đó (`ClaimRequest`) nằm ở trạng thái chờ (`PENDING`) → Admin xem hàng đợi rồi chọn 1 trong 3: **Duyệt** (gán vendor làm chủ địa điểm), **Từ chối** (giữ nguyên chủ cũ, vendor có thể gửi lại sau), hoặc **Yêu cầu bổ sung bằng chứng** (giữ nguyên PENDING, nhắn vendor gửi thêm). Mỗi quyết định phải: (1) đổi trạng thái claim / gán owner, (2) **báo** cho vendor, (3) **ghi log** admin đã làm gì, (4) **cộng/trừ điểm uy tín** cho vendor.

**Thuật ngữ sẽ gặp:**
- **claim** = yêu cầu nhận sở hữu một địa điểm đã tồn tại trên bản đồ. Lưu ở collection `claim_requests`.
- **OTP đối chiếu** (`otpVerified`) = vendor đã nhập đúng mã OTP hệ thống gửi để chứng minh kiểm soát địa điểm. Cờ `true/false` trên claim.
- **on-site proof** (bằng chứng tại chỗ) = ảnh/tệp vendor chụp **tại địa điểm**, kèm toạ độ (`geo`) và thời điểm chụp (`capturedAt`). Nằm trong `claim.evidenceFiles[]`.
- **gán owner** = ghi `location.ownerId = vendorId`. Đây là **chỗ DUY NHẤT** của F24 gán chủ sở hữu.
- **badge Verified** = **KHÔNG có field riêng**. Được **suy ra** từ `location.ownerId != null` (có chủ ⇒ hiển thị "Verified"). Vậy chỉ cần set `ownerId` là badge tự lên — đừng thêm cột mới (xem §3.2).
- **EF20.1** = tình huống ngoại lệ: lúc Admin bấm duyệt mà địa điểm **đã có chủ là người KHÁC** → **không ghi đè** → reject claim và hướng Vendor sang **RequestAccess**. Dispute chỉ được mở sau khi RequestAccess bị owner từ chối và Vendor appeal.
- **BR-45** = luật: **chỉ được duyệt** claim khi `otpVerified === true` **và** có on-site proof khớp (geo + thời điểm).
- **BR-46** = luật: **từ chối KHÔNG ghi đè** — giữ nguyên chủ hiện tại, và **giữ lại** bản claim cũ (cho audit/kháng cáo); vendor gửi claim mới là 1 document khác.

**Các "mã luật" bất biến (invariant) — không được phá:**
- **I4** = mọi hành động của Admin phải **ghi audit log**.
- **I5** = owner chỉ được gán qua đường duyệt/transfer chính thống (F24 ở đây là 1 trong số đó); **1 location = 1 owner**.
- **I8** = mọi thay đổi điểm trust phải **đi qua Trust Engine** (`recordEvent`); **cấm** viết tay `user.trustScore += ...`.

**3 thứ bạn sẽ dùng lại (đã có sẵn trong repo, KHÔNG tự build):**

| Thứ | File thật | Dùng thế nào |
|---|---|---|
| **Trust Engine** (cộng/trừ điểm) | `apps/api/src/modules/trust-engine/` (`TrustEngineModule`, `TrustEngineService`) | `imports: [TrustEngineModule]` → inject `TrustEngineService` → gọi `recordEvent(...)`. Engine tự tính điểm & hạng, tự chống ghi trùng. **Không** còn port/stub trust. |
| **Guard chặn non-admin** | `apps/api/src/common/guard/admin.guard.ts` (`AdminGuard`) | `@UseGuards(AuthGuard('jwt-at'), AdminGuard)`. Nó tự load user, chặn ai không phải `ADMIN` (401/403). Module `admin-category` đang dùng chính guard này. |
| **Schema (data contract)** | `apps/api/src/common/schemas/` | Field cần đọc đã có sẵn ở `claim-request.schema.ts` / `location.schema.ts`. Enum lấy từ `common.enums.ts`. |

**1 thứ CHƯA có → tạm stub:** **Notification** (module gửi thông báo, ticket WDP-7 của Đăng) **chưa xong**. Dùng lại **`NotificationStub` / `NOTIFICATION_PORT`** đã tạo ở WDP-19 (`common/contracts/notification.port.ts`); khi WDP-7 xong chỉ thay provider. Gắn `// TODO: depends on WDP-7` ở seam.

---

## 0. Tóm tắt task

| | |
|---|---|
| **Issue** | [WDP-28](https://fptp.atlassian.net/browse/WDP-28) — `[S3] F24 — Admin xét claim` |
| **Quan trọng** | Cao · Sprint S3 · Ownership · HF-3 |
| **Mô tả** | Admin **đối chiếu OTP + bằng chứng on-site** của 1 `ClaimRequest` (PENDING); **duyệt → gán owner + "badge Verified"**; **từ chối → tạo claim mới mà KHÔNG ghi đè**; cho phép **yêu cầu bổ sung bằng chứng** |
| **Đụng tới** | `web` (Admin claim queue UI) + `api` (backend) |
| **DoD** | (1) Duyệt **gán owner**; (2) Từ chối **mở claim mới** (bản cũ giữ nguyên); (3) ghi **audit** (I4); (4) **notify** người gửi (M3) |

### Phân rã DoD
1. Admin xem **hàng đợi** `ClaimRequest` status `PENDING`, kèm cờ đối chiếu (`otpVerified`, proof có geo/capturedAt, có license?).
2. **Approve** (BR-45 — CHỈ khi `otpVerified === true` + proof khớp) → set `location.ownerId = claim.vendorId`, claim `status = APPROVED`, điền `adminDecision{decidedBy, reason, decidedAt}`.
3. **Reject** (BR-46) → claim `status = REJECTED` + lý do; **KHÔNG đụng owner hiện tại**; bản claim bị từ chối **được giữ lại** (claim sau là document MỚI).
4. **Request more evidence** → **giữ PENDING** + notify người gửi bổ sung (xem §3.3 — KHÔNG có enum riêng).
5. **EF20.1** — nếu lúc duyệt `location.ownerId` đã là **người khác** → KHÔNG ghi đè → claim `REJECTED`, trả `redirectToRequestAccess: true`; **không tạo Dispute trực tiếp**.
6. **Notify** người gửi claim (Notification — tạm stub, WDP-7).
7. **Cập nhật trust** khi approve (gọi `TrustEngineService.recordEvent` — KHÔNG tự cộng/trừ điểm, I8). Từ chối: mặc định **không** chấm trust (xem §3.6).
8. **Ghi AuditLog** mọi hành động admin (I4 / BR-43).

---

## 1. Cái gì DÙNG LẠI, cái gì TỰ VIẾT

| Thành phần | Trạng thái trong repo | Bạn làm gì |
|---|---|---|
| **AdminGuard** (chặn non-admin) | ✅ Có sẵn `common/guard/admin.guard.ts` (module `admin-category` đang dùng) | **DÙNG LẠI.** `@UseGuards(AuthGuard('jwt-at'), AdminGuard)`; thêm `AdminGuard` vào `providers`. **Không** tự dựng RolesGuard / `@Roles()`. |
| **Trust Engine (M2)** | ✅ Xong `modules/trust-engine/` — `TrustEngineService.recordEvent(...)` | **GỌI trực tiếp.** `imports:[SchemaModule, TrustEngineModule]`, inject `TrustEngineService`. **Không** còn port/stub trust; **không** tự cộng điểm (I8). |
| **Notification (M3 / WDP-7, Đăng)** | ⏳ Chưa có module (chỉ có `notification.schema.ts`) | **STUB** — dùng lại `NotificationStub` / `NOTIFICATION_PORT` đã tạo ở WDP-19 (`common/contracts/notification.port.ts`). `// TODO: depends on WDP-7`. |
| **AuditLog util (WDP-39, Trung)** | ⏳ Chưa có util chung | Ghi thẳng collection `audit_logs` (model `AuditLog`). **Báo Trung** để sau gộp về util chung. |
| **RequestAccess (EF20.1)** | **F26 / [WDP-30](https://fptp.atlassian.net/browse/WDP-30)** | Khi location đã có owner khác, reject claim và trả cờ `redirectToRequestAccess`. **Không tạo Dispute từ Claim**; Dispute thuộc nhánh RequestAccess bị từ chối + appeal được chấp nhận. |
| **Record `ClaimRequest` PENDING** | ⏳ WDP-27/F23 (cũng Dương) chưa xong | **Seed tay** để test (§6). |

> **I8 (không thương lượng):** thay đổi điểm trust chỉ qua `TrustEngineService.recordEvent`. Viết `user.trustScore += …` trong service = **fail review**.

> **I5:** owner CHỈ được gán qua đường duyệt/transfer (đây là chỗ duy nhất F24 gán owner). 1 location = 1 owner.

> **Protocol khi dependency chưa xong:** stub interface theo contract, code phần của mình, đánh dấu seam `// TODO: depends on Fxx`. **Không tự bịa logic ticket khác.**

**Còn lại bạn không bị chặn:** data contract đã khóa ở WDP-5 (Done). Mọi field cần đọc đã có sẵn trong [claim-request.schema.ts](apps/api/src/common/schemas/claim-request.schema.ts) (`vendorId`, `locationId`, `evidenceFiles`, `licenseUrl`, `otpVerified`, `otpVerifiedAt`, `status`, `adminDecision`) và [location.schema.ts](apps/api/src/common/schemas/location.schema.ts) (`ownerId`). **Record `ClaimRequest` PENDING chưa có** (WDP-27/F23 — cũng Dương — chưa xong) → **seed tay** để test (§6).

---

## 2. Convention repo (bám theo cho khớp)

1. **Service trả object, KHÔNG throw:** `{ success, statusCode?, message?, ...data }` (xem [auth.service.ts](apps/api/src/modules/auth/auth.service.ts), [location.service.ts](apps/api/src/modules/locations/location.service.ts)).
2. **Controller** map object đó sang `HttpException` (xem [auth.controller.ts](apps/api/src/modules/auth/auth.controller.ts)).
3. **Auth:** `@UseGuards(AuthGuard('jwt-at'), AdminGuard)`, lấy user qua `req.user.userId`. Token **chỉ có `userId`** ([at.strategy.ts](apps/api/src/common/guard/at.strategy.ts)) → `AdminGuard` tự query DB lấy role, chặn ai không phải ADMIN. Bạn không cần lo. (Không cần thêm `AtStrategy` vào providers — `AuthModule` đã đăng ký chiến lược `'jwt-at'` toàn cục.)
4. **Module:** `imports: [SchemaModule, TrustEngineModule]` để có Model (gồm `ClaimRequest`, `Location`, `AuditLog`, `Notification`, `User`) và `TrustEngineService`; providers gồm service + `AdminGuard` (+ Notification stub).
5. **DTO:** `class-validator`. `ValidationPipe({ whitelist: true, transform: true })` đã bật global ([main.ts](apps/api/src/main.ts)).
6. **Prefix `api`** → route thật là `/api/...`. Swagger `/api/docs` (đã bật `addBearerAuth`).
7. Message tiếng Việt có dấu.
8. **Enum lấy từ `common.enums.ts`** — không hardcode magic string. Dùng `ClaimRequestStatus`, `TrustEventType`.

---

## 3. Quyết định kỹ thuật (chốt trước khi code)

### 3.1. Bảng chuyển trạng thái của `ClaimRequest`
| Hiện tại | Hành động | Mới | Trust (gọi Trust Engine) | Tác động phụ |
|---|---|---|---|---|
| `PENDING` | **approve** (OTP verified + proof khớp + chưa có owner khác) | `APPROVED` | `LOCATION_APPROVED` (+15) | set `location.ownerId = claim.vendorId`; điền `adminDecision`; notify "approved"; audit |
| `PENDING` | **approve** nhưng `location.ownerId` đã là người KHÁC | `REJECTED` | *(không)* | **KHÔNG gán owner** → trả `redirectToRequestAccess: true`; notify; audit `CLAIM_REDIRECT_TO_REQUEST_ACCESS` |
| `PENDING` | **reject** | `REJECTED` | *(KHÔNG chấm trust — đã chốt, xem §3.6)* | điền `adminDecision.reason`; **KHÔNG đụng owner**; notify "rejected"; audit. Bản cũ giữ nguyên |
| `PENDING` | **request more evidence** | *(giữ `PENDING`)* | *(không)* | notify người gửi bổ sung; audit `CLAIM_REQUEST_EVIDENCE`. **Không đổi status** |
| khác PENDING | bất kỳ | — | — | trả 409 "Claim không ở trạng thái PENDING" |

### 3.2. "Badge Verified" = `ownerId != null` (KHÔNG có field riêng)
> ⚠️ **Không bịa field.** Đọc kỹ [location.schema.ts](apps/api/src/common/schemas/location.schema.ts): **không có** field `verified`/`isVerified`. Badge "Verified" hiển thị ngoài UI được **suy ra** từ việc location có owner (`ownerId != null` → địa điểm "đã có chủ / đã xác minh"). Vậy **approve chỉ cần set `location.ownerId`** là badge tự lên. Đừng thêm cột mới — sẽ lệch data contract (WDP-5).

### 3.3. "Request more evidence" — KHÔNG có enum riêng → chọn phương án CHẶT hơn
> `ClaimRequestStatus` chỉ có `PENDING / APPROVED / REJECTED / RELEASED / REVOKED` ([common.enums.ts](apps/api/src/common/schemas/common.enums.ts)). **Không có** trạng thái "cần bổ sung". Nguyên tắc chung khi gặp luật mơ hồ → chọn phương án **chặt/an toàn hơn**: **giữ claim ở `PENDING`** và chỉ **notify** người gửi bổ sung — KHÔNG tự đẻ enum, KHÔNG chuyển sang `REJECTED` (vì reject sẽ **đóng claim** và mở lại slot PENDING cho người khác, không đúng ý "chờ bổ sung").
>
> Trong code để lại:
> ```ts
> // RULE-AMBIGUOUS: ClaimRequestStatus chưa có trạng thái "NEEDS_MORE_EVIDENCE".
> // Chọn phương án chặt: giữ PENDING + notify. Nếu team muốn state riêng,
> // bổ sung enum (vd NEEDS_MORE_EVIDENCE) ở common.enums.ts rồi sửa nhánh này.
> ```

### 3.4. Reject KHÔNG ghi đè (BR-46) + unique partial index
> Index `{ locationId, status }` **unique** với `partialFilterExpression: { status: PENDING }` ([claim-request.schema.ts](apps/api/src/common/schemas/claim-request.schema.ts) dòng 62–68) → **chỉ 1 claim PENDING / location** (I6). Khi reject, ta **đổi status → REJECTED** (rời khỏi partial index) ⇒ slot PENDING mở lại ⇒ vendor có thể tạo **claim PENDING MỚI** sau này (là document khác, do WDP-27 tạo). **Tuyệt đối không** ghi đè / xoá bản claim cũ — phải giữ cho audit/appeal (F28). Đây chính là tinh thần "reject → new claim without overwrite".

### 3.5. Có giấy phép (license) → fast-track
> Có `licenseUrl` ⇒ thêm 1 yếu tố tin cậy → trong response queue đánh cờ `hasLicense: true` để admin **ưu tiên duyệt nhanh**. Nhưng **license KHÔNG thay thế** OTP+proof: BR-45 vẫn bắt buộc `otpVerified === true` + on-site proof khớp mới được approve. (Giấy phép là **tùy chọn**; điều kiện xác minh cốt lõi vẫn là kiểm soát thực địa qua OTP + ảnh tại chỗ.)

### 3.6. Trust — gọi Trust Engine, KHÔNG tự tính
Engine tự áp điểm theo `TrustEventType`, bạn chỉ truyền đúng loại sự kiện (KHÔNG điền số điểm):
- **Approve** → `TrustEventType.LOCATION_APPROVED` → engine tự cộng **+15**.
- **Reject** → ✅ **ĐÃ CHỐT (giống từ chối địa điểm ở WDP-19): từ chối KHÔNG trừ trust.** Nhánh reject **không** gọi `recordEvent`. Claim **gian lận/giả mạo** thì xử bằng luồng report + đề xuất ban (F31/WDP-35), **không** trừ trust ở hành động reject này.

> ℹ️ Enum thật **KHÔNG có** `CONTENT_REJECTED` (tên cũ, đã bỏ) — đừng gọi (lỗi compile). Reject = không gọi `recordEvent` gì cả.

`TrustEventType` hợp lệ (từ `common.enums.ts`): `LOCATION_APPROVED`, `CORRECT_REPORT`, `LIVE_REVIEW`, `VIOLATING_CONTENT_REMOVED`, `FALSE_REPORT`, `ADMIN_ADJUSTMENT`.

---

## 4. Cây file

```
apps/api/src/
├─ common/
│  ├─ guard/admin.guard.ts              (ĐÃ CÓ SẴN — dùng lại)
│  └─ contracts/
│     └─ notification.port.ts           (ĐÃ CÓ — WDP-19: NOTIFICATION_PORT + NotificationStub)
├─ modules/admin-claims/
│  ├─ dto/
│  │  ├─ list-pending-claims.dto.ts     (TẠO)
│  │  ├─ reject-claim.dto.ts            (TẠO)
│  │  └─ request-evidence.dto.ts        (TẠO)
│  ├─ admin-claim.service.ts            (TẠO)
│  ├─ admin-claim.controller.ts         (TẠO)
│  └─ admin-claim.module.ts             (TẠO)
└─ app.module.ts                        (SỬA: thêm AdminClaimModule)
```

> **Không cần** tạo `roles.guard.ts`/`roles.decorator.ts` (dùng `AdminGuard` có sẵn) và **không cần** `trust.port.ts` (Trust Engine đã thật, gọi trực tiếp `TrustEngineService`). Chỉ còn Notification là stub (tái dùng port từ WDP-19).
> Khi WDP-7 (Notification) xong: import module M3 thật, đổi provider, service của bạn không phải sửa.
> Đặt module riêng `admin-claims` (không nhét vào `admin` của WDP-19) để tách domain claim khỏi domain location — dễ review, dễ tách PR. Nếu nhóm bạn muốn gộp 1 `AdminModule` chung thì chỉ cần thêm controller/service vào module đó; logic giữ nguyên.

---

## 5. Triển khai

> `AdminGuard` đã có sẵn trong repo — không phải tạo. **Notification stub** (`notification.port.ts`) đã làm ở **WDP-19 §5 Bước 1**; mở lại guide đó nếu chưa có. Trust Engine gọi **trực tiếp** `TrustEngineService.recordEvent(...)`, không còn port. Dưới đây chỉ là phần riêng của WDP-28.

### Bước 1 — DTO

**`modules/admin-claims/dto/list-pending-claims.dto.ts`**
```ts
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ClaimRequestStatus } from 'src/common/schemas/common.enums';

export class ListPendingClaimsDTO {
  // Mặc định queue chỉ lấy PENDING; cho phép lọc thêm cho mục đích tra cứu.
  @IsOptional()
  @IsIn([
    ClaimRequestStatus.PENDING,
    ClaimRequestStatus.APPROVED,
    ClaimRequestStatus.REJECTED,
  ])
  status?: ClaimRequestStatus;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;
}
```

**`modules/admin-claims/dto/reject-claim.dto.ts`**
```ts
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RejectClaimDTO {
  @IsString()
  @IsNotEmpty({ message: 'Phải nhập lý do từ chối' })
  @MinLength(5) @MaxLength(500)
  reason!: string;
}
```

**`modules/admin-claims/dto/request-evidence.dto.ts`**
```ts
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RequestEvidenceDTO {
  // Nội dung admin yêu cầu bổ sung (vd "Ảnh biển hiệu mờ, chụp lại rõ mã + ngày giờ").
  @IsString()
  @IsNotEmpty({ message: 'Phải nhập nội dung yêu cầu bổ sung' })
  @MinLength(5) @MaxLength(500)
  message!: string;
}
```

---

### Bước 2 — AdminClaimService (gọi M2/M3; redirect RequestAccess khi EF20.1)

**`modules/admin-claims/admin-claim.service.ts`**
```ts
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ClaimRequest,
  ClaimRequestDocument,
} from 'src/common/schemas/claim-request.schema';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import { AuditLog } from 'src/common/schemas/audit-log.schema';
import {
  ClaimRequestStatus,
  TrustEventType,
} from 'src/common/schemas/common.enums';
import { TrustEngineService } from 'src/modules/trust-engine/trust-engine.service';
import {
  NOTIFICATION_PORT,
  NotificationPort,
} from 'src/common/contracts/notification.port';
import { ListPendingClaimsDTO } from './dto/list-pending-claims.dto';

@Injectable()
export class AdminClaimService {
  constructor(
    @InjectModel(ClaimRequest.name)
    private claimModel: Model<ClaimRequestDocument>,
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
    private readonly trust: TrustEngineService,
    @Inject(NOTIFICATION_PORT) private notification: NotificationPort,
  ) {}

  // ───────────────────────── QUEUE ─────────────────────────
  async getQueue(query: ListPendingClaimsDTO) {
    try {
      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const filter = { status: query.status ?? ClaimRequestStatus.PENDING };

      const [items, total] = await Promise.all([
        this.claimModel
          .find(filter)
          .sort({ otpVerified: -1, createdAt: 1 }) // OTP-verified + cũ nhất lên trước
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('vendorId', 'fullName email phone')
          .populate('locationId', 'name address ownerId status')
          .lean()
          .exec(),
        this.claimModel.countDocuments(filter).exec(),
      ]);

      // Cờ đối chiếu để admin xét nhanh (BR-45 / fast-track license).
      const data = items.map((c: any) => {
        const proofs = Array.isArray(c.evidenceFiles) ? c.evidenceFiles : [];
        const hasGeoProof = proofs.some(
          (f: any) => f?.geo?.coordinates?.length === 2 && f?.capturedAt,
        );
        return {
          ...c,
          flags: {
            otpVerified: c.otpVerified === true,
            hasOnSiteProof: hasGeoProof, // proof có geo + capturedAt
            hasLicense: !!c.licenseUrl, // có → fast-track (BR-15)
            // approve hợp lệ khi: OTP verified + có proof geo/time (BR-45)
            eligibleForApprove: c.otpVerified === true && hasGeoProof,
          },
        };
      });

      return { success: true, total, page, limit, items: data };
    } catch (error) {
      console.log('getQueue (claims) error:', error);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi lấy hàng đợi claim',
      };
    }
  }

  // ──────────────────────── APPROVE ────────────────────────
  async approve(claimId: string, adminId: string, reason?: string) {
    try {
      const ctx = await this.loadPendingClaim(claimId);
      if (!ctx.success) return ctx;
      const { claim, location } = ctx;

      // BR-45: CHỈ approve khi OTP verified + bằng chứng on-site khớp.
      const hasGeoProof = (claim.evidenceFiles ?? []).some(
        (f) => f?.geo?.coordinates?.length === 2 && !!f?.capturedAt,
      );
      if (claim.otpVerified !== true || !hasGeoProof) {
        return {
          success: false,
          statusCode: 422,
          message:
            'Chưa đủ điều kiện duyệt: cần OTP đã xác minh và bằng chứng on-site (geo + thời điểm chụp).',
        };
      }

      // EF20.1: location đã có owner khác thì không ghi đè.
      // Claim bị reject và client được hướng sang RequestAccess.
      if (
        location.ownerId &&
        String(location.ownerId) !== String(claim.vendorId)
      ) {
        return this.redirectToRequestAccess(claim, location, adminId);
      }

      // (Đã đúng owner sẵn) hoặc chưa có owner → gán owner (I5/I6 — chỗ DUY NHẤT F24 gán).
      location.ownerId = claim.vendorId as Types.ObjectId;
      await location.save();

      claim.status = ClaimRequestStatus.APPROVED;
      claim.adminDecision = {
        decidedBy: new Types.ObjectId(adminId),
        reason: reason ?? 'Đủ OTP + bằng chứng on-site',
        decidedAt: new Date(),
      } as any;
      await claim.save();

      // Trust — GỌI Trust Engine, engine tự tính điểm (I8).
      await this.trust.recordEvent({
        userId: String(claim.vendorId),
        type: TrustEventType.LOCATION_APPROVED,
        reason: 'Claim địa điểm được duyệt',
        refCollection: 'claim_requests',
        refId: String(claim._id),
      });

      // Notification (M3) — GỌI.
      await this.notification.notify({
        userId: String(claim.vendorId),
        type: 'CLAIM_APPROVED',
        title: 'Yêu cầu sở hữu địa điểm đã được duyệt',
        body: `Bạn đã trở thành chủ sở hữu của "${location.name}".`,
        refCollection: 'claim_requests',
        refId: String(claim._id),
      });

      // Audit (I4 / BR-43).
      await this.writeAudit(adminId, 'CLAIM_APPROVE', claim._id, reason, {
        claimStatus: { from: ClaimRequestStatus.PENDING, to: claim.status },
        ownerId: { from: null, to: String(claim.vendorId) },
        locationId: String(location._id),
      });

      return {
        success: true,
        message: 'Đã duyệt claim và gán chủ sở hữu',
        claim: { id: claim._id, status: claim.status },
        location: { id: location._id, ownerId: location.ownerId },
      };
    } catch (error) {
      console.log('approve claim error:', error);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi duyệt claim',
      };
    }
  }

  // ───────────────────────── REJECT ────────────────────────
  async reject(claimId: string, adminId: string, reason: string) {
    try {
      const ctx = await this.loadPendingClaim(claimId);
      if (!ctx.success) return ctx;
      const { claim, location } = ctx;

      // BR-46: reject KHÔNG ghi đè owner hiện tại; bản claim được GIỮ LẠI.
      // Chỉ đổi status → REJECTED ⇒ rời partial unique index ⇒ slot PENDING mở lại
      // cho 1 claim MỚI sau này (document khác — do WDP-27 tạo).
      claim.status = ClaimRequestStatus.REJECTED;
      claim.adminDecision = {
        decidedBy: new Types.ObjectId(adminId),
        reason,
        decidedAt: new Date(),
      } as any;
      await claim.save();
      // (KHÔNG đụng location.ownerId)

      // Trust: từ chối KHÔNG trừ trust (đã chốt, xem §3.6) → KHÔNG gọi recordEvent ở nhánh reject.
      // Claim gian lận/giả mạo: xử bằng report + đề xuất ban F31/WDP-35, không trừ trust ở đây.

      await this.notification.notify({
        userId: String(claim.vendorId),
        type: 'CLAIM_REJECTED',
        title: 'Yêu cầu sở hữu địa điểm bị từ chối',
        body: `Yêu cầu sở hữu "${location.name}" bị từ chối. Lý do: ${reason}. Bạn có thể gửi yêu cầu mới với bằng chứng đầy đủ.`,
        refCollection: 'claim_requests',
        refId: String(claim._id),
      });

      await this.writeAudit(adminId, 'CLAIM_REJECT', claim._id, reason, {
        claimStatus: { from: ClaimRequestStatus.PENDING, to: claim.status },
      });

      return {
        success: true,
        message: 'Đã từ chối claim (bản ghi được giữ lại)',
        claim: { id: claim._id, status: claim.status },
      };
    } catch (error) {
      console.log('reject claim error:', error);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi từ chối claim',
      };
    }
  }

  // ─────────────────── REQUEST MORE EVIDENCE ───────────────────
  async requestMoreEvidence(claimId: string, adminId: string, message: string) {
    try {
      const ctx = await this.loadPendingClaim(claimId);
      if (!ctx.success) return ctx;
      const { claim, location } = ctx;

      // RULE-AMBIGUOUS: ClaimRequestStatus chưa có trạng thái "NEEDS_MORE_EVIDENCE".
      // Chọn phương án chặt: GIỮ PENDING + chỉ notify; KHÔNG reject (tránh phạt trust),
      // KHÔNG tự đẻ enum. Nếu team muốn state riêng → thêm enum rồi sửa nhánh này.
      await this.notification.notify({
        userId: String(claim.vendorId),
        type: 'CLAIM_NEEDS_MORE_EVIDENCE',
        title: 'Yêu cầu bổ sung bằng chứng cho claim',
        body: `Để xét duyệt "${location.name}", vui lòng bổ sung: ${message}`,
        refCollection: 'claim_requests',
        refId: String(claim._id),
      });

      await this.writeAudit(
        adminId,
        'CLAIM_REQUEST_EVIDENCE',
        claim._id,
        message,
        { claimStatus: 'PENDING (unchanged)' },
      );

      return {
        success: true,
        message: 'Đã gửi yêu cầu bổ sung bằng chứng (claim vẫn PENDING)',
        claim: { id: claim._id, status: claim.status },
      };
    } catch (error) {
      console.log('requestMoreEvidence error:', error);
      return {
        success: false,
        statusCode: 500,
        message: 'Lỗi khi gửi yêu cầu bổ sung',
      };
    }
  }

  // ───────────────────────── HELPERS ───────────────────────
  /** Tải claim PENDING + location của nó; trả lỗi chuẩn nếu không hợp lệ. */
  private async loadPendingClaim(claimId: string): Promise<any> {
    if (!Types.ObjectId.isValid(claimId)) {
      return { success: false, statusCode: 400, message: 'ID claim không hợp lệ' };
    }
    const claim = await this.claimModel.findById(claimId).exec();
    if (!claim) {
      return { success: false, statusCode: 404, message: 'Không tìm thấy claim' };
    }
    if (claim.status !== ClaimRequestStatus.PENDING) {
      return {
        success: false,
        statusCode: 409,
        message: `Claim đang ở trạng thái ${claim.status}, không thể xử lý`,
      };
    }
    const location = await this.locationModel.findById(claim.locationId).exec();
    if (!location) {
      return {
        success: false,
        statusCode: 404,
        message: 'Không tìm thấy địa điểm của claim',
      };
    }
    return { success: true, claim, location };
  }

  private async redirectToRequestAccess(
    claim: any,
    location: any,
    adminId: string,
  ) {
    const reason = 'Địa điểm đã có chủ, hãy gửi RequestAccess';
    claim.status = ClaimRequestStatus.REJECTED;
    claim.adminDecision = {
      decidedBy: new Types.ObjectId(adminId),
      reason,
      decidedAt: new Date(),
    };
    await claim.save();

    await this.notification.notify({
      userId: String(claim.vendorId),
      type: 'CLAIM_REDIRECTED_TO_REQUEST_ACCESS',
      title: 'Hãy gửi yêu cầu chuyển quyền',
      body: `"${location.name}" đã có chủ. Bạn có thể gửi RequestAccess để yêu cầu quyền quản lý.`,
      refCollection: 'claim_requests',
      refId: String(claim._id),
    });

    await this.writeAudit(
      adminId,
      'CLAIM_REDIRECT_TO_REQUEST_ACCESS',
      claim._id,
      reason,
      {
        claimStatus: {
          from: ClaimRequestStatus.PENDING,
          to: ClaimRequestStatus.REJECTED,
        },
        locationId: String(location._id),
      },
    );

    return {
      success: true,
      redirectToRequestAccess: true,
      message: reason,
      claim: { id: claim._id, status: claim.status },
    };
  }

  /** Ghi AuditLog trực tiếp (I4/BR-43). TODO: gộp về util chung khi WDP-39 xong. */
  private async writeAudit(
    adminId: string,
    action: string,
    targetId: Types.ObjectId,
    reason?: string,
    diff?: Record<string, any>,
  ) {
    await this.auditLogModel.create({
      actorId: new Types.ObjectId(adminId),
      action,
      targetCollection: 'claim_requests',
      targetId,
      reason,
      diff,
    });
  }
}
```

---

### Bước 3 — Controller (AdminGuard)

**`modules/admin-claims/admin-claim.controller.ts`**
```ts
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
  Query,
  Request,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { AdminClaimService } from './admin-claim.service';
import { ListPendingClaimsDTO } from './dto/list-pending-claims.dto';
import { RejectClaimDTO } from './dto/reject-claim.dto';
import { RequestEvidenceDTO } from './dto/request-evidence.dto';

@ApiTags('admin-claims')
@ApiBearerAuth()
@Controller('admin/claims')
@UseGuards(AuthGuard('jwt-at'), AdminGuard) // AdminGuard đã có sẵn — chỉ ADMIN qua được
export class AdminClaimController {
  constructor(private readonly service: AdminClaimService) {}

  @Get('queue')
  async getQueue(@Query() query: ListPendingClaimsDTO) {
    const r = await this.service.getQueue(query);
    if (!r.success) throw new InternalServerErrorException(r.message);
    return r;
  }

  @Patch(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req: any,
  ) {
    return this.handle(
      await this.service.approve(id, req.user.userId, body?.reason),
    );
  }

  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() body: RejectClaimDTO,
    @Request() req: any,
  ) {
    return this.handle(
      await this.service.reject(id, req.user.userId, body.reason),
    );
  }

  @Patch(':id/request-evidence')
  async requestEvidence(
    @Param('id') id: string,
    @Body() body: RequestEvidenceDTO,
    @Request() req: any,
  ) {
    return this.handle(
      await this.service.requestMoreEvidence(id, req.user.userId, body.message),
    );
  }

  private handle(r: any) {
    if (!r.success) {
      if (r.statusCode === 400) throw new BadRequestException(r.message);
      if (r.statusCode === 404) throw new NotFoundException(r.message);
      if (r.statusCode === 409) throw new ConflictException(r.message);
      if (r.statusCode === 422)
        throw new UnprocessableEntityException(r.message);
      throw new InternalServerErrorException(r.message);
    }
    return r;
  }
}
```

> **Lưu ý 409:** WDP-19 dùng `ForbiddenException` cho 409 — đó là chỗ chưa chuẩn của guide cũ. Ở đây dùng `ConflictException` (đúng 409) cho "claim không còn PENDING". Nếu nhóm muốn đồng nhất, sửa lại WDP-19 chứ đừng đổi ở đây.

---

### Bước 4 — Module + nối AppModule

**`modules/admin-claims/admin-claim.module.ts`** (theo đúng mẫu `admin-category.module.ts`)
```ts
import { Module } from '@nestjs/common';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { TrustEngineModule } from 'src/modules/trust-engine/trust-engine.module';
import {
  NOTIFICATION_PORT,
  NotificationStub,
} from 'src/common/contracts/notification.port';
import { AdminClaimController } from './admin-claim.controller';
import { AdminClaimService } from './admin-claim.service';

@Module({
  // SchemaModule: ClaimRequest, Location, AuditLog, Notification, User.
  // TrustEngineModule: export TrustEngineService (Trust Engine đã thật).
  imports: [SchemaModule, TrustEngineModule],
  controllers: [AdminClaimController],
  providers: [
    AdminClaimService,
    AdminGuard,
    // Notification vẫn stub — TODO: khi WDP-7 xong đổi useClass sang service M3 thật.
    { provide: NOTIFICATION_PORT, useClass: NotificationStub },
  ],
})
export class AdminClaimModule {}
```

**Sửa `app.module.ts`** — thêm `AdminClaimModule` vào `imports`. Hiện `imports` đã có `AuthModule, SchemaModule, LocationModule, TrustEngineModule, AdminCategoryModule`:
```ts
import { AdminClaimModule } from './modules/admin-claims/admin-claim.module';
// ...
imports: [
  /* ... */
  AuthModule,
  SchemaModule,
  LocationModule,
  TrustEngineModule,
  AdminCategoryModule,
  AdminClaimModule,
],
```

---

## 6. Dữ liệu mẫu để kiểm thử (không cần WDP-27 hoàn thành)

Vì WDP-27 (tạo claim) chưa xong, **seed tay** bằng **MongoDB Compass / mongosh**. Cần: 1 `Location`, 1 user `VENDOR` (người claim), 1 user `ADMIN` (để login), và 1 `ClaimRequest` PENDING.

```js
// 1) Vendor đi claim
const vendorId = ObjectId(); // hoặc dùng user VENDOR đã có
db.users.insertOne({
  _id: vendorId, email: 'vendor.claim@test.local', passwordHash: '<bcrypt hash>',
  role: 'VENDOR', fullName: 'Vendor Claim', status: 'ACTIVE',
  trustScore: 0, trustLevel: 'NEW', createdAt: new Date(), updatedAt: new Date(),
});

// 2) Location chưa có owner (community-owned) — ownerId BỎ TRỐNG
const locId = ObjectId();
db.locations.insertOne({
  _id: locId, submittedBy: vendorId,
  name: 'Quán Cà Phê Claim Test', description: 'Địa điểm test cho luồng xét claim',
  address: '123 Test Street', geo: { type: 'Point', coordinates: [105.84, 21.02] },
  status: 'PUBLISHED', source: 'CUSTOMER', categoryId: ObjectId('<categoryId thật>'),
  isDuplicate: false, isSuspectedDuplicate: false, viewCount: 0,
  subCategoryIds: [], images: [], createdAt: new Date(), updatedAt: new Date(),
  // KHÔNG set ownerId → badge Verified chưa lên
});

// 3) ClaimRequest PENDING — ĐỦ OTP + proof geo/time để test approve được
db.claim_requests.insertOne({
  vendorId, locationId: locId, type: 'CLAIM_EXISTING_LOCATION',
  evidenceFiles: [{
    url: 'https://example.com/signboard.jpg', fileType: 'IMAGE',
    geo: { type: 'Point', coordinates: [105.84, 21.02] },
    accuracyMeters: 8, capturedAt: new Date(),
  }],
  licenseUrl: 'https://example.com/license.pdf', // có → fast-track (BR-15)
  otpVerified: true, otpVerifiedAt: new Date(),
  status: 'PENDING', createdAt: new Date(), updatedAt: new Date(),
});

// 4) 1 user ADMIN để login lấy token
db.users.insertOne({
  email: 'admin@test.local', passwordHash: '<bcrypt hash>',
  role: 'ADMIN', fullName: 'Admin Test', status: 'ACTIVE',
  trustScore: 0, trustLevel: 'NEW', createdAt: new Date(), updatedAt: new Date(),
});
```

**Biến thể để test các nhánh:**
- **Thiếu điều kiện (BR-45):** tạo 1 claim PENDING với `otpVerified: false` **hoặc** `evidenceFiles: []` → approve phải trả **422**.
- **EF20.1 (owner khác):** thêm `ownerId: ObjectId('<userKhác>')` vào location (khác `vendorId`) → approve phải reject claim, trả `redirectToRequestAccess: true`, KHÔNG gán owner và KHÔNG tạo Dispute.

> Test xong **xoá** record seed. (Đừng commit seed.)

---

## 7. Chạy và kiểm thử

```bash
# từ thư mục gốc repo (repo đã chuyển pnpm → npm)
npm run start:dev --workspace=api
# hoặc: npm run dev:api
```
1. Swagger `http://localhost:3000/api/docs` → `POST /api/auth/login` (admin@test.local) → **Authorize** bằng access token.
2. Test theo bảng:

| API | Kỳ vọng |
|---|---|
| `GET /api/admin/claims/queue` | list PENDING, mỗi item có `flags.otpVerified / hasOnSiteProof / hasLicense / eligibleForApprove` |
| `GET .../queue?status=REJECTED` | chỉ claim REJECTED |
| `PATCH .../:id/approve` (claim đủ OTP+proof) | claim → `APPROVED`; `location.ownerId = vendorId`; `adminDecision` điền đủ |
| `PATCH .../:id/approve` (claim thiếu OTP/proof) | **422** "Chưa đủ điều kiện duyệt..." |
| `PATCH .../:id/approve` (location đã có owner khác) | claim → `REJECTED`; `redirectToRequestAccess: true`; KHÔNG đổi `ownerId`; KHÔNG tạo Dispute |
| `PATCH .../:id/reject` `{reason}` | claim → `REJECTED` + `adminDecision.reason`; `location.ownerId` **không đổi** |
| `PATCH .../:id/request-evidence` `{message}` | 200; claim **vẫn PENDING**; có notification |
| approve/reject claim đã APPROVED/REJECTED | **409** |
| token VENDOR/CUSTOMER | **403** |
| không token | **401** |

3. Kiểm DB:
   - `locations`: sau approve → field `ownerId` = vendorId (⇒ badge Verified của F10 tự lên).
   - `claim_requests`: status đổi đúng; `adminDecision{decidedBy,reason,decidedAt}` có dữ liệu; **bản REJECTED vẫn còn** (không bị xoá/ghi đè).
   - `disputes`: không có document mới từ nhánh EF20.1; Dispute chỉ sinh từ RequestAccess bị từ chối + appeal được chấp nhận.
   - `notifications`: có doc tương ứng mỗi hành động (stub M3).
   - `audit_logs`: có doc `CLAIM_APPROVE / CLAIM_REJECT / CLAIM_REQUEST_EVIDENCE / CLAIM_REDIRECT_TO_REQUEST_ACCESS`.
   - Trust: sau khi **approve**, `users.<vendor>.trustScore` **tăng 15** và có 1 doc trong `trust_events` (Trust Engine thật đã chạy). Reject: mặc định **không** có trust event (xem §3.6).

4. **Test lại reject → claim mới (BR-46):** sau khi reject claim cũ (đã REJECTED), insert 1 `ClaimRequest` PENDING **mới** cùng `locationId` → phải insert **thành công** (partial unique index cho phép vì bản cũ đã rời PENDING). Đây là bằng chứng "reject mở claim mới mà không ghi đè".

---

## 8. Checklist nghiệm thu

- [ ] Queue chỉ hiện claim `PENDING` (mặc định), kèm cờ `otpVerified / hasOnSiteProof / hasLicense / eligibleForApprove`
- [ ] **Approve chỉ khi** `otpVerified === true` **và** proof có geo+capturedAt (BR-45) — thiếu → **422**
- [ ] Approve → `location.ownerId = claim.vendorId` (badge Verified suy ra từ `ownerId != null` — KHÔNG có field riêng); claim `APPROVED`; `adminDecision{decidedBy,reason,decidedAt}` đầy đủ
- [ ] **Reject** bắt buộc lý do → claim `REJECTED` + `adminDecision.reason`; **KHÔNG đụng owner**; **bản claim cũ được giữ lại** (BR-46)
- [ ] Reject xong → có thể tạo **claim PENDING mới** cùng location (partial unique index mở lại — I6)
- [ ] **Request more evidence** → claim **giữ PENDING** + notify (KHÔNG đẻ enum); có `// RULE-AMBIGUOUS`
- [ ] **EF20.1:** location có owner khác lúc duyệt → claim `REJECTED`, trả `redirectToRequestAccess: true`, KHÔNG ghi đè owner và KHÔNG tạo Dispute
- [ ] Approve gọi `TrustEngineService.recordEvent(LOCATION_APPROVED)` → điểm vendor +15 (KHÔNG tự cộng — I8). Reject: **KHÔNG** chấm trust (đã chốt — không gọi `recordEvent`; xem §3.6)
- [ ] **Notify** người gửi claim ở mọi nhánh (stub M3)
- [ ] **Audit log** ghi mọi hành động admin (I4 / BR-43)
- [ ] Chỉ ADMIN qua `AdminGuard`; VENDOR/CUSTOMER **403**; no-token **401**
- [ ] Không xử lý lại claim đã APPROVED/REJECTED (**409**)
- [ ] Có `// TODO: depends on WDP-7` ở seam Notification

---

## 9. Việc cần chốt với team (dependencies)

1. **Phụ thuộc WDP-27/F23 (tạo claim — cũng Dương):** phải có `ClaimRequest` PENDING để có cái mà duyệt. WDP-27 chưa xong → **seed tay** (§6) để test độc lập. Khi WDP-27 xong, đối chiếu lại các field (`otpVerified`, `evidenceFiles[].geo/capturedAt`, `deviceDistanceMeters`) đúng như F23 sinh ra.
2. **Trust khi từ chối — ✅ ĐÃ CHỐT: KHÔNG trừ trust** (giống từ chối địa điểm WDP-19). Nhánh reject không gọi `recordEvent`. Claim gian lận/giả mạo → xử bằng report + đề xuất ban (F31/WDP-35), không trừ điểm ở hành động reject. (Approve dùng `LOCATION_APPROVED` +15.)
3. **Sync M3/WDP-7 (Đăng, chưa xong):** chốt `notify(...)` + danh mục eventType (`CLAIM_APPROVED / CLAIM_REJECTED / CLAIM_NEEDS_MORE_EVIDENCE / CLAIM_REDIRECTED_TO_REQUEST_ACCESS`) để Đăng làm template. Notification vẫn stub (tái dùng port WDP-19).
4. **RequestAccess/Dispute:** F24 chỉ reject và redirect sang RequestAccess. Dispute chỉ được tạo khi RequestAccess bị owner từ chối và appeal của requester được chấp nhận; không mở đường Claim → Dispute trực tiếp.
5. **Báo Trung (WDP-39 audit):** đang ghi `audit_logs` trực tiếp; sau gộp về util audit chung. Action dùng: `CLAIM_APPROVE / CLAIM_REJECT / CLAIM_REQUEST_EVIDENCE / CLAIM_REDIRECT_TO_REQUEST_ACCESS`.
6. **AdminGuard / Notification stub:** `AdminGuard` đã có sẵn trong repo (module `admin-category` đang dùng) — dùng lại, KHÔNG dựng RolesGuard. Notification stub tái dùng từ WDP-19; nếu WDP-19 chưa merge, phối hợp để `notification.port.ts` vào trước (hoặc tự tạo theo WDP-19 §5 Bước 1).
7. **Schema-gap cần chốt:** (a) `ClaimRequestStatus` **thiếu** trạng thái "cần bổ sung bằng chứng" — hiện workaround = giữ PENDING + notify; cân nhắc thêm enum `NEEDS_MORE_EVIDENCE`. (b) "Verified badge" **không có field** trong `location.schema.ts` — đang suy ra từ `ownerId != null`; nếu UI cần cờ tường minh thì bàn thêm field ở WDP-5 (đừng tự thêm lẻ).
8. **UI Admin claim queue** nằm ở `web` (Next.js 15 + MUI) — tách khỏi backend; nếu bạn không làm web, bàn giao contract API ở trên cho người làm web.

---

## 10. Thứ tự code (commit nhỏ)

1. Đảm bảo `AdminGuard` (có sẵn) + Notification stub (`notification.port.ts` từ WDP-19) đã có. Nếu chưa có port → làm Bước 1 của WDP-19 trước. Trust Engine gọi trực tiếp, không cần chuẩn bị gì.
2. DTO (list / reject / request-evidence).
3. Seed 1 location no-owner + 1 vendor + 1 claim PENDING + 1 admin.
4. `getQueue` + controller `GET queue` → test list + flags.
5. `approve` (kèm chặn BR-45 + nhánh EF20.1 redirect RequestAccess) → test 422 / approved / redirect.
6. `reject` → test status + giữ owner + bản cũ còn; rồi test tạo claim PENDING mới.
7. `requestMoreEvidence` → test giữ PENDING + notify.
8. Gắn `trust.recordEvent` (chỉ nhánh approve) + `notify` + `writeAudit` vào từng nhánh.
9. Chạy full checklist §8.
10. PR → review → chuyển WDP-28 sang Done.

```bash
git checkout -b WDP-28-admin-xet-claim
# commit nhỏ theo §10
git push -u origin WDP-28-admin-xet-claim
```
> KHÔNG commit `/guideline` (đã gitignore) và record seed tạm.
