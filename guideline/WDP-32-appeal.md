# WDP-32 — F28: Kháng cáo (Appeal) — Hướng dẫn tự triển khai (manual)

> Tài liệu cá nhân, **đã gitignore** (`/guideline/`). Không commit.
> **Tự chứa:** đọc file này là code được, **không cần mở Jira hay file nghiệp vụ (SPECS/SRS)**.
> ✅ Ticket này là **"build cuối"**: nó kháng cáo lại các quyết định của F15/F24/F27 (của bạn) và F16/F22/F31 (của người khác). Bạn **xây đầy đủ cơ chế kháng cáo** (nộp → dedupe → hạn 14 ngày → admin khác → lật trạng thái + audit + notify) và **chạy được end-to-end cho LOCATION_REJECTED** (WDP-19, của bạn); các loại phụ thuộc ticket chưa xong thì **stub `// TODO: depends on Fxx`**.
> ✅ KHÔNG tự build Trust/Notification — Trust (M2) đã xong nên **gọi trực tiếp** `TrustEngineService.recordEvent(...)`; Notification (M3) chưa xong nên tạm dùng **stub** qua port (xem §1).

---

## 📖 Trước khi code — thuật ngữ & bối cảnh (đọc 1 lần)

Bạn đang làm **cơ chế kháng cáo (appeal)**. Khi Admin ra 1 quyết định "bất lợi" cho user — từ chối địa điểm, từ chối claim, ẩn địa điểm trùng, thu hồi quyền sở hữu, gỡ review, ban tài khoản — user có quyền **kháng cáo** (khiếu nại) 1 lần. Một Admin **KHÁC** sẽ xem lại: nếu thấy sai thì **OVERTURNED** (lật lại → khôi phục trạng thái trước quyết định); nếu thấy đúng thì **UPHELD** (giữ nguyên). Mỗi lần xử phải: (1) đổi trạng thái appeal, (2) khôi phục target nếu OVERTURNED, (3) **báo** người kháng cáo, (4) **ghi audit log**.

**4 trụ cột của F28 (thuộc luôn — đây là "linh hồn" của ticket):**
- **BR-64 — once per decision:** mỗi quyết định chỉ được kháng cáo **đúng 1 lần**. DB đã có **unique index `{targetCollection, targetId}`** ép cứng; bạn vẫn pre-check để trả lỗi đẹp.
- **BR-65 — different admin:** Admin xét kháng cáo **PHẢI khác** Admin ra quyết định gốc (chống thiên vị). So `req.user.userId` (người xét) với id Admin gốc → trùng thì chặn 403.
- **BR-66 — 14-day window:** chỉ nhận kháng cáo trong **14 ngày** kể từ thời điểm ra quyết định gốc. Quá hạn → chặn khi nộp.
- **BR-67 — OVERTURNED → restore:** kháng cáo thắng thì **khôi phục trạng thái trước** quyết định; UPHELD thì **không đổi gì**.

**Thuật ngữ sẽ gặp:**
- **AppealType (6 loại)** = 6 kiểu quyết định được phép kháng cáo: `LOCATION_REJECTED`, `CLAIM_REJECTED`, `DUPLICATE_HIDDEN`, `OWNERSHIP_REVOKED`, `REVIEW_REMOVED`, `USER_BANNED` (enum trong `common.enums.ts`).
- **AppealStatus** = `PENDING` (chờ xét) / `OVERTURNED` (thắng) / `UPHELD` (giữ nguyên).
- **targetCollection / targetId** = collection + id của **đối tượng bị quyết định** (location/claim/dispute/review/user). Dùng cho unique index (BR-64) + tra audit.
- **audit log** = nhật ký "admin nào, làm gì, lên đối tượng nào, lúc nào". Với `Location`/`Review`/`User` (không lưu ai quyết định) thì đây là **nguồn duy nhất** để biết Admin gốc + mốc thời gian → phục vụ BR-65/BR-66.
- **trustScore / trustLevel** = "điểm uy tín" & "hạng" của user. Bạn **không tự tính**, mà gọi **Trust Engine** (xem dưới).

**Invariant (quy tắc bất biến, không được phá):**
- **I1 — no hard delete:** hệ thống **không xoá cứng** bản ghi. Nên "khôi phục" (OVERTURNED) = **lật `status` ngược lại** (VD `REJECTED → PUBLISHED`), **KHÔNG** insert lại record đã xoá.
- **I4 — audit:** mọi hành động Admin (kể cả OVERTURNED lẫn UPHELD) → ghi `audit_logs`.
- **I8 — trust qua M2:** đổi điểm trust chỉ được qua `TrustEngineService.recordEvent(...)`. Viết tay `user.trustScore += ...` = **fail review**.

**Dùng lại vs stub (tổng quan — chi tiết ở §1.2):**

| Nhóm | Thành phần | Bạn làm gì |
|---|---|---|
| ♻️ **Dùng lại** (đã có thật trong repo) | **AdminGuard** (`common/guard/admin.guard.ts`), **Trust Engine** (`modules/trust-engine/`), **Schema** (`common/schemas/*`, gồm `appeal.schema.ts` + unique index) | Import & gọi trực tiếp — **KHÔNG tự dựng lại**. |
| 🩹 **Stub** (module M3 chưa xong) | **Notification** (WDP-7, Đăng) | Tạm ghi 1 doc `notifications` qua `NotificationPort`; `// TODO: depends on WDP-7`. |
| 🧩 **Stub-per-branch** (ticket nguồn chưa xong) | **Restore handler** cho `DUPLICATE_HIDDEN` (F16), `REVIEW_REMOVED` (F22), `USER_BANNED` (F31) | Cơ chế bao quanh làm THẬT & test được; từng nhánh dispatcher stub `// TODO: depends on Fxx`. Nhánh `LOCATION`/`CLAIM`/`OWNERSHIP` (ticket của bạn) làm THẬT. |

---

## 0. Tóm tắt task

