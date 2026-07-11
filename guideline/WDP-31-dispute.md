# WDP-31 — F27: Phân xử tranh chấp sở hữu (Resolve dispute) — Hướng dẫn tự triển khai (manual)

> Tài liệu cá nhân, **đã gitignore** (`/guideline/`). Không commit.
> **Tự chứa:** đọc file này là code được, **không cần mở Jira (WDP-xx) hay file nghiệp vụ (SPECS/SRS)**.
> Mục tiêu: tự code WDP-31 từ đầu đến cuối, đúng convention repo.
> ⚠️ Bài này **tái sử dụng** `AdminGuard` + Trust Engine (`TrustEngineService`) đã có sẵn trong repo — **KHÔNG dựng lại**. Notification chưa có → tạm stub (xem §1).
> 🔑 Điểm review #1 của ticket này: **transfer do Admin quyết KHÔNG bật hold** (BR-56). Đọc kỹ §3.2 và §8.

---

## 📖 Trước khi code — thuật ngữ & bối cảnh (đọc 1 lần)

Bạn đang làm **màn hình Admin phân xử tranh chấp quyền sở hữu địa điểm**. Đôi khi **2 vendor cùng nhận là chủ** của 1 địa điểm (ví dụ: quán sang nhượng, người mới đang vận hành nhưng giấy phép vẫn tên chủ cũ). Hệ thống mở 1 **`Dispute`** = 1 "vụ tranh chấp 2 bên": `vendorAId` (giả định = **chủ hiện tại**) vs `vendorBId` (giả định = **người thách thức**), mỗi bên nộp **bằng chứng** (`evidenceA[]`, `evidenceB[]`). Admin xem bằng chứng 2 phía rồi ra **1 trong 3 phán quyết**:

- **KEEP** — **giữ chủ hiện tại** (nếu địa điểm vốn chưa có chủ và cả 2 bên đều yếu → vẫn để chưa có chủ).
- **TRANSFER** — **chuyển quyền** sang bên thắng (`winnerId`, phải là A hoặc B).
- **REVOKE** — **thu hồi** quyền → địa điểm về **"chưa có chủ" (no-owner)** → tự động **mở lại đường claim**.

Mỗi lần phán quyết, bạn phải: (1) cập nhật `location.ownerId` theo phán quyết, (2) đóng dispute + ghi `adminDecision`, (3) **báo cả 2 bên** A & B, (4) **ghi audit log**, (5) **cộng/trừ điểm uy tín** cho các bên (gọi Trust Engine, không tự tính).

**Thuật ngữ sẽ gặp:**
- **owner / ownerId** = chủ sở hữu địa điểm (1 vendor). "No-owner" = `ownerId = undefined` = địa điểm chưa có ai sở hữu.
- **trustScore / trustLevel** = "điểm uy tín" và "hạng" của user. Bạn **không tự tính**, mà gọi **Trust Engine** (xem bảng dưới).
- **audit log** = nhật ký "admin nào, làm gì, lên đối tượng nào, lúc nào". Bắt buộc ghi cho mọi hành động admin (quy tắc **I4**).
- **hold / `holdExpiresAt`** = "thời gian nguội" 7 ngày sau khi chuyển chủ (để bên cũ kịp appeal trước khi chủ mới phá). **Đây là cơ chế của ticket khác (F26)** — F27 của bạn **KHÔNG** dùng (xem BR-56).
- **claim** = vendor gửi yêu cầu nhận sở hữu 1 địa điểm. Sau REVOKE, đường claim tự mở lại (xem BR-54).

**Các "mã luật" của riêng ticket này:**
- **BR-53** = luật cân bằng chứng: **kiểm soát thực tế tại chỗ** (ảnh biển hiệu có geotag + timestamp + mã one-time) **> giấy phép kinh doanh**. License có thể cũ/đã sang nhượng; ảnh on-site mới chứng minh ai đang thực sự vận hành. Đây là **gợi ý cho Admin quyết**, KHÔNG phải logic tự động.
- **BR-54** = luật: REVOKE → no-owner → **mở lại claim tự nhiên** (không cần code thêm).
- **BR-56** = 🔑 **điểm soi #1**: **transfer do Admin phán xử (F27) KHÔNG bật hold**; chỉ transfer kiểu owner-grant / auto-timeout (F26) mới có hold. Đừng nhầm 2 nhánh.
- **I4** = mọi hành động Admin phải **ghi audit log**.
- **I8** = quy tắc bất biến: **cấm** sửa điểm trust bằng tay (`user.trustScore += ...` = fail review). Chỉ được gọi Trust Engine (M2 = Trung).

**3 thứ bạn sẽ dùng lại (đã có sẵn trong repo, KHÔNG tự build) — 1 thứ tạm stub:**

| Thứ | File thật | Dùng thế nào |
|---|---|---|
| **AdminGuard** (chặn non-admin) | `apps/api/src/common/guard/admin.guard.ts` (`AdminGuard`) | `@UseGuards(AuthGuard('jwt-at'), AdminGuard)`. Nó tự load user, chặn ai không phải `ADMIN` (401/403). **Không** tự dựng RolesGuard. |
| **Trust Engine** (cộng/trừ điểm) | `apps/api/src/modules/trust-engine/` (`TrustEngineModule`, `TrustEngineService`) | `imports:[TrustEngineModule]` → inject `TrustEngineService` → gọi `recordEvent(...)`. Engine tự tính điểm & hạng, tự chống ghi trùng. |
| **Schema (data contract)** | `apps/api/src/common/schemas/` | `Dispute`, `Location`, `AuditLog`, `AdminDecision` đã có sẵn field cần dùng. Enum lấy từ `common.enums.ts`. |
| **Notification** (⏳ CHƯA có module) | Chỉ có `notification.schema.ts`, ticket WDP-7 (Đăng) chưa xong | **STUB** tạm: tự ghi 1 doc `notifications`. Gắn `// TODO: depends on WDP-7`; khi WDP-7 xong chỉ thay chỗ gọi. |

---

## 0. Tóm tắt task