| | |
|---|---|
| **Issue** | [WDP-32](https://fptp.atlassian.net/browse/WDP-32) — `[S4] F28 — Kháng cáo` |
| **Quan trọng** | Cao · Sprint S4 · Owner Dương · `To Do` · ticket "build cuối" |
| **Mô tả** | **Once per decision**, **cửa sổ 14 ngày**, **một Admin KHÁC** xét; áp cho: duplicate-hide / claim reject / location reject / revoke / review removal / ban; `OVERTURNED` → khôi phục trạng thái trước. |
| **Đụng tới** | `api` (module `appeals` mới) + `web` (Admin queue — tách riêng) |
| **DoD** | (1) Nộp kháng cáo **kèm bằng chứng**; (2) Một quyết định có thể bị **OVERTURNED → khôi phục** trạng thái trước. |

### Phân rã DoD theo 4 trụ cột (BR-63..67)
1. **Nộp kháng cáo** (`POST`) kèm `type` + `targetId` + evidence files → tạo `Appeal{status: PENDING}`.
2. **BR-64 — once per decision:** chặn nộp lần 2 cho cùng object (unique index `{targetCollection, targetId}`).
3. **BR-66 — 14 ngày:** `appealDeadline = thời điểm ra quyết định gốc + 14 ngày`; quá hạn → từ chối nộp.
4. **BR-65 — Admin KHÁC xét (chống thiên vị):** admin giải quyết (`adminDecision.decidedBy`) **PHẢI khác** admin ra quyết định gốc.
5. **BR-67 — OVERTURNED → khôi phục** trạng thái trước theo `AppealType` (dispatcher). **UPHELD → không đổi gì.**
6. Cả 2 nhánh → **gọi M3** (notify người kháng cáo) + **ghi AuditLog** (I4).

---

## 1. ⚠️ ĐỌC KỸ — cái gì TỰ BUILD, cái gì chỉ GỌI / TÁI DÙNG

### 1.1. ⚠️⚠️ CẢNH BÁO SPECS — phải mở rộng BR-63 → BR-63..67 TRƯỚC buổi bảo vệ

> **Cảnh báo riêng của ticket này — bắt buộc đưa lên đầu guide.**
>
> F28 dựa trên **BR-63..67** (4 trụ cột ở phần thuật ngữ trên) nhưng **tài liệu nghiệp vụ (SPECS) hiện chỉ có BR-63** (kháng cáo viết gọn 1 dòng). Nếu không vá, hội đồng sẽ thấy **một ticket trích dẫn rule mà spec không có** → mất điểm "consistency" của tài liệu. Đây là **lỗ hổng tài liệu, KHÔNG được giải quyết bởi code đêm nay** → vẫn phải flag.
>
> **HÀNH ĐỘNG (chốt với cả nhóm — đây là việc tài liệu, không phải việc code):** tách BR-63 thành 5 rule trong tài liệu SPECS:
>
> | Rule | Nội dung đề xuất |
> |---|---|
> | **BR-63** | **Scope** — chỉ 6 loại quyết định được kháng cáo: location reject, claim reject, duplicate-hide, ownership revoke, review removal, user ban (= enum `AppealType`). |
> | **BR-64** | **Once per decision** — mỗi object đã có quyết định chỉ được kháng cáo **đúng 1 lần** (unique `{targetCollection, targetId}`). |
> | **BR-65** | **Different Admin** — admin xét kháng cáo phải **khác** admin ra quyết định gốc (chống thiên vị). |
> | **BR-66** | **14-day window** — chỉ nhận kháng cáo trong **14 ngày** kể từ thời điểm quyết định gốc. |
> | **BR-67** | **OVERTURNED → restore** — kháng cáo thành công thì **khôi phục trạng thái trước** quyết định; UPHELD thì giữ nguyên. |
>
> Cho tới khi SPECS được vá, **trong code mọi chỗ enforce 4 trụ cột này phải có comment `// BR-64/65/66/67`** để reviewer thấy ý đồ dù spec chưa có.

### 1.2. Bảng phân loại TỰ BUILD / GỌI / TÁI DÙNG

| Thành phần | Đây là gì | Bạn làm gì |
|---|---|---|
| **Cơ chế Appeal** (submit, dedupe, deadline, different-admin, restore dispatcher, audit, notify) | Đây **chính là** WDP-32 | ✅ **TỰ BUILD ĐẦY ĐỦ** (module `appeals`). |
| **AdminGuard** (chặn non-admin) | Hạ tầng phân quyền admin, đã có sẵn `common/guard/admin.guard.ts` (module `admin-category` đang dùng) | ♻️ **TÁI DÙNG.** Endpoint **resolve/queue** (chỉ ADMIN): `@UseGuards(AuthGuard('jwt-at'), AdminGuard)` + thêm `AdminGuard` vào providers. Endpoint **submit** (người kháng cáo, mọi user đăng nhập): chỉ `@UseGuards(AuthGuard('jwt-at'))`. **KHÔNG tự dựng RolesGuard.** |
| **Trust (cộng/trừ điểm)** | **M2 = [WDP-33](https://fptp.atlassian.net/browse/WDP-33)**, owner **Trung** — ✅ **ĐÃ XONG** | ✅ **GỌI TRỰC TIẾP** `TrustEngineService.recordEvent(...)`: `imports:[SchemaModule, TrustEngineModule]`, inject `private readonly trust: TrustEngineService`. **KHÔNG dùng port/stub trust nữa.** (Xem note trust ở §Bước 3 — mặc định appeal **chưa** chấm điểm.) |
| **Notification** | **M3 = [WDP-7](https://fptp.atlassian.net/browse/WDP-7)**, owner **Đăng** — ⏳ **CHƯA XONG** | 🩹 **STUB.** **GỌI** `notify(...)` qua `NOTIFICATION_PORT` (tái dùng `common/contracts/notification.port.ts` từ WDP-19). `// TODO: depends on WDP-7`. |
| **AuditLog** | I4/BR-43: util chung từ S1 nhưng repo **chưa có util** (dashboard là WDP-39, Trung, S4) | ⚠️ Tạm **ghi trực tiếp** `audit_logs` (model đã đăng ký ở `SchemaModule`). Báo Trung để sau gộp về util chung. |
| **Restore handler cho các loại phụ thuộc ticket chưa xong** | F16/F22/F31 (Long/Trung) phần lớn `To Do` | 🧩 **STUB từng nhánh** dispatcher `// TODO: depends on Fxx` nhưng cơ chế bao quanh phải thật & test được. |

> **Invariant I8 (non-negotiable):** mọi thay đổi điểm trust **qua M2** (`recordEvent`), không cộng/trừ điểm tay.
> **Invariant I1 (no hard delete):** khôi phục = **lật `status` ngược lại**, KHÔNG insert lại record đã xoá cứng (vì đã không xoá cứng).
> **Invariant I4 (audit):** mọi hành động admin (kể cả OVERTURNED và UPHELD) → ghi `audit_logs`.

**Không bị chặn:** data contract khoá ở WDP-5 (Done). `appeal.schema.ts` đã có sẵn đủ field cần (`type`, `targetCollection`, `targetId`, `appellantId`, `additionalEvidenceFiles[]`, `status`, `originalDecisionReason`, `appealDeadline`, `adminDecision`) + **unique index `{targetCollection, targetId}`** đã khai sẵn (`AppealSchema.index(..., { unique: true })` ở cuối file) → BR-64 được DB ép cứng.

---

## 2. Convention repo (bám theo cho khớp)

1. **Service trả object, KHÔNG throw:** `{ success, statusCode?, message?, ...data }` (xem [auth.service.ts](apps/api/src/modules/auth/auth.service.ts)).
2. **Controller** map object đó sang `HttpException` (xem [auth.controller.ts](apps/api/src/modules/auth/auth.controller.ts) — pattern `if (result.statusCode === 409) throw new ConflictException(...)`).
3. **Auth:** `@UseGuards(AuthGuard('jwt-at'))`, lấy user qua `req.user.userId`. ⚠️ Token **chỉ có `userId`** ([at.strategy.ts](apps/api/src/common/guard/at.strategy.ts)) → role KHÔNG ở token → `AdminGuard` tự query DB lấy role, bạn không cần lo. (Strategy `'jwt-at'` đã được `AuthModule` đăng ký global → **không** cần thêm `AtStrategy` vào providers.)
4. **Module:** `imports: [SchemaModule, TrustEngineModule]` (SchemaModule để có mọi Model; TrustEngineModule để inject `TrustEngineService`); providers gồm service + `AdminGuard` (vì controller có endpoint admin).
5. **DTO:** `class-validator`. `ValidationPipe({ whitelist: true, transform: true })` đã bật global ([main.ts](apps/api/src/main.ts)).
6. **Prefix `api`** → route thật `/api/...`. Swagger `/api/docs` (đã bật `addBearerAuth`).
7. Message tiếng Việt có dấu.
8. **Enum lấy từ `common.enums.ts`** — không hardcode magic string.

---

## 3. Quyết định kỹ thuật (chốt trước khi code)

### 3.1. Map `AppealType` → collection mục tiêu + nguồn "decider gốc"

Đây là bảng trung tâm. **`targetCollection`** dùng cho unique index + audit. **"Decider gốc"** là để enforce BR-65 (admin khác).

| `AppealType` | `targetCollection` | Nguồn lấy **admin ra quyết định gốc** (BR-65) | Khôi phục khi OVERTURNED (BR-67) | Phụ thuộc |
|---|---|---|---|---|
| `LOCATION_REJECTED` | `location_requests` | ✅ **Model B:** `locationRequest.reviewerId` (có sẵn, khỏi tra `audit_logs`) | phiếu `REJECTED → APPROVED` + `location.status` REJECTED → PUBLISHED | **F15/WDP-19 (của bạn) ✅** |
| `CLAIM_REJECTED` | `claim_requests` | `claimRequest.adminDecision.decidedBy` ✅ | mở lại/duyệt claim → set `ownerId` cho location | **F24/WDP-28 (của bạn) ✅** |
| `OWNERSHIP_REVOKED` | `disputes` *(hoặc `locations`, xem §3.4)* | `dispute.adminDecision.decidedBy` ✅ | khôi phục `location.ownerId` = chủ cũ (lấy id chủ cũ từ audit/dispute) | **F27/WDP-31 (của bạn) ✅** |
| `DUPLICATE_HIDDEN` | `locations` | từ **`audit_logs`** (`action: LOCATION_HIDE_DUPLICATE`, `actorId`) | `status` HIDDEN → PUBLISHED + clear `isDuplicate` | F16/WDP-20 (Long) — `To Do` → **STUB** |
| `REVIEW_REMOVED` | `reviews` | từ **`audit_logs`** (`action: REVIEW_REMOVE`, `actorId`) | `status` REMOVED_BY_ADMIN → PUBLISHED (recompute rating) | F22/WDP-26 (Trung) — `To Do` → **STUB** |
| `USER_BANNED` | `users` | từ **`audit_logs`** (`action: USER_BAN`, `actorId`) | `status` BANNED → ACTIVE | F31/WDP-35 (Trung) — `To Do` → **STUB** |

> **Tại sao nhiều nguồn decider khác nhau?** `ClaimRequest`, `Dispute` có embedded `adminDecision.decidedBy` → đọc trực tiếp. `LocationRequest` (Model B) có `reviewerId` → cũng đọc trực tiếp. Còn `Review`, `User` và **duplicate-hide** (`DUPLICATE_HIDDEN` xử thẳng trên `locations`) **không** lưu ai quyết định → buộc tra `audit_logs` (`actorId`, theo I4). Đây là lý do **audit không được defer**.

### 3.2. BR-66 — tính `appealDeadline`

`appealDeadline = originalDecisionTime + 14 ngày`. `originalDecisionTime` lấy theo cùng nguồn với decider:
- claim/dispute → `adminDecision.decidedAt`.
- location-reject → `locationRequest.reviewedAt` (Model B).
- review/user/duplicate-hide → `createdAt` của bản ghi `audit_logs` tương ứng.

Khi **nộp**: nếu `now > appealDeadline` → **từ chối** (`410`/`400`). Lưu luôn `appealDeadline` vào document để hiển thị + audit.

### 3.3. BR-65 — different-admin (chống thiên vị)

Khi admin **giải quyết** kháng cáo: so `resolverAdminId` (người gọi API, `req.user.userId`) với `originalDeciderId`. **Bằng nhau → chặn (`403`).** Đây là rule dễ bị quên nhất → có hẳn hàm `resolveAppeal` chặn ngay đầu.

### 3.4. Điểm RULE-AMBIGUOUS (ghi comment cho reviewer)

- **`OWNERSHIP_REVOKED.targetCollection`**: revoke xảy ra trong luồng dispute (F27). Có thể coi target là `disputes` (đối tượng quyết định) hoặc `locations` (đối tượng bị ảnh hưởng). **Chọn `disputes`** (khớp nơi `adminDecision` sống). → `// RULE-AMBIGUOUS: revoke target = disputes vs locations; chọn disputes (nơi có adminDecision)`.
- **Chủ cũ khi khôi phục revoke**: `Location.ownerId` đã bị set null lúc revoke (F27 BR-54). ID chủ cũ phải lấy từ `dispute` (bên thắng/bên bị revoke) hoặc từ `audit_logs.diff.ownerId.from`. → khi F27 ghi audit nhớ đính `diff: { ownerId: { from, to } }`. Hiện stub đọc `audit_logs.diff`.
- **`originalDecisionReason`**: copy từ `adminDecision.reason` (claim/dispute) hoặc `audit_logs.reason` (location/review/user) để hiển thị cho người kháng cáo.

---

## 4. Cây file

```
apps/api/src/
├─ common/
│  ├─ guard/admin.guard.ts                 (♻️ TÁI DÙNG — đã có sẵn trong repo)
│  └─ contracts/
│     └─ notification.port.ts              (♻️ TÁI DÙNG từ WDP-19 — NOTIFICATION_PORT + NotificationStub)
├─ modules/appeals/
│  ├─ dto/
│  │  ├─ submit-appeal.dto.ts              (TẠO) type + targetId + evidence[]
│  │  ├─ list-appeals.dto.ts               (TẠO) filter cho admin queue
│  │  └─ resolve-appeal.dto.ts             (TẠO) decision OVERTURNED|UPHELD + reason
│  ├─ appeal-restore.service.ts            (TẠO) dispatcher khôi phục theo AppealType
│  ├─ appeal.service.ts                    (TẠO) submit + resolve (dedupe/deadline/different-admin)
│  ├─ appeal.controller.ts                 (TẠO) user submit (AuthGuard) + admin queue/resolve (AdminGuard)
│  └─ appeal.module.ts                     (TẠO)
└─ app.module.ts                           (SỬA: thêm AppealsModule)
```

> **KHÔNG cần** tạo `roles.guard.ts`/`roles.decorator.ts` (dùng `AdminGuard` có sẵn) và **KHÔNG cần** `trust.port.ts` (Trust Engine đã thật, gọi trực tiếp). Chỉ còn Notification là stub.
> Khi M3 (WDP-7) xong: đổi `useClass` `NOTIFICATION_PORT` trong `appeal.module.ts` từ stub sang service thật. Interface giữ nguyên nên service của bạn không phải sửa.

---

## 5. Triển khai

### Bước 0 — Hạ tầng dùng lại (không code lại)

- **AdminGuard** đã có sẵn `common/guard/admin.guard.ts` (module `admin-category` đang dùng) — chỉ cần `@UseGuards(AuthGuard('jwt-at'), AdminGuard)` + thêm `AdminGuard` vào providers. **Không** tự dựng RolesGuard.
- **Trust Engine (M2)** đã xong `modules/trust-engine/` — `imports:[TrustEngineModule]`, inject `TrustEngineService`, gọi `recordEvent(...)` **trực tiếp**. Không cần port/stub trust.
- **NotificationPort** (M3 chưa xong) đã có ở [WDP-19 guide](WDP-19-admin-duyet-dia-diem.md) §Bước 1 (`common/contracts/notification.port.ts`). Nếu nhánh WDP-19 đã merge → import thẳng; nếu chưa → copy y nguyên file đó. **Không sửa interface** (đã sync với Đăng).

Nhắc lại port Notification (để guide tự đủ — **không tạo trùng nếu đã có**):

```ts
// common/contracts/notification.port.ts (đã có từ WDP-19)
export const NOTIFICATION_PORT = Symbol('NOTIFICATION_PORT');
export interface NotificationPort {
  notify(params: {
    userId: string; type: string; title: string; body: string;
    refCollection?: string; refId?: string;
  }): Promise<void>;
}
```

---

### Bước 1 — DTO

**`modules/appeals/dto/submit-appeal.dto.ts`** — người dùng nộp kháng cáo (type + targetId + bằng chứng):

```ts
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsEnum, IsIn, IsMongoId, IsOptional,
  IsString, MaxLength, MinLength, ValidateNested,
} from 'class-validator';
import { AppealType } from 'src/common/schemas/common.enums';

// Khớp embedded EvidenceFile (common.embedded.ts)
export class EvidenceFileDTO {
  @IsString() url!: string;

  @IsIn(['IMAGE', 'VIDEO', 'DOCUMENT'])
  fileType!: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
}

export class SubmitAppealDTO {
  @IsEnum(AppealType, { message: 'Loại kháng cáo không hợp lệ' })
  type!: AppealType;

  // ID của đối tượng bị quyết định (location/claim/dispute/review/user)
  @IsMongoId({ message: 'targetId không hợp lệ' })
  targetId!: string;

  // Lý do người dùng trình bày (đi vào notify + audit)
  @IsOptional() @IsString() @MinLength(10) @MaxLength(1000)
  argument?: string;

  // Bằng chứng bổ sung — DoD: "nộp kèm bằng chứng"
  @IsOptional() @IsArray() @ArrayMaxSize(5)
  @ValidateNested({ each: true }) @Type(() => EvidenceFileDTO)
  additionalEvidenceFiles?: EvidenceFileDTO[];
}
```

**`modules/appeals/dto/resolve-appeal.dto.ts`** — admin xử lý (OVERTURNED | UPHELD + lý do):

```ts
import { IsEnum, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { AppealStatus } from 'src/common/schemas/common.enums';

export class ResolveAppealDTO {
  // Chỉ cho 2 trạng thái kết thúc; service chặn lại PENDING (xem resolve()).
  @IsEnum(AppealStatus, { message: 'Quyết định phải là OVERTURNED hoặc UPHELD' })
  decision!: AppealStatus;

  @IsString() @IsNotEmpty({ message: 'Phải nhập lý do quyết định' })
  @MinLength(5) @MaxLength(500)
  reason!: string;
}
```

**`modules/appeals/dto/list-appeals.dto.ts`** — queue cho admin:

```ts
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { AppealStatus, AppealType } from 'src/common/schemas/common.enums';

export class ListAppealsDTO {
  @IsOptional() @IsEnum(AppealStatus)
  status?: AppealStatus;

  @IsOptional() @IsEnum(AppealType)
  type?: AppealType;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 20;
}
```

---

### Bước 2 — Restore dispatcher (BR-67) — thật cho LOCATION, stub cho loại chưa có ticket

> Tách riêng ra service để dispatcher gọn + dễ thay khi ticket nguồn xong. Mỗi nhánh trả `{ ok, message }` để service chính ghi audit `diff`.

**`modules/appeals/appeal-restore.service.ts`**

```ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import { ClaimRequest, ClaimRequestDocument } from 'src/common/schemas/claim-request.schema';
import { Dispute, DisputeDocument } from 'src/common/schemas/dispute.schema';
import { Review, ReviewDocument } from 'src/common/schemas/review.schema';
import { User, UserDocument } from 'src/common/schemas/user.schema';
import { AuditLog } from 'src/common/schemas/audit-log.schema';
import {
  AppealType, ClaimRequestStatus, LocationStatus, ReviewStatus, UserStatus,
} from 'src/common/schemas/common.enums';

export interface RestoreResult {
  ok: boolean;
  message: string;
  diff?: Record<string, any>; // để service chính đính vào audit
}

@Injectable()
export class AppealRestoreService {
  private readonly logger = new Logger('AppealRestore');

  constructor(
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
    @InjectModel(ClaimRequest.name) private claimModel: Model<ClaimRequestDocument>,
    @InjectModel(Dispute.name) private disputeModel: Model<DisputeDocument>,
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
  ) {}

  /** Dispatcher BR-67: OVERTURNED → khôi phục trạng thái trước, theo AppealType. */
  async restore(type: AppealType, targetId: Types.ObjectId): Promise<RestoreResult> {
    switch (type) {
      case AppealType.LOCATION_REJECTED:
        return this.restoreLocationRejected(targetId);
      case AppealType.CLAIM_REJECTED:
        return this.restoreClaimRejected(targetId);
      case AppealType.OWNERSHIP_REVOKED:
        return this.restoreOwnershipRevoked(targetId);
      case AppealType.DUPLICATE_HIDDEN:
        return this.restoreDuplicateHidden(targetId);
      case AppealType.REVIEW_REMOVED:
        return this.restoreReviewRemoved(targetId);
      case AppealType.USER_BANNED:
        return this.restoreUserBanned(targetId);
      default:
        return { ok: false, message: `AppealType không hỗ trợ: ${type as string}` };
    }
  }

  // ---- THẬT: LOCATION_REJECTED (F15/WDP-19, của bạn) ---------------------
  // BR-67: REJECTED → PUBLISHED (I1: lật status, không insert lại)
  private async restoreLocationRejected(id: Types.ObjectId): Promise<RestoreResult> {
    const loc = await this.locationModel.findById(id).exec();
    if (!loc) return { ok: false, message: 'Không tìm thấy địa điểm' };
    if (loc.status !== LocationStatus.REJECTED)
      return { ok: false, message: `Địa điểm không ở trạng thái REJECTED (đang ${loc.status})` };

    const from = loc.status;
    loc.status = LocationStatus.PUBLISHED;
    loc.rejectionReason = undefined;
    await loc.save();
    return {
      ok: true,
      message: 'Đã khôi phục địa điểm về PUBLISHED',
      diff: { status: { from, to: loc.status } },
    };
  }

  // ---- THẬT: CLAIM_REJECTED (F24/WDP-28, của bạn) ------------------------
  // BR-67: claim REJECTED → APPROVED + gán owner (đảo lại F24)
  private async restoreClaimRejected(id: Types.ObjectId): Promise<RestoreResult> {
    const claim = await this.claimModel.findById(id).exec();
    if (!claim) return { ok: false, message: 'Không tìm thấy yêu cầu claim' };
    if (claim.status !== ClaimRequestStatus.REJECTED)
      return { ok: false, message: `Claim không ở trạng thái REJECTED (đang ${claim.status})` };

    const from = claim.status;
    claim.status = ClaimRequestStatus.APPROVED;
    await claim.save();

    // Gán owner cho location (đúng BR-29 — như khi F24 approve)
    const loc = await this.locationModel.findById(claim.locationId).exec();
    if (loc) {
      loc.ownerId = claim.vendorId;
      await loc.save();
    }
    return {
      ok: true,
      message: 'Đã duyệt lại claim + gán owner',
      diff: {
        claimStatus: { from, to: claim.status },
        ownerId: { to: String(claim.vendorId) },
      },
    };
  }

  // ---- THẬT (một phần): OWNERSHIP_REVOKED (F27/WDP-31, của bạn) ----------
  // BR-67: khôi phục location.ownerId = chủ cũ.
  // RULE-AMBIGUOUS: id chủ cũ lấy từ audit_logs.diff.ownerId.from (F27 phải ghi diff này).
  private async restoreOwnershipRevoked(disputeId: Types.ObjectId): Promise<RestoreResult> {
    const dispute = await this.disputeModel.findById(disputeId).exec();
    if (!dispute) return { ok: false, message: 'Không tìm thấy dispute' };

    // Lấy chủ cũ từ audit của hành động revoke (F27 ghi diff.ownerId.from)
    const revokeLog = await this.auditLogModel
      .findOne({ targetCollection: 'disputes', targetId: disputeId, action: 'DISPUTE_REVOKE' })
      .sort({ createdAt: -1 }).lean().exec();
    const priorOwnerId = (revokeLog as any)?.diff?.ownerId?.from;
    if (!priorOwnerId)
      // TODO: depends on F27/WDP-31 — F27 cần ghi audit diff.ownerId.from khi revoke
      return { ok: false, message: 'Không xác định được chủ cũ để khôi phục (thiếu audit diff)' };

    const loc = await this.locationModel.findById(dispute.locationId).exec();
    if (!loc) return { ok: false, message: 'Không tìm thấy địa điểm của dispute' };
    const from = loc.ownerId ? String(loc.ownerId) : null;
    loc.ownerId = new Types.ObjectId(String(priorOwnerId));
    await loc.save();
    return {
      ok: true,
      message: 'Đã khôi phục quyền sở hữu cho chủ cũ',
      diff: { ownerId: { from, to: String(priorOwnerId) } },
    };
  }

  // ---- STUB: DUPLICATE_HIDDEN (F16/WDP-20, Long — To Do) -----------------
  private async restoreDuplicateHidden(id: Types.ObjectId): Promise<RestoreResult> {
    // TODO: depends on F16/WDP-20 — xác nhận cờ isDuplicate/HIDDEN do F16 set.
    // Cơ chế đã đúng hướng: HIDDEN → PUBLISHED + clear isDuplicate.
    const loc = await this.locationModel.findById(id).exec();
    if (!loc) return { ok: false, message: 'Không tìm thấy địa điểm' };
    if (loc.status !== LocationStatus.HIDDEN)
      return { ok: false, message: `Địa điểm không ở trạng thái HIDDEN (đang ${loc.status})` };

    const from = loc.status;
    loc.status = LocationStatus.PUBLISHED;
    loc.isDuplicate = false;
    await loc.save();
    return {
      ok: true,
      message: 'Đã bỏ ẩn địa điểm (gỡ cờ trùng)',
      diff: { status: { from, to: loc.status }, isDuplicate: { from: true, to: false } },
    };
  }

  // ---- STUB: REVIEW_REMOVED (F22/WDP-26, Trung — To Do) ------------------
  private async restoreReviewRemoved(id: Types.ObjectId): Promise<RestoreResult> {
    // TODO: depends on F22/WDP-26 (remove) + F19/WDP-23 (recompute rating)
    const review = await this.reviewModel.findById(id).exec();
    if (!review) return { ok: false, message: 'Không tìm thấy review' };
    if (review.status !== ReviewStatus.REMOVED_BY_ADMIN)
      return { ok: false, message: `Review không ở trạng thái REMOVED_BY_ADMIN (đang ${review.status})` };

    const from = review.status;
    review.status = ReviewStatus.PUBLISHED;
    await review.save();
    // TODO: depends on F19/WDP-23 — gọi recompute avg rating cho review.locationId
    return {
      ok: true,
      message: 'Đã khôi phục review về PUBLISHED (rating cần recompute — F19)',
      diff: { status: { from, to: review.status } },
    };
  }

  // ---- STUB: USER_BANNED (F31/WDP-35, Trung — To Do) --------------------
  private async restoreUserBanned(id: Types.ObjectId): Promise<RestoreResult> {
    // TODO: depends on F31/WDP-35 — xác nhận luồng ban set status=BANNED.
    const user = await this.userModel.findById(id).exec();
    if (!user) return { ok: false, message: 'Không tìm thấy người dùng' };
    if (user.status !== UserStatus.BANNED)
      return { ok: false, message: `Người dùng không ở trạng thái BANNED (đang ${user.status})` };

    const from = user.status;
    user.status = UserStatus.ACTIVE;
    await user.save();
    return {
      ok: true,
      message: 'Đã gỡ ban người dùng (BANNED → ACTIVE)',
      diff: { status: { from, to: user.status } },
    };
  }
}
```

---

### Bước 3 — AppealService (submit + resolve: dedupe / deadline / different-admin)

**`modules/appeals/appeal.service.ts`**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appeal, AppealDocument } from 'src/common/schemas/appeal.schema';
import { ClaimRequest, ClaimRequestDocument } from 'src/common/schemas/claim-request.schema';
import { Dispute, DisputeDocument } from 'src/common/schemas/dispute.schema';
import { AuditLog } from 'src/common/schemas/audit-log.schema';
import {
  AppealStatus, AppealType,
} from 'src/common/schemas/common.enums';
import { TrustEngineService } from 'src/modules/trust-engine/trust-engine.service';
import { NOTIFICATION_PORT, NotificationPort } from 'src/common/contracts/notification.port';
import { AppealRestoreService } from './appeal-restore.service';
import { SubmitAppealDTO } from './dto/submit-appeal.dto';
import { ListAppealsDTO } from './dto/list-appeals.dto';

const APPEAL_WINDOW_DAYS = 14; // BR-66

// AppealType → collection mục tiêu (cho unique index + audit). Xem §3.1.
const TARGET_COLLECTION: Record<AppealType, string> = {
  [AppealType.LOCATION_REJECTED]: 'locations',
  [AppealType.DUPLICATE_HIDDEN]: 'locations',
  [AppealType.CLAIM_REJECTED]: 'claim_requests',
  [AppealType.OWNERSHIP_REVOKED]: 'disputes',
  [AppealType.REVIEW_REMOVED]: 'reviews',
  [AppealType.USER_BANNED]: 'users',
};

// AppealType → action audit của quyết định GỐC (để tra decider khi target không có adminDecision)
const ORIGINAL_AUDIT_ACTION: Partial<Record<AppealType, string>> = {
  [AppealType.LOCATION_REJECTED]: 'LOCATION_REJECT',
  [AppealType.DUPLICATE_HIDDEN]: 'LOCATION_HIDE_DUPLICATE',
  [AppealType.REVIEW_REMOVED]: 'REVIEW_REMOVE',
  [AppealType.USER_BANNED]: 'USER_BAN',
};

interface OriginalDecision {
  deciderId?: string;   // BR-65
  decidedAt?: Date;     // BR-66
  reason?: string;      // → originalDecisionReason
}

@Injectable()
export class AppealService {
  constructor(
    @InjectModel(Appeal.name) private appealModel: Model<AppealDocument>,
    @InjectModel(ClaimRequest.name) private claimModel: Model<ClaimRequestDocument>,
    @InjectModel(Dispute.name) private disputeModel: Model<DisputeDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
    private readonly trust: TrustEngineService,
    @Inject(NOTIFICATION_PORT) private notification: NotificationPort,
    private restore: AppealRestoreService,
  ) {}

  /** Tra quyết định gốc: claim/dispute đọc adminDecision; còn lại tra audit_logs. */
  private async getOriginalDecision(
    type: AppealType, targetId: Types.ObjectId, targetCollection: string,
  ): Promise<OriginalDecision> {
    if (type === AppealType.CLAIM_REJECTED) {
      const c = await this.claimModel.findById(targetId).lean().exec();
      return {
        deciderId: c?.adminDecision?.decidedBy ? String(c.adminDecision.decidedBy) : undefined,
        decidedAt: c?.adminDecision?.decidedAt,
        reason: c?.adminDecision?.reason,
      };
    }
    if (type === AppealType.OWNERSHIP_REVOKED) {
      const d = await this.disputeModel.findById(targetId).lean().exec();
      return {
        deciderId: d?.adminDecision?.decidedBy ? String(d.adminDecision.decidedBy) : undefined,
        decidedAt: d?.adminDecision?.decidedAt,
        reason: d?.adminDecision?.reason,
      };
    }
    // location / review / user → audit_logs (I4 đảm bảo có actorId)
    const action = ORIGINAL_AUDIT_ACTION[type];
    const log = await this.auditLogModel
      .findOne({ targetCollection, targetId, ...(action ? { action } : {}) })
      .sort({ createdAt: -1 }).lean().exec();
    return {
      deciderId: (log as any)?.actorId ? String((log as any).actorId) : undefined,
      decidedAt: (log as any)?.createdAt,
      reason: (log as any)?.reason,
    };
  }

  // ===== SUBMIT (BR-64 dedupe + BR-66 deadline) ============================
  async submit(appellantId: string, dto: SubmitAppealDTO) {
    try {
      if (!Types.ObjectId.isValid(dto.targetId))
        return { success: false, statusCode: 400, message: 'targetId không hợp lệ' };

      const targetId = new Types.ObjectId(dto.targetId);
      const targetCollection = TARGET_COLLECTION[dto.type];

      // BR-64 — pre-check 1 kháng cáo / object (unique index sẽ chốt lần cuối ở DB)
      const existed = await this.appealModel
        .findOne({ targetCollection, targetId }).lean().exec();
      if (existed)
        return { success: false, statusCode: 409, message: 'Đối tượng này đã được kháng cáo trước đó' };

      // Tra quyết định gốc → deadline + reason gốc
      const original = await this.getOriginalDecision(dto.type, targetId, targetCollection);
      if (!original.decidedAt)
        return { success: false, statusCode: 404,
          message: 'Không tìm thấy quyết định gốc để kháng cáo (kiểm tra audit/decision)' };

      // BR-66 — cửa sổ 14 ngày
      const appealDeadline = new Date(
        original.decidedAt.getTime() + APPEAL_WINDOW_DAYS * 24 * 60 * 60 * 1000,
      );
      if (Date.now() > appealDeadline.getTime())
        return { success: false, statusCode: 400,
          message: `Đã quá hạn kháng cáo (${APPEAL_WINDOW_DAYS} ngày kể từ quyết định)` };

      // Tạo Appeal
      let appeal: AppealDocument;
      try {
        appeal = await this.appealModel.create({
          type: dto.type,
          targetCollection,
          targetId,
          appellantId: new Types.ObjectId(appellantId),
          additionalEvidenceFiles: dto.additionalEvidenceFiles ?? [],
          status: AppealStatus.PENDING,
          originalDecisionReason: original.reason,
          appealDeadline,
        });
      } catch (e: any) {
        // BR-64 — bắt duplicate-key nếu race qua được pre-check
        if (e?.code === 11000)
          return { success: false, statusCode: 409, message: 'Đối tượng này đã được kháng cáo trước đó' };
        throw e;
      }

      return {
        success: true,
        message: 'Đã gửi kháng cáo',
        appeal: { id: appeal._id, status: appeal.status, appealDeadline },
      };
    } catch (error) {
      console.log('submit appeal error:', error);
      return { success: false, statusCode: 500, message: 'Lỗi khi gửi kháng cáo' };
    }
  }

  // ===== ADMIN QUEUE =======================================================
  async list(query: ListAppealsDTO) {
    try {
      const page = query.page ?? 1, limit = query.limit ?? 20;
      const filter: Record<string, any> = {};
      if (query.status) filter.status = query.status;
      if (query.type) filter.type = query.type;

      const [items, total] = await Promise.all([
        this.appealModel.find(filter)
          .sort({ createdAt: 1 })
          .skip((page - 1) * limit).limit(limit)
          .populate('appellantId', 'fullName email')
          .lean().exec(),
        this.appealModel.countDocuments(filter).exec(),
      ]);
      return { success: true, total, page, limit, items };
    } catch (error) {
      console.log('list appeals error:', error);
      return { success: false, statusCode: 500, message: 'Lỗi khi lấy danh sách kháng cáo' };
    }
  }

  // ===== RESOLVE (BR-65 different-admin + BR-67 restore) ===================
  async resolve(
    appealId: string, resolverAdminId: string,
    decision: AppealStatus, reason: string,
  ) {
    try {
      if (!Types.ObjectId.isValid(appealId))
        return { success: false, statusCode: 400, message: 'ID kháng cáo không hợp lệ' };
      if (decision !== AppealStatus.OVERTURNED && decision !== AppealStatus.UPHELD)
        return { success: false, statusCode: 400, message: 'Quyết định phải là OVERTURNED hoặc UPHELD' };

      const appeal = await this.appealModel.findById(appealId).exec();
      if (!appeal) return { success: false, statusCode: 404, message: 'Không tìm thấy kháng cáo' };
      if (appeal.status !== AppealStatus.PENDING)
        return { success: false, statusCode: 409,
          message: `Kháng cáo đã được xử lý (${appeal.status})` };

      // BR-65 — admin xét PHẢI khác admin ra quyết định gốc (chống thiên vị)
      const original = await this.getOriginalDecision(
        appeal.type, appeal.targetId, appeal.targetCollection,
      );
      if (original.deciderId && original.deciderId === resolverAdminId)
        return { success: false, statusCode: 403,
          message: 'Bạn là người ra quyết định gốc, không được tự xét kháng cáo (BR-65)' };

      // BR-67 — OVERTURNED thì khôi phục trạng thái trước
      let restoreDiff: Record<string, any> | undefined;
      if (decision === AppealStatus.OVERTURNED) {
        const r = await this.restore.restore(appeal.type, appeal.targetId);
        if (!r.ok)
          return { success: false, statusCode: 409, message: `Không thể khôi phục: ${r.message}` };
        restoreDiff = r.diff;
      }

      // Ghi quyết định lên appeal
      appeal.status = decision;
      appeal.adminDecision = {
        decidedBy: new Types.ObjectId(resolverAdminId),
        reason,
        decidedAt: new Date(),
      };
      await appeal.save();

      // (1) Notify người kháng cáo (M3)
      const overturned = decision === AppealStatus.OVERTURNED;
      await this.notification.notify({
        userId: String(appeal.appellantId),
        type: overturned ? 'APPEAL_OVERTURNED' : 'APPEAL_UPHELD',
        title: overturned ? 'Kháng cáo được chấp nhận' : 'Kháng cáo bị từ chối',
        body: overturned
          ? `Kháng cáo của bạn đã được chấp nhận, quyết định trước đã được khôi phục. Lý do: ${reason}`
          : `Kháng cáo của bạn bị từ chối, giữ nguyên quyết định. Lý do: ${reason}`,
        refCollection: 'appeals', refId: String(appeal._id),
      });

      // (2) Audit (I4) — cả OVERTURNED lẫn UPHELD
      await this.auditLogModel.create({
        actorId: new Types.ObjectId(resolverAdminId),
        action: overturned ? 'APPEAL_OVERTURN' : 'APPEAL_UPHOLD',
        targetCollection: 'appeals', targetId: appeal._id,
        reason,
        diff: {
          appealStatus: { from: AppealStatus.PENDING, to: decision },
          ...(restoreDiff ? { restored: restoreDiff } : {}),
        },
      });

      // (3) (tuỳ chọn) Trust cho người kháng cáo nếu thắng — RULE-AMBIGUOUS:
      // SPECS §10 chưa định nghĩa sự kiện trust cho "appeal thắng" → mặc định KHÔNG tự cộng. Để seam:
      // Enum TrustEventType KHÔNG có sự kiện "đảo lại quyết định gốc"; cách sạch duy nhất nếu muốn
      // hoàn điểm là ADMIN_ADJUSTMENT với pointChange rõ ràng (đảo đúng số điểm đã trừ lúc ra quyết định gốc).
      // Chốt với Trung (M2) trước khi bật:
      // if (overturned) await this.trust.recordEvent({
      //   userId: String(appeal.appellantId),
      //   type: TrustEventType.ADMIN_ADJUSTMENT,   // ADMIN_ADJUSTMENT BẮT BUỘC truyền pointChange
      //   pointChange: 10,                          // = đảo lại hình phạt gốc; con số phải chốt với Trung
      //   reason: 'Hoàn điểm do kháng cáo được chấp nhận (OVERTURNED)',
      //   refCollection: 'appeals', refId: String(appeal._id),
      // }); // TODO: chờ SPECS BR-67/§10 chốt có hoàn điểm hay không

      return {
        success: true,
        message: overturned ? 'Đã chấp nhận kháng cáo + khôi phục' : 'Đã từ chối kháng cáo',
        appeal: { id: appeal._id, status: appeal.status },
      };
    } catch (error) {
      console.log('resolve appeal error:', error);
      return { success: false, statusCode: 500, message: 'Lỗi khi xử lý kháng cáo' };
    }
  }
}
```

> **Ghi chú I8/RULE-AMBIGUOUS:** SPECS §10 (scoring) **không** có sự kiện trust cho "appeal thắng". Rule mơ hồ → chọn an toàn: **mặc định không tự cộng điểm**, để nguyên comment seam. ⚠️ Enum `TrustEventType` **KHÔNG có** `CONTENT_REJECTED` để "đảo lại" — đừng viết code dựa trên nó (sẽ lỗi compile). Nếu team muốn hoàn điểm cho người thắng kháng cáo, **cách sạch duy nhất** là `ADMIN_ADJUSTMENT` với `pointChange` rõ ràng (đảo đúng số điểm đã trừ lúc ra quyết định gốc). Đây là việc **phải chốt với Trung (M2)** trước khi bật — đừng tự ý.

---

### Bước 4 — Controller (user submit với AuthGuard + admin queue/resolve với AdminGuard)

**`modules/appeals/appeal.controller.ts`**

```ts
import {
  BadRequestException, Body, ConflictException, Controller, ForbiddenException,
  Get, InternalServerErrorException, NotFoundException, Param, Patch, Post,
  Query, Request, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { AppealService } from './appeal.service';
import { SubmitAppealDTO } from './dto/submit-appeal.dto';
import { ResolveAppealDTO } from './dto/resolve-appeal.dto';
import { ListAppealsDTO } from './dto/list-appeals.dto';

@ApiTags('appeals')
@ApiBearerAuth()
@Controller('appeals')
export class AppealController {
  constructor(private readonly service: AppealService) {}

  // ---- USER: nộp kháng cáo (chỉ cần đăng nhập) --------------------------
  @Post()
  @UseGuards(AuthGuard('jwt-at'))
  async submit(@Body() body: SubmitAppealDTO, @Request() req: any) {
    return this.handle(await this.service.submit(req.user.userId, body));
  }

  // ---- ADMIN: hàng đợi kháng cáo (AdminGuard) ---------------------------
  @Get('admin/queue')
  @UseGuards(AuthGuard('jwt-at'), AdminGuard)
  async queue(@Query() query: ListAppealsDTO) {
    return this.handle(await this.service.list(query));
  }

  // ---- ADMIN: xử lý kháng cáo (OVERTURNED | UPHELD) ---------------------
  @Patch('admin/:id/resolve')
  @UseGuards(AuthGuard('jwt-at'), AdminGuard)
  async resolve(@Param('id') id: string, @Body() body: ResolveAppealDTO, @Request() req: any) {
    return this.handle(
      await this.service.resolve(id, req.user.userId, body.decision, body.reason),
    );
  }

  private handle(r: any) {
    if (!r.success) {
      if (r.statusCode === 400) throw new BadRequestException(r.message);
      if (r.statusCode === 403) throw new ForbiddenException(r.message);
      if (r.statusCode === 404) throw new NotFoundException(r.message);
      if (r.statusCode === 409) throw new ConflictException(r.message);
      throw new InternalServerErrorException(r.message);
    }
    return r;
  }
}
```

> Thứ tự guard bắt buộc: `AuthGuard('jwt-at')` trước (set `req.user.userId`), `AdminGuard` sau (query DB lấy role, chặn non-admin 403). Endpoint `POST /appeals` (nộp kháng cáo) chỉ cần đăng nhập — mọi user bị quyết định đều có quyền kháng cáo → **chỉ** `@UseGuards(AuthGuard('jwt-at'))`, **không** gắn `AdminGuard`. Chỉ 2 endpoint admin (`queue`, `resolve`) mới cần `AdminGuard`.

---

### Bước 5 — Module + nối AppModule

**`modules/appeals/appeal.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { TrustEngineModule } from 'src/modules/trust-engine/trust-engine.module';
import { NOTIFICATION_PORT, NotificationStub } from 'src/common/contracts/notification.port';
import { AppealController } from './appeal.controller';
import { AppealService } from './appeal.service';
import { AppealRestoreService } from './appeal-restore.service';

@Module({
  imports: [SchemaModule, TrustEngineModule], // TrustEngineModule export TrustEngineService
  controllers: [AppealController],
  providers: [
    AppealService, AppealRestoreService, AdminGuard,
    // Notification vẫn stub — TODO: khi WDP-7 xong đổi useClass sang service M3 thật
    { provide: NOTIFICATION_PORT, useClass: NotificationStub },
  ],
})
export class AppealsModule {}
```

**Sửa `app.module.ts`** — thêm `AppealsModule` vào `imports` (hiện có `AuthModule, SchemaModule, LocationModule, TrustEngineModule, AdminCategoryModule`):

```ts
import { AppealsModule } from './modules/appeals/appeal.module';
// ...
imports: [ /* ... */ AuthModule, SchemaModule, LocationModule, TrustEngineModule, AdminCategoryModule, AppealsModule ],
```

> Nếu nhánh WDP-19 đã merge (đã có `AdminModule` cũng provide `NotificationStub`) → vẫn OK: mỗi module có provider riêng, không xung đột. Khi M3 (WDP-7) thật xong, đổi `useClass` `NOTIFICATION_PORT` ở **cả hai** module.
> **Không** cần `AtStrategy` trong providers — `AuthModule` đã đăng ký strategy `'jwt-at'` global.

---

## 6. Seed data để test (không cần Long/Minh/Trung)

Mục tiêu: test **end-to-end LOCATION_REJECTED** + rule **different-admin**. Cần: 1 location `REJECTED`, **2 user ADMIN** (admin gốc + admin xét), 1 user thường (người kháng cáo), và **1 audit_logs** ghi ai reject (để tra decider + deadline).

Dùng **mongosh / Compass**:

```js
// 1) 2 admin + 1 user thường (password tự hash giống flow register, hoặc seed user có sẵn)
//    Giả sử đã có: adminA (_id A), adminB (_id B), customer (_id C)

// 2) Location đang REJECTED (đối tượng bị từ chối)
db.locations.insertOne({
  submittedBy: ObjectId('<C>'),
  name: 'Quán Bị Từ Chối',
  description: 'Địa điểm test luồng kháng cáo',
  address: '123 Test Street',
  geo: { type: 'Point', coordinates: [105.84, 21.02] },
  source: 'CUSTOMER',
  categoryId: ObjectId('<categoryId thật>'),
  status: 'REJECTED',
  rejectionReason: 'Thiếu thông tin',
  isDuplicate: false, isSuspectedDuplicate: false, viewCount: 0,
});
// lấy _id location vừa tạo = <LOC>

// 3) AuditLog của quyết định reject GỐC — actorId = adminA (người ra quyết định gốc)
//    createdAt đặt trong vòng 14 ngày để qua BR-66 (mặc định now là OK).
db.audit_logs.insertOne({
  actorId: ObjectId('<A>'),
  action: 'LOCATION_REJECT',
  targetCollection: 'locations',
  targetId: ObjectId('<LOC>'),
  reason: 'Thiếu thông tin',
  diff: { status: { from: 'SUBMITTED', to: 'REJECTED' } },
  createdAt: new Date(),     // trong 14 ngày
});
```

> Để test **quá hạn BR-66**: đặt `createdAt: new Date(Date.now() - 15*24*60*60*1000)` → submit phải bị 400.
> Để test **different-admin BR-65**: login **adminA** rồi resolve → phải 403; login **adminB** rồi resolve → OK.

---

## 7. Chạy & test

```bash
# từ thư mục gốc repo (repo đã chuyển pnpm → npm)
npm run start:dev --workspace=api
# hoặc: npm run dev:api
```

Swagger `http://localhost:3000/api/docs`. Login lấy token cho `customer`, `adminA`, `adminB`.

| Bước | API | Token | Kỳ vọng |
|---|---|---|---|
| Nộp kháng cáo | `POST /api/appeals` `{type:"LOCATION_REJECTED", targetId:"<LOC>", argument, additionalEvidenceFiles:[...]}` | customer | 201, `appeal.status=PENDING`, có `appealDeadline` |
| **BR-64** nộp lại | `POST /api/appeals` (cùng targetId) | customer | **409** "đã được kháng cáo" |
| **BR-66** quá hạn | seed audit `createdAt` −15 ngày → `POST /api/appeals` | customer | **400** "quá hạn" |
| Không đăng nhập | `POST /api/appeals` | — | 401 |
| Queue | `GET /api/appeals/admin/queue?status=PENDING` | adminB | list có appeal vừa tạo |
| Queue role sai | `GET /api/appeals/admin/queue` | customer | **403** |
| **BR-65** cùng admin | `PATCH /api/appeals/<id>/resolve` `{decision:"OVERTURNED", reason}` | **adminA** | **403** "người ra quyết định gốc" |
| **BR-67** OVERTURNED | `PATCH /api/appeals/<id>/resolve` `{decision:"OVERTURNED", reason}` | **adminB** | 200; **location.status → PUBLISHED**, `rejectionReason` xoá |
| UPHELD | (seed lại) resolve `{decision:"UPHELD", reason}` | adminB | 200; location **giữ REJECTED** |
| Resolve lại | `PATCH .../resolve` lần 2 | adminB | **409** "đã xử lý" |

Kiểm DB sau OVERTURNED: `locations.<LOC>.status === 'PUBLISHED'`; `notifications` có doc `APPEAL_OVERTURNED` (stub M3); `audit_logs` có doc `APPEAL_OVERTURN` với `diff.restored.status`. Trust: **không** có `trust_events` mới cho appeal (đúng — SPECS §10 chưa định nghĩa điểm cho appeal thắng; seam để `ADMIN_ADJUSTMENT` vẫn đang comment, chờ chốt với Trung).

---

## 8. Checklist nghiệm thu (map DoD + 4 trụ cột BR-63..67)

- [ ] **DoD-1** Nộp kháng cáo `POST /appeals` kèm `additionalEvidenceFiles` → `Appeal{PENDING}`
- [ ] **DoD-2 / BR-67** OVERTURNED `LOCATION_REJECTED` → location `REJECTED → PUBLISHED` (khôi phục thật)
- [ ] **BR-63 (scope)** chỉ nhận 6 `AppealType` (enum ép, DTO `@IsEnum`)
- [ ] **BR-64 (once)** nộp lần 2 cùng object → 409 (pre-check + bắt duplicate-key `11000`)
- [ ] **BR-65 (different-admin)** admin gốc tự resolve → 403; admin khác → OK
- [ ] **BR-66 (14 ngày)** quá hạn → 400; trong hạn → OK; `appealDeadline` lưu vào doc
- [ ] **UPHELD** → không đổi trạng thái target, vẫn ghi audit + notify
- [ ] **I4 (audit)** cả OVERTURNED & UPHELD đều ghi `audit_logs`
- [ ] **I8 (trust)** KHÔNG tự cộng/trừ điểm (seam có comment)
- [ ] **I1 (no hard delete)** khôi phục = lật `status`, không insert lại
- [ ] **M3** notify người kháng cáo cả 2 nhánh
- [ ] Chỉ ADMIN vào `/appeals/admin/*`; customer 403; no-token 401
- [ ] Resolve item đã xử lý → 409
- [ ] Dispatcher: nhánh thật (LOCATION/CLAIM/OWNERSHIP) + stub có `// TODO: depends on Fxx` (DUPLICATE/REVIEW/USER)
- [ ] ⚠️ **Đã flag SPECS** mở rộng BR-63 → BR-63..67 (việc tài liệu, §1.1)

---

## 9. Việc cần chốt với team (dependency — ticket "build cuối")

WDP-32 phụ thuộc các quyết định nó kháng cáo:

| Loại kháng cáo | Ticket nguồn | Owner | Trạng thái | Bạn làm gì |
|---|---|---|---|---|
| `LOCATION_REJECTED` | F15 / WDP-19 | **Dương (bạn)** | buildable now | ✅ restore THẬT + test e2e |
| `CLAIM_REJECTED` | F24 / WDP-28 | **Dương (bạn)** | To Do | ✅ restore THẬT (đảo F24) |
| `OWNERSHIP_REVOKED` | F27 / WDP-31 | **Dương (bạn)** | To Do | ⚠️ THẬT một phần — **cần F27 ghi `audit diff.ownerId.from`** để biết chủ cũ |
| `DUPLICATE_HIDDEN` | F16 / WDP-20 | Long | To Do | ⚠️ STUB `// TODO: depends on F16` |
| `REVIEW_REMOVED` | F22 / WDP-26 | Trung | To Do | ⚠️ STUB + recompute rating phụ thuộc F19 |
| `USER_BANNED` | F31 / WDP-35 | Trung | To Do | ⚠️ STUB `// TODO: depends on F31` |

Các điểm cần sync:
1. **Trung (M2/WDP-33)** ✅ đã xong → gọi trực tiếp `TrustEngineService.recordEvent(...)` (không còn port trust). **Đăng (M3/WDP-7)** chưa xong → giữ `NotificationStub`, đổi `useClass` khi xong.
2. **F27/WDP-31 (chính bạn):** khi revoke phải ghi `audit_logs` với `action: 'DISPUTE_REVOKE'` + `diff.ownerId.from = <chủ cũ>` — nếu không, restore `OWNERSHIP_REVOKED` không biết khôi phục về ai.
3. **F15/WDP-19 (chính bạn):** khi reject phải ghi `audit_logs` `action: 'LOCATION_REJECT'` (đã có trong guide WDP-19) — restore `LOCATION_REJECTED` dựa vào log này để lấy decider + deadline.
4. **F16/F22/F31 (Long/Trung):** chốt `action` audit + field trạng thái để stub khớp khi các ticket đó xong (`LOCATION_HIDE_DUPLICATE`, `REVIEW_REMOVE`, `USER_BAN`).
5. **Trust khi appeal thắng:** SPECS §10 chưa có sự kiện này → **chưa cộng điểm** (RULE-AMBIGUOUS, §3.4 + Bước 3). Enum `TrustEventType` không có event "đảo quyết định gốc"; nếu muốn hoàn điểm thì chỉ có thể dùng `ADMIN_ADJUSTMENT` + `pointChange` rõ ràng — **chốt với Trung (M2)** trước khi bật.
6. ⚠️ **Cả nhóm:** mở rộng SPECS BR-63 → BR-63..67 (§1.1) trước buổi bảo vệ.
7. **UI Admin queue** ở `web` (Next.js 15 + MUI) — tách backend; bàn giao contract API ở trên.

---

## 10. Thứ tự code (commit nhỏ)

1. Chuẩn bị hạ tầng dùng lại: `AdminGuard` (có sẵn), `TrustEngineModule` (import), `NotificationPort` từ WDP-19 (copy nếu chưa merge).
2. DTO (`submit-appeal`, `resolve-appeal`, `list-appeals`).
3. `AppealRestoreService` — làm THẬT `restoreLocationRejected` trước, các nhánh khác stub.
4. `AppealService.submit` + `getOriginalDecision` → test BR-64 dedupe + BR-66 deadline.
5. `AppealService.list` + controller queue → test list + AdminGuard.
6. `AppealService.resolve` → BR-65 different-admin + gọi dispatcher + audit + notify.
7. `appeal.module.ts` + nối `app.module.ts`.
8. Seed (§6) → chạy full checklist §8.
9. Bổ sung restore THẬT cho CLAIM/OWNERSHIP (ticket của bạn); STUB còn lại giữ `// TODO`.
10. PR → review → chuyển WDP-32 sang Done.

```bash
git checkout -b WDP-32-appeal
# commit nhỏ theo §10
git push -u origin WDP-32-appeal
```
> KHÔNG commit `/guideline` (đã gitignore) và record seed tạm.