| | |
|---|---|
| **Issue** | [WDP-31](https://fptp.atlassian.net/browse/WDP-31) — `[S4] F27 — Phân xử tranh chấp` |
| **Quan trọng** | **Core** · Sprint S4 · Feature Moderation nâng cao · HF-5 |
| **Mô tả** | Một `Dispute` là **case 2 bên** (`vendorAId` vs `vendorBId`) về quyền sở hữu 1 địa điểm. Admin xem **bằng chứng 2 phía** (`evidenceA[]`, `evidenceB[]`) rồi ra **1 trong 3 phán quyết**: giữ chủ hiện tại / chuyển chủ / thu hồi (về no-owner). |
| **Đụng tới** | `web` (Admin dispute review UI) + `api` (backend — tài liệu này) |
| **Depends** | F21/F22 (report routing mở dispute), F26 (cơ chế transfer). **Trust Engine ✅ đã xong (WDP-33)** → gọi trực tiếp. **Notification ⏳ chưa (WDP-7)** → stub. |
| **Rules** | **BR-53** (kiểm soát thực tế > giấy phép), **BR-54** (revoke → no-owner → mở lại claim), **BR-56** (Admin-decided transfer **KHÔNG** hold), **I4** (mọi hành động Admin → AuditLog), **I8** (trust chỉ qua M2) |
| **DoD** | (1) Cả **3 phán quyết** chạy đúng; (2) **Ghi AuditLog**; (3) **Admin-decided transfer KHÔNG bật hold** (`holdExpiresAt` không set) |

### Phân rã DoD
1. Admin xem **hàng đợi dispute** `OPEN` + xem chi tiết (2 bên + evidence 2 phía).
2. Phán quyết **`RESOLVED_KEEP`** → chủ hiện tại giữ nguyên (nếu **cả 2 bên đều yếu** → giữ no-owner).
3. Phán quyết **`RESOLVED_TRANSFER`** → `location.ownerId = winnerId`. **TUYỆT ĐỐI không set `location.holdExpiresAt`** (BR-56).
4. Phán quyết **`RESOLVED_REVOKE`** → `location.ownerId = undefined` (no-owner) → **mở lại đường claim** (F23) vì không còn PENDING.
5. Ghi `adminDecision { decidedBy, reason, decidedAt }` + set `dispute.status` tương ứng.
6. **Gọi M3** báo **cả hai** bên A & B kết quả.
7. **Ghi AuditLog** mọi phán quyết (I4 / BR-43).
8. (Tuỳ chọn) chủ gian lận → revoke + **đề xuất ban** (F31/WDP-35) — chỉ gắn seam, không tự ban.

---

## 1. ⚠️ ĐỌC KỸ — cái gì TÁI SỬ DỤNG, cái gì chỉ GỌI

Ticket S4 này nằm **sau** chuỗi ownership S3, nên phần hạ tầng đã có người dựng. **Đừng dựng lại.**

| Thành phần | Đây là gì | Bạn làm gì |
|---|---|---|
| **AdminGuard** (chặn non-admin) | ✅ **Có sẵn** `common/guard/admin.guard.ts` (module `admin-category` đang dùng) | ✅ **TÁI SỬ DỤNG.** `@UseGuards(AuthGuard('jwt-at'), AdminGuard)`; thêm `AdminGuard` vào `providers`. Nó tự query DB lấy role, chặn ai không phải `ADMIN` (403). **Không** tự dựng RolesGuard/`@Roles()`. |
| **Trust (cộng/trừ điểm)** | **M2 = [WDP-33](https://fptp.atlassian.net/browse/WDP-33)**, owner **Trung** — ✅ **ĐÃ XONG** | ✅ **GỌI TRỰC TIẾP.** `imports:[TrustEngineModule]`, inject `TrustEngineService`, gọi `await this.trust.recordEvent({...})`. **KHÔNG** cần port/stub trust nữa. **Không** tự cộng điểm (I8). |
| **Notification** | **M3 = [WDP-7](https://fptp.atlassian.net/browse/WDP-7)**, owner **Đăng** — ⏳ **CHƯA XONG** | ❌ **KHÔNG build.** Chưa xong → viết `NotificationStub` (ghi thẳng 1 doc `notifications`) qua `NOTIFICATION_PORT`. Gắn `// TODO: depends on WDP-7`. |
| **AuditLog** | I4/BR-43: util chung; dashboard là WDP-39 (Trung, S4) | ⚠️ Tạm **ghi trực tiếp** vào collection `audit_logs` (model `AuditLog` đã có sẵn). Báo Trung để sau gộp về util chung. |
| **Hold (`holdExpiresAt`)** | Cơ chế hold 7 ngày thuộc **F26 / [WDP-30](https://fptp.atlassian.net/browse/WDP-30)** | ❌ **KHÔNG đụng.** `location.holdExpiresAt` **là field có thật** trong schema, nhưng chỉ F26 dùng. Ở F27, transfer do Admin vetted → **không** hold. Việc của bạn là **đảm bảo KHÔNG set** `holdExpiresAt`, chứ không phải tạo hold. |
| **Ban tài khoản** | **F31 / [WDP-35](https://fptp.atlassian.net/browse/WDP-35)**, owner **Trung** | ❌ **KHÔNG build.** Chỉ để seam `// TODO: depends on F31/WDP-35` cho case chủ gian lận. |

> **Invariant I8 (non-negotiable):** mọi thay đổi điểm trust chỉ qua `TrustEngineService.recordEvent`, không cộng/trừ điểm tay. Viết `user.trustScore += ...` trong service của bạn = **fail review**.

> ⚠️ **`TrustEventType` chỉ có 6 giá trị thật** (từ `common.enums.ts`): `LOCATION_APPROVED`(+15), `CORRECT_REPORT`(+5), `LIVE_REVIEW`(+2), `VIOLATING_CONTENT_REMOVED`(−10), `FALSE_REPORT`(−10), `ADMIN_ADJUSTMENT`(phải truyền `pointChange`). **KHÔNG tồn tại** `VALID_REPORT` và `CONTENT_REJECTED` — copy code cũ dùng 2 tên này sẽ **lỗi compile**. Cách map cho dispute xem §3.5.

> **Invariant I5:** chủ sở hữu **chỉ** đến từ approval/transfer. Khi transfer ở F27, bạn set `ownerId` vì đây là **transfer được Admin vetted** — hợp lệ. Khi revoke, set `ownerId = undefined`, **không** tự gán cho ai khác (phải qua claim mới).

> **Protocol khi dependency chưa xong:** với Notification (chưa xong) → stub theo contract, code phần của mình, đánh dấu seam `// TODO: depends on WDP-7`. **Không tự bịa logic ticket khác** (đừng tự viết logic ban của F31, đừng tự tạo hold của F26).

**Còn lại bạn không bị chặn:** data contract đã khóa ở WDP-5 (Done). `Dispute`, `Location`, `ClaimRequest`, `AdminDecision` đều có sẵn field cần dùng. Record `Dispute OPEN` do **F22 (Trung, To Do)** hoặc **F24 (Dương, To Do)** tạo — **chưa có** → **seed tay** để test độc lập (§6).

---

## 2. Convention repo (bám theo cho khớp)

1. **Service trả object, KHÔNG throw:** `{ success, statusCode?, message?, ...data }` (xem [auth.service.ts](apps/api/src/modules/auth/auth.service.ts), [location.service.ts](apps/api/src/modules/locations/location.service.ts)).
2. **Controller** map object đó sang `HttpException` (xem [auth.controller.ts](apps/api/src/modules/auth/auth.controller.ts)).
3. **Auth:** `@UseGuards(AuthGuard('jwt-at'))`, lấy user qua `req.user.userId`. ⚠️ Token **chỉ có `userId`** ([at.strategy.ts](apps/api/src/common/guard/at.strategy.ts)) → role KHÔNG ở token → `AdminGuard` tự **query DB** lấy role, bạn không cần lo. Strategy `'jwt-at'` đã đăng ký global bởi `AuthModule` → **không cần** `AtStrategy` trong providers.
4. **Module:** `imports: [SchemaModule, TrustEngineModule]` để có Model + `TrustEngineService`; providers gồm service + `AdminGuard` (theo đúng mẫu `admin-category.module.ts`).
5. **DTO:** `class-validator`. `ValidationPipe({ whitelist: true, transform: true })` đã bật global ([main.ts](apps/api/src/main.ts)).
6. **Prefix `api`** → route thật là `/api/...`. Swagger `/api/docs` (đã bật `addBearerAuth`).
7. Message tiếng Việt có dấu.
8. **Enum lấy từ `common.enums.ts`** — không hardcode magic string. `DisputeStatus`, `ClaimRequestStatus`, `UserRole`, `TrustEventType` đã có sẵn.

---

## 3. Quyết định kỹ thuật (chốt trước khi code)

### 3.1. Bảng phán quyết (đầu vào → tác động)

| Outcome (DTO) | `dispute.status` | Tác động lên `Location` | Mở lại claim? | Hold? | Trust (gọi M2, xem §3.5) | Ghi chú |
|---|---|---|---|---|---|---|
| `KEEP` | `RESOLVED_KEEP` | **không đổi** `ownerId` | Không | Không | *(mặc định không chấm)* | Giữ chủ hiện tại. Nếu địa điểm vốn no-owner và 2 bên đều yếu → vẫn no-owner. |
| `TRANSFER` | `RESOLVED_TRANSFER` | `ownerId = winnerId` | Không | **KHÔNG** (BR-56) | winner → `CORRECT_REPORT` (+5) | `winnerId` **bắt buộc** và phải là A hoặc B. **Không** set `holdExpiresAt`. |
| `REVOKE` | `RESOLVED_REVOKE` | `ownerId = undefined` | **Có** (BR-54) | Không | chủ gian lận → `VIOLATING_CONTENT_REMOVED` (−10) | Về no-owner → vì không còn PENDING nên claim (F23) mở lại tự nhiên. Chủ gian lận → seam ban F31. |

Sau mọi outcome: set `adminDecision = { decidedBy: adminId, reason, decidedAt: now }`, lưu dispute, **notify A & B**, **ghi audit**.

### 3.2. 🔑 BR-56 — Vì sao transfer ở F27 KHÔNG hold (điểm review #1)

Phân biệt rõ 2 con đường chuyển chủ:

| Con đường | Ticket | Có hold 7 ngày? | Lý do |
|---|---|---|---|
| Owner **Grant** quyền / **im lặng quá hạn → auto-transfer** | **F26 / WDP-30** | ✅ **CÓ** `holdExpiresAt = now + 7d` | Chuyển **không qua thẩm định Admin** → cần "thời gian nguội" để bên cũ kịp **appeal** trước khi chủ mới phá (ẩn địa điểm / xoá hàng loạt). |
| Admin **phán quyết transfer** sau khi xử dispute | **F27 / WDP-31 (ticket này)** | ❌ **KHÔNG** | Admin **đã thẩm định bằng chứng 2 bên** rồi mới quyết → không cần hold. Vẫn còn quyền **appeal** (F28) như mọi quyết định Admin. |

> ⚠️ **TUYỆT ĐỐI** không viết `location.holdExpiresAt = ...` trong nhánh TRANSFER. Reviewer sẽ check đúng dòng này. Nếu muốn an toàn hơn, có thể **chủ động clear** hold cũ (`location.holdExpiresAt = undefined`) khi transfer — nhưng tối thiểu là **không set mới**. Xem checklist §8.

### 3.3. BR-53 — Heuristic cân bằng chứng (ghi vào mô tả API, không hard-code)

Khi Admin cân nhắc ai thắng: **kiểm soát thực tế tại chỗ (on-site proof: ảnh biển hiệu geotag + timestamp + mã one-time) > giấy phép kinh doanh (business license)**. Một license có thể cũ/đã sang nhượng; ảnh on-site mới chứng minh ai đang thực sự vận hành. Đây là **gợi ý quyết định cho người Admin** (mô tả ở Swagger), **không phải logic tự động** — F27 không tự chấm điểm bằng chứng.

> Nếu mơ hồ "bên nào thắng khi bằng chứng ngang nhau" → chọn phương án **an toàn hơn**: **KEEP** (giữ nguyên hiện trạng) hoặc **REVOKE** về no-owner, **không** tự ý TRANSFER. Để lại `// RULE-AMBIGUOUS:` cho reviewer.

### 3.4. BR-54 — Revoke mở lại claim như thế nào (không cần code thêm)

Bạn **không** phải viết logic "tạo claim mới". Cơ chế đã nằm ở **unique partial index** của `claim_requests` ([claim-request.schema.ts](apps/api/src/common/schemas/claim-request.schema.ts) dòng 62-68): chỉ chặn khi đã tồn tại 1 claim `PENDING`. Khi revoke:
- `location.ownerId = undefined` → địa điểm về tier B (no-owner).
- Dispute này đóng (`RESOLVED_REVOKE`) → **không còn** ràng buộc.
- Vendor bất kỳ lại có thể gửi claim mới (F23) bình thường.

→ Việc của F27 chỉ là **bỏ owner**; đường claim "tự" mở lại. Đừng đụng vào schema claim.

### 3.5. Trust — gọi Trust Engine, KHÔNG tự tính (I8)

Engine tự áp điểm theo `TrustEventType`, bạn chỉ truyền đúng loại sự kiện. **Enum thật KHÔNG có event riêng cho dispute** (6 giá trị: `LOCATION_APPROVED` +15, `CORRECT_REPORT` +5, `LIVE_REVIEW` +2, `VIOLATING_CONTENT_REMOVED` −10, `FALSE_REPORT` −10, `ADMIN_ADJUSTMENT` cần `pointChange`). Đây là **map gần đúng** cho F27 — **chốt lại với Trung (M2)** trước demo:

| Tình huống | `TrustEventType` dùng | Điểm |
|---|---|---|
| Bên **thắng / tố cáo hợp lệ** (được giữ / nhận quyền hợp pháp) | `CORRECT_REPORT` | **+5** |
| Chủ **gian lận bị revoke** / nội dung vi phạm bị gỡ | `VIOLATING_CONTENT_REMOVED` | **−10** |
| *(tuỳ chọn)* Bên **tố cáo/thách thức SAI**, thua kiện | `FALSE_REPORT` | **−10** |

> ⚠️ Enum không có event riêng cho dispute → đây là **map gần đúng**. Guide đang dùng: TRANSFER → winner nhận `CORRECT_REPORT`; REVOKE (`fraudulent`) → chủ cũ nhận `VIOLATING_CONTENT_REMOVED`. **Chốt với Trung (M2/WDP-33)** hoặc xin bổ sung enum.

---

## 4. Cây file

```
apps/api/src/
├─ common/
│  ├─ guard/
│  │  └─ admin.guard.ts              (ĐÃ CÓ)  AdminGuard — chỉ ADMIN qua được
│  └─ contracts/
│     └─ notification.port.ts        (ĐÃ CÓ)  tái dùng từ WDP-19
├─ modules/disputes/
│  ├─ dto/
│  │  ├─ list-disputes.dto.ts        (TẠO)
│  │  └─ resolve-dispute.dto.ts      (TẠO)  outcome enum + reason + winnerId?
│  ├─ dispute.service.ts             (TẠO)  3 outcome, trả {success,...}
│  ├─ dispute.controller.ts          (TẠO)  AuthGuard('jwt-at') + AdminGuard
│  └─ dispute.module.ts              (TẠO)
└─ app.module.ts                     (SỬA: thêm DisputeModule)
```

> **Không cần** tạo `roles.guard.ts`/`roles.decorator.ts`, `trust.port.ts` hay `notification.port.ts`. `NotificationPort`/`NotificationStub` đã có từ WDP-19; import lại và khai báo provider `NOTIFICATION_PORT` trong `DisputeModule`. Khi WDP-7 xong, chỉ đổi provider sang service thật; interface giữ nguyên.

---

## 5. Triển khai

### Bước 1 — Tái sử dụng NotificationPort (M3 chưa xong)

`common/contracts/notification.port.ts` đã tồn tại. Không copy lại interface hoặc `NotificationStub`; import `NOTIFICATION_PORT`, `NotificationPort`, `NotificationStub` từ file đó.

> **Trust KHÔNG cần stub** — Trust Engine (WDP-33) đã xong, gọi trực tiếp `TrustEngineService.recordEvent(...)` (xem Bước 3).

---

### Bước 2 — DTO

**`modules/disputes/dto/resolve-dispute.dto.ts`**
```ts
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

/** 3 phán quyết Admin có thể ra cho 1 dispute (ánh xạ sang DisputeStatus trong service). */
export enum DisputeOutcome {
  KEEP = 'KEEP', // giữ chủ hiện tại (hoặc giữ no-owner nếu 2 bên đều yếu)
  TRANSFER = 'TRANSFER', // chuyển chủ sang winnerId — KHÔNG hold (BR-56)
  REVOKE = 'REVOKE', // bỏ chủ → no-owner → mở lại claim (BR-54)
}

export class ResolveDisputeDTO {
  @IsEnum(DisputeOutcome, { message: 'outcome phải là KEEP | TRANSFER | REVOKE' })
  outcome!: DisputeOutcome;

  @IsString()
  @IsNotEmpty({ message: 'Phải nhập lý do phán quyết' })
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;

  // Chỉ bắt buộc khi TRANSFER; phải là vendorAId hoặc vendorBId (service kiểm tra).
  @ValidateIf((o) => o.outcome === DisputeOutcome.TRANSFER)
  @IsMongoId({ message: 'winnerId phải là ObjectId hợp lệ' })
  @IsNotEmpty({ message: 'TRANSFER bắt buộc có winnerId' })
  winnerId?: string;

  // Tuỳ chọn: đánh dấu chủ hiện tại gian lận để Admin cân nhắc ban (seam F31).
  @IsOptional()
  fraudulent?: boolean;
}
```

**`modules/disputes/dto/list-disputes.dto.ts`**
```ts
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { DisputeStatus } from 'src/common/schemas/common.enums';

export class ListDisputesDTO {
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus; // mặc định service lọc OPEN

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

---

### Bước 3 — DisputeService (3 outcome, gọi Trust Engine trực tiếp + Notification stub)

**`modules/disputes/dispute.service.ts`**
```ts
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Dispute, DisputeDocument } from 'src/common/schemas/dispute.schema';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import { AuditLog } from 'src/common/schemas/audit-log.schema';
import { DisputeStatus, TrustEventType } from 'src/common/schemas/common.enums';
import { TrustEngineService } from 'src/modules/trust-engine/trust-engine.service';
import {
  NOTIFICATION_PORT,
  NotificationPort,
} from 'src/common/contracts/notification.port';
import { ListDisputesDTO } from './dto/list-disputes.dto';
import { DisputeOutcome, ResolveDisputeDTO } from './dto/resolve-dispute.dto';

@Injectable()
export class DisputeService {
  constructor(
    @InjectModel(Dispute.name) private disputeModel: Model<DisputeDocument>,
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
    private readonly trust: TrustEngineService,
    @Inject(NOTIFICATION_PORT) private notification: NotificationPort,
  ) {}

  /** Hàng đợi dispute cho Admin (mặc định OPEN). */
  async getQueue(query: ListDisputesDTO) {
    try {
      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const filter = { status: query.status ?? DisputeStatus.OPEN };

      const [items, total] = await Promise.all([
        this.disputeModel
          .find(filter)
          .sort({ createdAt: 1 }) // FIFO: case cũ xử trước
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('locationId', 'name address ownerId status')
          .populate('vendorAId', 'fullName email phone')
          .populate('vendorBId', 'fullName email phone')
          .lean()
          .exec(),
        this.disputeModel.countDocuments(filter).exec(),
      ]);

      return { success: true, total, page, limit, items };
    } catch (error) {
      console.log('getQueue error:', error);
      return { success: false, statusCode: 500, message: 'Lỗi khi lấy hàng đợi tranh chấp' };
    }
  }

  /** Chi tiết 1 dispute (Admin xem bằng chứng 2 phía trước khi quyết). */
  async getDetail(id: string) {
    try {
      if (!Types.ObjectId.isValid(id))
        return { success: false, statusCode: 400, message: 'ID tranh chấp không hợp lệ' };

      const dispute = await this.disputeModel
        .findById(id)
        .populate('locationId', 'name address ownerId status holdExpiresAt')
        .populate('vendorAId', 'fullName email phone trustLevel')
        .populate('vendorBId', 'fullName email phone trustLevel')
        .lean()
        .exec();

      if (!dispute)
        return { success: false, statusCode: 404, message: 'Không tìm thấy tranh chấp' };
      return { success: true, dispute };
    } catch (error) {
      console.log('getDetail error:', error);
      return { success: false, statusCode: 500, message: 'Lỗi khi lấy chi tiết tranh chấp' };
    }
  }

  /** Phán xử: KEEP | TRANSFER | REVOKE. */
  async resolve(disputeId: string, adminId: string, dto: ResolveDisputeDTO) {
    try {
      if (!Types.ObjectId.isValid(disputeId))
        return { success: false, statusCode: 400, message: 'ID tranh chấp không hợp lệ' };

      const dispute = await this.disputeModel.findById(disputeId).exec();
      if (!dispute)
        return { success: false, statusCode: 404, message: 'Không tìm thấy tranh chấp' };

      // Chỉ xử case đang OPEN — không phán quyết lại case đã đóng (giữ tính bất biến của quyết định).
      if (dispute.status !== DisputeStatus.OPEN)
        return {
          success: false,
          statusCode: 409,
          message: `Tranh chấp đã được xử lý (${dispute.status}), không thể phán quyết lại`,
        };

      const location = await this.locationModel.findById(dispute.locationId).exec();
      if (!location)
        return { success: false, statusCode: 404, message: 'Không tìm thấy địa điểm của tranh chấp' };

      const fromLocationOwner = location.ownerId ? String(location.ownerId) : null;
      let newStatus: DisputeStatus;
      let auditAction: string;

      // ── 3 nhánh phán quyết ───────────────────────────────────────────────
      if (dto.outcome === DisputeOutcome.TRANSFER) {
        // winnerId bắt buộc & phải là A hoặc B
        const winner = dto.winnerId ? String(dto.winnerId) : '';
        const a = String(dispute.vendorAId);
        const b = String(dispute.vendorBId);
        if (winner !== a && winner !== b)
          return {
            success: false,
            statusCode: 400,
            message: 'winnerId phải là một trong hai bên tranh chấp (A hoặc B)',
          };

        location.ownerId = new Types.ObjectId(winner);
        // 🔑 BR-56: Admin-decided transfer => KHÔNG bật hold.
        // KHÔNG viết: location.holdExpiresAt = ...  (đó là cơ chế của F26/WDP-30)
        location.holdExpiresAt = undefined; // chủ động clear hold cũ (nếu có) cho an toàn
        newStatus = DisputeStatus.RESOLVED_TRANSFER;
        auditAction = 'DISPUTE_RESOLVE_TRANSFER';
      } else if (dto.outcome === DisputeOutcome.REVOKE) {
        // BR-54: về no-owner → claim (F23) tự mở lại vì không còn PENDING.
        location.ownerId = undefined;
        location.holdExpiresAt = undefined;
        newStatus = DisputeStatus.RESOLVED_REVOKE;
        auditAction = 'DISPUTE_RESOLVE_REVOKE';
        // TODO: depends on F31/WDP-35 — nếu dto.fraudulent === true, đề xuất ban chủ cũ.
      } else {
        // KEEP: giữ nguyên ownerId hiện tại (kể cả khi đang no-owner).
        newStatus = DisputeStatus.RESOLVED_KEEP;
        auditAction = 'DISPUTE_RESOLVE_KEEP';
      }

      await location.save();

      // adminDecision + đóng dispute
      dispute.status = newStatus;
      dispute.adminDecision = {
        decidedBy: new Types.ObjectId(adminId),
        reason: dto.reason,
        decidedAt: new Date(),
      };
      await dispute.save();

      // ── Hệ quả phụ: trust / notify / audit ───────────────────────────────
      await this.applyTrust(dispute, dto, location, fromLocationOwner);
      await this.notifyBothParties(dispute, dto.outcome, location.name);

      await this.auditLogModel.create({
        actorId: new Types.ObjectId(adminId),
        action: auditAction,
        targetCollection: 'disputes',
        targetId: dispute._id,
        reason: dto.reason,
        diff: {
          disputeStatus: { from: DisputeStatus.OPEN, to: newStatus },
          // ⚠️ Key phải là `ownerId` — F28/WDP-32 đọc đúng `diff.ownerId.from` để khôi phục chủ cũ nếu appeal thắng
          ownerId: {
            from: fromLocationOwner, // 🔒 chủ cũ
            to: location.ownerId ? String(location.ownerId) : null,
          },
          holdExpiresAt: location.holdExpiresAt ?? null, // bằng chứng KHÔNG bật hold
        },
      });

      return {
        success: true,
        message: 'Đã phán xử tranh chấp',
        dispute: { id: dispute._id, status: dispute.status },
        location: {
          id: location._id,
          ownerId: location.ownerId ? String(location.ownerId) : null,
          holdExpiresAt: location.holdExpiresAt ?? null,
        },
      };
    } catch (error) {
      console.log('resolve error:', error);
      return { success: false, statusCode: 500, message: 'Lỗi khi phán xử tranh chấp' };
    }
  }

  /** Trust — GỌI Trust Engine trực tiếp, KHÔNG tự cộng/trừ điểm (I8). Chỉ phát đúng eventType.
   *  RULE-AMBIGUOUS: enum thật KHÔNG có event riêng cho dispute (xem §3.5) → map gần đúng, chốt với Trung.
   *  - bên thắng/được chuyển quyền hợp lệ → CORRECT_REPORT (+5)  [không dùng VALID_REPORT — không tồn tại]
   *  - chủ gian lận bị revoke        → VIOLATING_CONTENT_REMOVED (−10)  [không dùng CONTENT_REJECTED — không tồn tại]
   *  Engine tự tính điểm & hạng, tự chống ghi trùng theo (userId + type + refCollection + refId). */
  private async applyTrust(
    dispute: DisputeDocument,
    dto: ResolveDisputeDTO,
    location: LocationDocument,
    previousOwnerId: string | null,
  ) {
    if (dto.outcome === DisputeOutcome.TRANSFER && dto.winnerId) {
      await this.trust.recordEvent({
        userId: String(dto.winnerId),
        type: TrustEventType.CORRECT_REPORT, // +5 — bên thắng, tố cáo hợp lệ
        reason: 'Thắng tranh chấp sở hữu — được chuyển quyền',
        refCollection: 'disputes',
        refId: String(dispute._id),
      });
    }
    if (dto.outcome === DisputeOutcome.REVOKE && dto.fraudulent && previousOwnerId) {
      await this.trust.recordEvent({
        userId: previousOwnerId,
        type: TrustEventType.VIOLATING_CONTENT_REMOVED, // −10 — chủ gian lận bị thu hồi
        reason: 'Bị thu hồi quyền sở hữu do tranh chấp (nghi gian lận)',
        refCollection: 'disputes',
        refId: String(dispute._id),
      });
    }
    // (tuỳ chọn) bên tố cáo/thách thức SAI, thua kiện → FALSE_REPORT (−10). Bật khi cần:
    // await this.trust.recordEvent({ userId: '<bên thua>',
    //   type: TrustEventType.FALSE_REPORT, reason: 'Thách thức tranh chấp sai',
    //   refCollection: 'disputes', refId: String(dispute._id) });
  }

  /** Notify CẢ HAI bên A & B (M3 qua port). */
  private async notifyBothParties(
    dispute: DisputeDocument,
    outcome: DisputeOutcome,
    locationName: string,
  ) {
    const outcomeText =
      outcome === DisputeOutcome.TRANSFER
        ? 'chuyển quyền sở hữu'
        : outcome === DisputeOutcome.REVOKE
          ? 'thu hồi quyền sở hữu (địa điểm về trạng thái chưa có chủ)'
          : 'giữ nguyên quyền sở hữu hiện tại';

    const recipients = [String(dispute.vendorAId), String(dispute.vendorBId)];
    await Promise.all(
      recipients.map((userId) =>
        this.notification.notify({
          userId,
          type: 'DISPUTE_RESOLVED',
          title: 'Kết quả phân xử tranh chấp',
          body: `Tranh chấp về "${locationName}" đã được Admin xử lý: ${outcomeText}. Bạn có thể khiếu nại trong 14 ngày.`,
          refCollection: 'disputes',
          refId: String(dispute._id),
        }),
      ),
    );
  }
}
```

> Lưu ý 2 dòng `location.holdExpiresAt = undefined;` ở nhánh TRANSFER & REVOKE: đây là **clear chủ động** để chắc chắn không sót hold cũ. Điều cấm là **set giá trị Date mới** — tài liệu này không làm điều đó ở bất kỳ nhánh nào. Xem §8.

---

### Bước 4 — Controller (AdminGuard — chỉ ADMIN)

**`modules/disputes/dispute.controller.ts`**
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
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { DisputeService } from './dispute.service';
import { ListDisputesDTO } from './dto/list-disputes.dto';
import { ResolveDisputeDTO } from './dto/resolve-dispute.dto';

@ApiTags('admin-disputes')
@ApiBearerAuth()
@Controller('admin/disputes')
@UseGuards(AuthGuard('jwt-at'), AdminGuard)   // AdminGuard đã có sẵn — chỉ ADMIN qua được
export class DisputeController {
  constructor(private readonly service: DisputeService) {}

  @Get()
  @ApiOperation({ summary: 'Hàng đợi tranh chấp (mặc định OPEN)' })
  async getQueue(@Query() query: ListDisputesDTO) {
    const r = await this.service.getQueue(query);
    if (!r.success) throw new InternalServerErrorException(r.message);
    return r;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết tranh chấp + bằng chứng 2 phía' })
  async getDetail(@Param('id') id: string) {
    return this.handle(await this.service.getDetail(id));
  }

  @Patch(':id/resolve')
  @ApiOperation({
    summary: 'Phán xử: KEEP | TRANSFER | REVOKE',
    description:
      'BR-53: kiểm soát thực tế (on-site proof) > giấy phép. ' +
      'BR-56: TRANSFER do Admin quyết KHÔNG bật hold. ' +
      'BR-54: REVOKE → no-owner, mở lại claim.',
  })
  async resolve(
    @Param('id') id: string,
    @Body() body: ResolveDisputeDTO,
    @Request() req: any,
  ) {
    return this.handle(await this.service.resolve(id, req.user.userId, body));
  }

  private handle(r: any) {
    if (!r.success) {
      if (r.statusCode === 400) throw new BadRequestException(r.message);
      if (r.statusCode === 404) throw new NotFoundException(r.message);
      if (r.statusCode === 409) throw new ConflictException(r.message);
      throw new InternalServerErrorException(r.message);
    }
    return r;
  }
}
```

---

### Bước 5 — Module + nối AppModule

**`modules/disputes/dispute.module.ts`** (theo đúng mẫu `admin-category.module.ts`)
```ts
import { Module } from '@nestjs/common';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { TrustEngineModule } from 'src/modules/trust-engine/trust-engine.module';
import {
  NOTIFICATION_PORT,
  NotificationStub,
} from 'src/common/contracts/notification.port';
import { DisputeController } from './dispute.controller';
import { DisputeService } from './dispute.service';

@Module({
  imports: [SchemaModule, TrustEngineModule], // TrustEngineModule export TrustEngineService
  controllers: [DisputeController],
  providers: [
    DisputeService,
    AdminGuard,
    // Notification vẫn stub — TODO: khi WDP-7 xong đổi useClass sang service M3 thật
    { provide: NOTIFICATION_PORT, useClass: NotificationStub },
  ],
})
export class DisputeModule {}
```

**Sửa `app.module.ts`** — thêm `DisputeModule` vào `imports`. Hiện `imports` đã có `AuthModule, SchemaModule, LocationModule, TrustEngineModule, AdminCategoryModule`:
```ts
import { DisputeModule } from './modules/disputes/dispute.module';
// ...
imports: [ /* ... */ AuthModule, SchemaModule, LocationModule, TrustEngineModule, AdminCategoryModule, DisputeModule ],
```

> Không cần `AtStrategy` trong providers — `AuthModule` đã đăng ký strategy `'jwt-at'` global. Nếu bạn cũng làm WDP-19, `NotificationStub`/`NOTIFICATION_PORT` có thể đã tồn tại — dùng lại file, mỗi module tự khai báo provider trong phạm vi của nó (DI theo module), không xung đột.

---

## 6. Seed data để test độc lập (không cần F22/F24)

Vì F22 (Trung) / F24 (Dương) chưa xong, **seed tay** đủ bộ: 1 admin + 2 vendor + 1 location có chủ + 1 dispute OPEN. Dùng **MongoDB Compass / mongosh**.

```js
// 0) Lấy ObjectId của 1 ADMIN có sẵn để login (hoặc sửa role 1 user thành 'ADMIN').
//    db.users.updateOne({ email: 'admin@test.com' }, { $set: { role: 'ADMIN' } });

// 1) Hai vendor tham chiến (passwordHash sao chép từ 1 user thật để login được)
const vA = db.users.insertOne({
  email: 'vendora@test.com', fullName: 'Vendor A', role: 'VENDOR',
  passwordHash: '<copy hash thật>', status: 'ACTIVE', trustScore: 0, trustLevel: 'NEW',
  phoneVerified: false, createdAt: new Date(), updatedAt: new Date(),
}).insertedId;
const vB = db.users.insertOne({
  email: 'vendorb@test.com', fullName: 'Vendor B', role: 'VENDOR',
  passwordHash: '<copy hash thật>', status: 'ACTIVE', trustScore: 0, trustLevel: 'NEW',
  phoneVerified: false, createdAt: new Date(), updatedAt: new Date(),
}).insertedId;

// 2) Location đang có chủ = Vendor A (để test TRANSFER sang B / REVOKE)
const loc = db.locations.insertOne({
  submittedBy: vA, ownerId: vA,
  name: 'Quán Tranh Chấp Test', description: 'Địa điểm test luồng phân xử tranh chấp',
  address: '123 Test Street', geo: { type: 'Point', coordinates: [105.84, 21.02] },
  source: 'VENDOR', categoryId: ObjectId('<categoryId thật>'),
  status: 'PUBLISHED', isDuplicate: false, isSuspectedDuplicate: false, viewCount: 0,
  subCategoryIds: [], images: [], createdAt: new Date(), updatedAt: new Date(),
}).insertedId;

// 3) Dispute OPEN giữa A (chủ hiện tại) và B (người khiếu nại), kèm evidence 2 phía
db.disputes.insertOne({
  locationId: loc, vendorAId: vA, vendorBId: vB,
  evidenceA: [{ url: 'https://x/licenseA.pdf', fileType: 'DOCUMENT' }],         // A: giấy phép
  evidenceB: [{                                                                 // B: on-site proof
    url: 'https://x/onsiteB.jpg', fileType: 'IMAGE',
    geo: { type: 'Point', coordinates: [105.84, 21.02] },
    accuracyMeters: 8, capturedAt: new Date(),
  }],
  status: 'OPEN', createdAt: new Date(), updatedAt: new Date(),
});
```

> Theo **BR-53**, evidence của B (on-site proof, geotag, sai số 8m) **mạnh hơn** giấy phép của A → kịch bản hợp lý để Admin TRANSFER sang B. Test xong **xoá** record seed.

---

## 7. Chạy & test

```bash
# từ thư mục gốc repo (repo đã chuyển pnpm → npm)
npm run start:dev --workspace=api
# hoặc: npm run dev:api
```
1. Swagger `http://localhost:3000/api/docs` → `POST /api/auth/login` (ADMIN) → **Authorize** bằng access token.
2. Test 3 outcome (mỗi outcome cần **seed lại 1 dispute OPEN** vì sau khi xử là đóng):

| API | Body | Kỳ vọng |
|---|---|---|
| `GET /api/admin/disputes` | — | list dispute `OPEN`, populate location + A + B |
| `GET /api/admin/disputes/:id` | — | chi tiết + `evidenceA/evidenceB` |
| `PATCH /api/admin/disputes/:id/resolve` | `{ "outcome":"KEEP", "reason":"Bằng chứng B yếu" }` | `dispute.status=RESOLVED_KEEP`; `location.ownerId` **không đổi** |
| `PATCH .../:id/resolve` | `{ "outcome":"TRANSFER", "winnerId":"<vBId>", "reason":"On-site proof của B thắng (BR-53)" }` | `RESOLVED_TRANSFER`; `location.ownerId=<vBId>`; **`holdExpiresAt=null`** |
| `PATCH .../:id/resolve` | `{ "outcome":"TRANSFER", "reason":"thiếu winner" }` | **400** (TRANSFER thiếu `winnerId`) |
| `PATCH .../:id/resolve` | `{ "outcome":"TRANSFER", "winnerId":"<userId lạ>", "reason":"x" }` | **400** (winner không thuộc A/B) |
| `PATCH .../:id/resolve` | `{ "outcome":"REVOKE", "reason":"Cả 2 bên đều yếu", "fraudulent":true }` | `RESOLVED_REVOKE`; `location.ownerId=null` |
| `PATCH .../:id/resolve` (case đã đóng) | bất kỳ | **409** (không phán quyết lại) |
| token VENDOR / CUSTOMER | bất kỳ | **403** |
| không token | bất kỳ | **401** |

3. Kiểm DB sau mỗi lần resolve (mongosh):
```js
// 🔑 BR-56 — sau TRANSFER, holdExpiresAt PHẢI không được set:
db.locations.findOne({ _id: loc }, { ownerId: 1, holdExpiresAt: 1 });
// → ownerId = vB, holdExpiresAt = undefined/null  ✅

// REVOKE → no-owner, và claim PENDING mới chèn được (đường claim mở lại):
db.locations.findOne({ _id: loc }, { ownerId: 1 });   // ownerId = null
// thử chèn 1 claim PENDING — KHÔNG bị unique index chặn:
db.claim_requests.insertOne({ vendorId: vB, locationId: loc, type:'CLAIM_EXISTING_LOCATION',
  evidenceFiles: [], otpVerified: false, status: 'PENDING', createdAt: new Date(), updatedAt: new Date() });

// Audit: mỗi resolve có 1 doc, diff.holdExpiresAt = null ở nhánh TRANSFER:
db.audit_logs.find({ targetCollection: 'disputes' }).sort({ createdAt: -1 }).limit(3);

// Notification: mỗi resolve sinh 2 doc (cho A và B):
db.notifications.find({ type: 'DISPUTE_RESOLVED' }).sort({ createdAt: -1 }).limit(4);

// Trust (WDP-33 đã xong — chạy THẬT): sau TRANSFER, winner có 1 trust_event & điểm +5:
db.trust_events.find({ refCollection: 'disputes' }).sort({ createdAt: -1 }).limit(4);
db.users.findOne({ _id: vB }, { trustScore: 1, trustLevel: 1 });  // +5 sau khi thắng
```
Trust: Trust Engine (WDP-33) **đã chạy thật** — điểm & `trust_events` cập nhật ngay. `TrustEventType` cho dispute là **map gần đúng** (§3.5), **chốt với Trung**.

---

## 8. Checklist nghiệm thu (map DoD + invariant)

**DoD**
- [ ] `KEEP` → `RESOLVED_KEEP`, `location.ownerId` **không đổi** (no-owner giữ no-owner nếu 2 bên yếu).
- [ ] `TRANSFER` → `RESOLVED_TRANSFER`, `location.ownerId = winnerId`.
- [ ] **🔑 `TRANSFER` ⇒ `location.holdExpiresAt` KHÔNG được set** (null/undefined) — kiểm tận DB. **(điểm review #1, BR-56)**
- [ ] `TRANSFER` chặn khi thiếu `winnerId` (400) và khi `winnerId` không thuộc A/B (400).
- [ ] `REVOKE` → `RESOLVED_REVOKE`, `location.ownerId = undefined`; sau đó **chèn được claim PENDING mới** (BR-54 mở lại claim).
- [ ] `adminDecision { decidedBy, reason, decidedAt }` được ghi đúng.
- [ ] **Notify cả A & B** (2 doc `notifications` mỗi lần resolve) — M3 qua port.
- [ ] **AuditLog** ghi mỗi phán quyết, `diff` có `disputeStatus` + `ownerId` (bao gồm `from` = chủ cũ, để F28/WDP-32 đọc đúng `diff.ownerId.from` mà khôi phục) + `holdExpiresAt` (I4/BR-43).

**Invariant**
- [ ] **I4** — mọi resolve → 1 AuditLog bất biến.
- [ ] **I5** — owner chỉ đổi qua transfer được Admin vetted; REVOKE không tự gán chủ mới.
- [ ] **I8** — KHÔNG `user.trustScore += ...` ở service; chỉ gọi `TrustEngineService.recordEvent(...)`.
- [ ] Trust dùng đúng enum thật: TRANSFER→`CORRECT_REPORT`, REVOKE(gian lận)→`VIOLATING_CONTENT_REMOVED` (KHÔNG dùng `VALID_REPORT`/`CONTENT_REJECTED` — không tồn tại, lỗi compile).
- [ ] Chỉ `ADMIN` truy cập (`AdminGuard`); VENDOR/CUSTOMER → 403; no-token → 401.
- [ ] Không phán quyết lại dispute đã đóng (409).
- [ ] Có `// TODO: depends on WDP-7` ở seam Notification và `// TODO: depends on F31/WDP-35` (ban).
- [ ] Có `// RULE-AMBIGUOUS:` tại chỗ chọn `TrustEventType` cho dispute (§3.5).

---

## 9. Việc cần chốt với team (dependencies)

1. **Nguồn mở dispute (F22 Trung / F24 Dương):** một `Dispute OPEN` thường do **F22** (report "wrong owner" — AF11.1) hoặc **F24** (review claim thấy đã có chủ khác — EF20.1) tạo. Cả hai đang `To Do` → mình **seed tay** để test trước (§6). Khi 2 ticket đó xong, chốt: ai set `vendorAId`/`vendorBId` (A = chủ hiện tại, B = người khiếu nại?) và copy evidence từ report/claim sang `evidenceA/evidenceB` ở khâu nào.
2. **Sync M2 với Trung (WDP-33 — đã xong):** enum thật KHÔNG có event riêng cho dispute (chỉ 6 giá trị). Mình đang **map gần đúng**: bên thắng/được chuyển quyền → `CORRECT_REPORT` (+5); chủ gian lận bị revoke → `VIOLATING_CONTENT_REMOVED` (−10); (tuỳ chọn) bên thách thức sai → `FALSE_REPORT` (−10). **Chốt với Trung** xem có đúng ý nghĩa không hoặc xin bổ sung enum riêng cho dispute — đây là chỗ `RULE-AMBIGUOUS`. (Trust Engine đã chạy thật nên phải gọi đúng tên enum, kẻo lỗi compile.)
3. **Sync M3 với Đăng (WDP-7 — chưa xong):** chốt `notify(...)` cho `type: 'DISPUTE_RESOLVED'` (template + kênh). Stub của mình hiện chỉ in-app; khi WDP-7 xong đổi `useClass` sang service M3 thật.
4. **Quan hệ với F26 (WDP-30, Dương):** transfer ở F27 **dùng chung khái niệm "đổi owner" nhưng KHÔNG hold** (BR-56). Khi mình cũng làm F26, nhớ: hold **chỉ** bật ở F26 (grant/auto-transfer), tuyệt đối không ở F27.
5. **Revoke mở lại claim (F27 → F23/WDP-27, Dương):** confirm với chính mình rằng sau revoke, `claim_requests` không còn PENDING nên F23 nhận claim mới — đã verify bằng test §7.
6. **Ban escalation (F31/WDP-35, Trung):** case chủ gian lận → revoke + đề xuất ban. Mình **chỉ** để seam `dto.fraudulent` + TODO; logic ban là của Trung.
7. **Appeal (F28/WDP-32, Dương):** mọi outcome F27 đều **appeal được** (1 lần, 14 ngày, Admin khác xử). Mình sẽ làm F28 sau; ở F27 chỉ cần nhắc người dùng trong message notify.
8. **Audit `diff.ownerId.from` cho appeal (F28/WDP-32):** khi REVOKE/TRANSFER phải ghi `diff.ownerId.from` = chủ cũ, để F28 đọc đúng key đó mà khôi phục owner nếu appeal thắng (OVERTURNED). Đừng bỏ field này, và đừng đổi tên key.
9. **UI Admin dispute** nằm ở `web` (Next.js 15 + MUI) — tách khỏi backend; bàn giao contract API ở §7 cho người làm web nếu mình không làm.

---

## 10. Thứ tự code (commit nhỏ)

1. Notification stub (`notification.port.ts`) + DTO (`resolve-dispute.dto.ts`, `list-disputes.dto.ts`).
2. `dispute.module.ts` + nối `AppModule` (dùng `AdminGuard` + `TrustEngineModule` có sẵn; chỉ Notification là stub).
3. Seed 1 admin + 2 vendor + 1 location(owner=A) + 1 dispute OPEN (§6).
4. `getQueue` + `getDetail` + controller GET → test list/detail + 403/401.
5. `resolve` nhánh **KEEP** → test status, owner không đổi.
6. `resolve` nhánh **TRANSFER** → test owner=winner + **verify `holdExpiresAt` null** (BR-56) + 400 cases.
7. `resolve` nhánh **REVOKE** → test no-owner + chèn được claim PENDING mới (BR-54).
8. Gắn `TrustEngineService.recordEvent(...)` + `notify(A,B)` + audit vào `resolve()`.
9. Chạy full checklist §8.
10. PR → review → chuyển WDP-31 sang Done.

```bash
git checkout -b WDP-31-dispute
# commit nhỏ theo §10
git push -u origin WDP-31-dispute
```
> KHÔNG commit `/guideline` (đã gitignore) và record seed tạm.
