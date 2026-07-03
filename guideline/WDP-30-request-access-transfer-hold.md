# WDP-30 — F26: Request-access + chuyển quyền + hold — Hướng dẫn tự triển khai (manual)

> Tài liệu cá nhân trong `/guideline/`, **đã gitignore**. Không commit cùng code app.
> **Tự chứa:** đọc file này là code được, **không cần mở Jira (WDP-xx) hay file nghiệp vụ (SPECS / SRS)**. Mọi thuật ngữ nghiệp vụ cần thiết đã giải nghĩa ngay trong guide (xem block 📖 bên dưới).
> Mục tiêu: bạn tự code WDP-30 từ đầu đến cuối, đúng convention repo.
> Đây là **luồng khó nhất** của cả dự án. 2 chỗ reviewer soi kỹ nhất: (1) **lazy-timeout, KHÔNG cron**; (2) **khi nào bật hold / khi nào KHÔNG bật hold**. Đọc kỹ §3 và §5.4 trước khi viết code.
> ✅ Bản này theo đúng nguyên tắc shared-service: **KHÔNG tự build Notification (M3)** — chỉ **gọi** qua port (xem §1). `isUnderHold(...)` là helper **dùng chung** với WDP-36/F32 — phải sync với Minh (xem §9).
> Sibling guide liên quan: [WDP-31 — F27 Phân xử tranh chấp](WDP-31-dispute.md) (nhánh reject → kháng cáo → Dispute nằm ở đó).

---

## 📖 Trước khi code — thuật ngữ & bối cảnh (đọc 1 lần)

Bạn đang làm luồng **request-access = "xin chuyển quyền sở hữu địa điểm"**. Bối cảnh: mỗi địa điểm trên bản đồ có thể **đã có chủ** (`ownerId != null`, ví dụ một vendor đã claim thành công). Có một người khác — gọi là **requester B** — muốn tiếp quản địa điểm đó từ **chủ hiện tại A**. B gửi 1 yêu cầu; A có **3 ngày** để trả lời. Nhiệm vụ của bạn là xử lý yêu cầu này qua **3 nhánh kết cục**.

**3 nhánh (nhớ kỹ, đây là xương sống của ticket):**
1. **Grant** — A đồng ý → chuyển quyền cho B (`ownerId ← B`) + **bật hold 7 ngày**.
2. **Reject** — A từ chối (kèm lý do) → **không** đổi chủ, **không** hold; B nhận cờ `canAppeal=true` để có thể **kháng cáo** (việc kháng cáo mở ra một Dispute — thuộc ticket khác WDP-31/F27, bạn KHÔNG code ở đây).
3. **Im lặng quá hạn** — A không trả lời sau 3 ngày → B nộp **bằng chứng tại chỗ** (on-site proof) → hệ thống **auto-transfer** (`status = AUTO_GRANTED`, `ownerId ← B`) + **bật hold 7 ngày (bắt buộc)**.

**Thuật ngữ sẽ gặp:**
- **owner A / requester B** = chủ hiện tại và người xin chuyển quyền. Phân quyền ở đây **theo nghiệp vụ**, không theo role: chỉ A (khớp `currentOwnerId`) mới được trả lời; chỉ B (khớp `requesterId`) mới được verify. **Không có Admin** trong luồng này.
- **lazy-timeout (BR-55)** = cách tính "đã quá hạn 3 ngày hay chưa" **ngay lúc có người đọc/đụng vào** yêu cầu, bằng phép so `now > timeoutAt`. **TUYỆT ĐỐI KHÔNG dùng cron / `@Cron` / `setInterval` / `@nestjs/schedule`.** Request quá hạn vẫn **nằm nguyên trạng thái `PENDING`** trong DB cho tới khi B bấm verify; không có tiến trình nền nào tự đổi nó sang `EXPIRED`.
- **hold (BR-56)** = "khóa chuyển quyền" tạm thời sau khi vừa đổi chủ. Kỹ thuật: **chỉ set 1 field `location.holdExpiresAt = now + 7 ngày`** — **không cần collection riêng** `OwnershipHold`. Đang trong hold ⇔ `holdExpiresAt != null && now < holdExpiresAt`. Hold **chặn các hành động phá hủy** (ẩn địa điểm, xóa hàng loạt sản phẩm, sửa thông tin lõi name/address) nhưng **vẫn cho phép sửa lành tính** (giờ mở cửa, mô tả, ảnh). Hold tự hết hiệu lực khi qua mốc (cũng lazy — không cần job clear field).
- **1 PENDING slot (I6 / BR-61)** = mỗi địa điểm chỉ được có **đúng 1 yêu cầu đang chờ** tại một thời điểm. Quan trọng: slot này **dùng chung** giữa 2 loại yêu cầu — `request_accesses` **và** `claim_requests`. DB chỉ chặn trùng trong từng collection riêng, **không chặn chéo** → bạn phải **tự đếm PENDING ở CẢ hai collection** trong service trước khi cho tạo mới (xem §3.4).
- **invariant I8** = cấm sửa điểm uy tín (trust) bằng tay. Nhưng **F26 KHÔNG chấm trust** (không gọi Trust Engine / M2) — chuyển quyền ở đây không cộng/trừ điểm. Đừng thêm lời gọi M2, cũng đừng viết `user.trustScore += ...`.
- **RequestAccessStatus** (enum thật, từ `common.enums.ts`): `PENDING | GRANTED | REJECTED | EXPIRED | AUTO_GRANTED | ESCALATED`. MVP chỉ dùng 4 giá trị đầu theo nhánh; **`EXPIRED` và `ESCALATED` KHÔNG dùng** (xem §3.1).

**Thứ bạn DÙNG LẠI (không tự build):** Notification (M3) — chỉ **gọi** qua `NotificationPort` (M3/WDP-7 của Đăng **chưa xong** → dùng stub tạm, gắn `// TODO: depends on WDP-7`). Chi tiết ở §1.

---

## 0. Tóm tắt task

| | |
|---|---|
| **Issue** | [WDP-30](https://fptp.atlassian.net/browse/WDP-30) — `F26 — Request-access + chuyển quyền + hold` |
| **Quan trọng** | **Core** · Sprint S3 · Feature Ownership · **HF-4** (khó nhất) |
| **Mô tả** | Người-không-phải-chủ (requester B) xin chuyển quyền sở hữu một địa điểm **đã có chủ** từ chủ hiện tại (owner A). Tạo `RequestAccess` (PENDING). **1 PENDING slot / địa điểm**. Owner có **3 ngày (lazy-check)** để trả lời. 3 nhánh: (a) Grant → chuyển quyền + **hold 7 ngày**; (b) Reject → B có thể kháng cáo → mở Dispute (F27); (c) im lặng quá hạn → B verify on-site → **auto-transfer + hold 7 ngày bắt buộc**. |
| **Đụng tới (docs)** | `api` (module `request-access`) + `mobile` (UI gửi/duyệt yêu cầu) |
| **DoD** | (1) Cả **3 nhánh** trả lời hoạt động; (2) **hold** chặn đúng các hành động phá hủy; (3) chỉ **1 PENDING slot** / địa điểm |

### Phân rã DoD
1. **B gửi request-access** lên một địa điểm đã có chủ (`ownerId != null`) → tạo `RequestAccess(PENDING)`, `timeoutAt = now + 3 ngày`, **notify owner A**.
2. **Chặn slot trùng** (BR-61/I6): đã có 1 PENDING request-access **hoặc** 1 PENDING claim trên địa điểm đó → từ chối.
3. **Nhánh (a) — owner Grant**: `location.ownerId = requesterId`, request `status=GRANTED`, set **`holdExpiresAt = now + 7 ngày`** (transfer KHÔNG qua Admin → có hold), notify cả 2 bên.
4. **Nhánh (b) — owner Reject**: request `status=REJECTED` + `responseReason`; trả về cho B "có thể kháng cáo" → mở **Dispute (WDP-31/F27)**. **Không** đổi `ownerId`, **không** hold.
5. **Nhánh (c) — owner im lặng quá hạn**: B nộp **on-site proof** (như F23) → `status=AUTO_GRANTED`, `location.ownerId = requesterId`, set **`holdExpiresAt = now + 7 ngày`** (bắt buộc), notify cả 2 bên.
6. **Lazy-timeout**: trạng thái "đã hết hạn hay chưa" được tính **khi đọc / khi B bấm verify**, bằng `now > timeoutAt`. **KHÔNG có cron**.
7. **Hold guard**: helper `isUnderHold(location)` chặn các hành động phá hủy (ẩn địa điểm / xóa hàng loạt sản phẩm / sửa thông tin lõi name+address) nhưng **cho phép** sửa lành tính (giờ mở cửa / mô tả).
8. **Notify** mọi mốc qua M3 (port). **Audit** khi chuyển quyền (I4).

---

## 1. ⚠️ ĐỌC KỸ — cái gì TỰ BUILD, cái gì chỉ GỌI

Nguyên tắc chung (hệ thống chia thành các module M1–M5, ai chưa xong thì mình **gọi qua port + đánh dấu seam**, không tự bịa logic ticket khác) + invariant **I6/I8**:

| Thành phần | Đây là gì | Bạn làm gì |
|---|---|---|
| **RequestAccess module** (DTO + service + controller + module) | Chính là ticket của bạn | ✅ **TỰ BUILD** (toàn bộ §5). |
| **`isUnderHold(location)` helper** | Hạ tầng dùng chung — **WDP-36/F32 (Minh) cũng dùng** để chặn sửa khi đang hold | ✅ **TỰ TẠO** trong `common/` để cả 2 ticket import. **Sync với Minh** trước (xem §9) — đừng dựng 2 bản. |
| **Notification (M3)** | **M3 = F03 / [WDP-7](https://fptp.atlassian.net/browse/WDP-7)**, owner **Đăng**, `Đang làm` | ❌ **KHÔNG build.** **GỌI** qua `NotificationPort.notify(...)`. M3 chưa xong → dùng **stub** (xem §5.2). |
| **`notification.port.ts`** | Port M3 — **đã được WDP-19/F15 (Dương) định nghĩa** trong `common/contracts/` | ♻️ **TÁI SỬ DỤNG**, đừng tạo lại. Nếu bạn code WDP-30 trước khi merge WDP-19 → tạm tạo cùng file theo §5.2, khi merge thì gộp 1 bản. |
| **AuditLog** | I4/BR-43: ghi log mọi thay đổi quyền | ⚠️ Ghi trực tiếp vào collection `audit_logs` qua model (helper nhỏ). Báo Trung (WDP-39) để sau gộp util chung. |
| **Dispute (WDP-31/F27)** | Nhánh (b) reject → kháng cáo → mở Dispute, owner **Dương**, `To Do` | ❌ **KHÔNG build ở đây.** Chỉ trả cờ `canAppeal=true` + cross-ref. Việc tạo Dispute nằm ở F27. |
| **On-site proof / geotag verify (F23)** | Cơ chế xác minh tại chỗ ở **WDP-27/F23** (Dương) | ♻️ Nhánh (c) **tái sử dụng** chuẩn evidence của F23. F23 chưa xong → nhận `evidenceFiles[]` theo `EvidenceFileSchema` sẵn có + đánh dấu seam (xem §5.5). |

> **Invariant I8:** mọi thay đổi điểm trust phải đi qua Trust Engine (M2) — **NHƯNG F26 KHÔNG chấm trust.** Việc chuyển quyền ở đây **không** cộng/trừ điểm uy tín, nên **không gọi M2** ở ticket này (khác F15/F22/F27). Nếu sau này có luật mới yêu cầu cộng/trừ điểm khi transfer → gọi qua M2 port, **đừng** tự viết `user.trustScore += ...`. Hiện tại: **không gọi M2** (xem cờ ambiguity §11).

> **Khi dependency chưa xong:** stub interface theo contract, code phần của mình, đánh dấu seam `// TODO: depends on Fxx`. **Không tự bịa logic ticket khác** (đừng tự code Dispute, đừng tự code OTP/proof của F23).

**Data contract đã khóa (WDP-5 Done).** Mọi field cần dùng đã có sẵn:
- [request-access.schema.ts](../apps/api/src/common/schemas/request-access.schema.ts): `locationId, requesterId, currentOwnerId, evidenceFiles[], otpVerified, status, timeoutAt(required), responseReason?, respondedAt?` + **unique partial index** `{locationId,status}` where `PENDING`.
- [location.schema.ts](../apps/api/src/common/schemas/location.schema.ts): `ownerId?` (null = community-owned), **`holdExpiresAt?: Date`**, `status`.
- [common.enums.ts](../apps/api/src/common/schemas/common.enums.ts): `RequestAccessStatus = PENDING | GRANTED | REJECTED | EXPIRED | AUTO_GRANTED | ESCALATED`.

---

## 2. Convention repo (bám theo cho khớp)

1. **Service trả object, KHÔNG throw:** `{ success, statusCode?, message?, ...data }` (xem [location.service.ts](../apps/api/src/modules/locations/location.service.ts), [auth.service.ts](../apps/api/src/modules/auth/auth.service.ts)).
2. **Controller** map object đó sang `HttpException` (xem [location.controller.ts](../apps/api/src/modules/locations/location.controller.ts)).
3. **Auth:** `@UseGuards(AuthGuard('jwt-at'))`, lấy user qua `req.user.userId`. ⚠️ Token **chỉ có `userId`** ([at.strategy.ts](../apps/api/src/common/guard/at.strategy.ts)) → role KHÔNG ở token. F26 **không cần role** (ai đã đăng nhập đều có thể là requester); chỉ cần so `userId` với `ownerId`/`requesterId` để phân quyền theo nghiệp vụ.
4. **Module:** `imports: [SchemaModule]` là đủ để có mọi Model. `providers: [RequestAccessService]` — **`AtStrategy` KHÔNG cần** khai báo ở đây vì `AuthModule` đã đăng ký chiến lược `'jwt-at'` toàn cục.
5. **DTO:** `class-validator`. `ValidationPipe({ whitelist: true, transform: true })` đã bật global ([main.ts](../apps/api/src/main.ts)).
6. **Prefix `api`** → route thật là `/api/...`. Swagger `/api/docs` (đã bật `addBearerAuth`).
7. Message tiếng Việt có dấu.
8. **Enum lấy từ `common.enums.ts`** — không hardcode magic string (quy tắc vàng của docs).
9. Mỗi schema model phải có trong [schema.module.ts](../apps/api/src/common/schemas/schema.module.ts) — `RequestAccess`, `Location`, `Notification`, `AuditLog` **đều đã có sẵn**, không cần thêm.

---

## 3. Quyết định kỹ thuật (CHỐT trước khi code) — phần soi kỹ nhất

### 3.1. State machine của RequestAccess

```
                          B gửi yêu cầu
                                │
                                ▼
                          ┌───────────┐
                          │  PENDING  │  timeoutAt = now + 3 ngày
                          └───────────┘
              owner A      /     │      \   B verify on-site SAU hạn
                Grant     /      │       \  (now > timeoutAt)
                         ▼       ▼        ▼
                  ┌─────────┐ ┌────────┐ ┌──────────────┐
                  │ GRANTED │ │REJECTED│ │ AUTO_GRANTED │
                  └─────────┘ └────────┘ └──────────────┘
              ownerId←B       ownerId    ownerId←B
              + HOLD 7d       KHÔNG đổi  + HOLD 7d (bắt buộc)
              notify 2 bên    + reason   notify 2 bên
                              canAppeal=true
                              → mở Dispute (F27)
```

> `EXPIRED` và `ESCALATED` có trong enum nhưng **MVP không dùng tới**:
> - **KHÔNG** chuyển sang `EXPIRED` tự động — vì không có cron (xem 3.3). "Quá hạn" chỉ là **trạng thái suy ra khi đọc**, request vẫn nằm `PENDING` cho tới khi B verify (→ `AUTO_GRANTED`).
> - `ESCALATED` thuộc luồng tranh chấp nâng cao (Phase 2). Đừng dùng.

### 3.2. Bảng nhánh — quan trọng nhất

| Hành động | Điều kiện | `request.status` | `location.ownerId` | `holdExpiresAt` | Notify | Audit |
|---|---|---|---|---|---|---|
| **(a) Owner Grant** | actor == `currentOwnerId`, request đang PENDING | `GRANTED` | ← `requesterId` | **now + 7d** | A + B | ✅ |
| **(b) Owner Reject** | actor == `currentOwnerId`, request đang PENDING | `REJECTED` + `responseReason` | **giữ nguyên** | **KHÔNG set** | A + B (kèm `canAppeal`) | ✅ |
| **(c) B verify quá hạn** | actor == `requesterId`, `now > timeoutAt`, có proof | `AUTO_GRANTED` | ← `requesterId` | **now + 7d (bắt buộc)** | A + B | ✅ |

> ⚠️ **Hold chỉ bật ở (a) và (c)** — vì đây là transfer **KHÔNG qua Admin**. Transfer do **Admin** quyết (luồng Dispute WDP-31/F27) **KHÔNG** bật hold (BR-56). F26 của bạn không đụng tới Admin-decided transfer → bạn **luôn** set hold ở (a)/(c). Nhưng phải hiểu lý do để khi review F27 không nhầm.

### 3.3. ⚠️ BR-55 — LAZY-TIMEOUT, TUYỆT ĐỐI KHÔNG CRON (MVP)

Đây là chỗ reviewer soi đầu tiên. Quy tắc:

- Khi tạo request: set `timeoutAt = now + 3 ngày`. **Lưu thẳng vào document**, không thêm gì khác.
- **KHÔNG** `setInterval`, **KHÔNG** `@Cron`, **KHÔNG** `@nestjs/schedule`, **KHÔNG** job queue. Một dòng `@Cron(...)` = **fail review** (đó là Phase 2).
- "Đã hết hạn chưa?" được tính **lazy** — ngay tại thời điểm có người đọc/đụng vào request:
  - Khi **đọc** chi tiết request (GET) → tính `isExpired = now > timeoutAt` để hiển thị.
  - Khi **B bấm "verify to take ownership"** → service kiểm `now > timeoutAt`; nếu chưa tới hạn → chặn (owner còn quyền trả lời); nếu đã quá hạn → cho phép auto-transfer.
- Tách logic này thành **một resolver thuần**: `resolveEffectiveState(request)` trả về trạng thái "hiệu lực" (PENDING-còn-hạn / PENDING-quá-hạn / GRANTED / REJECTED / AUTO_GRANTED) để mọi nơi đọc nhất quán. Xem code §5.3.

### 3.4. BR-61 / I6 — chỉ 1 PENDING slot (chú ý cross-constraint)

- `request-access.schema.ts` đã có **unique partial index** `{locationId, status}` where `status=PENDING` → chặn **2 request-access PENDING** cùng địa điểm ở tầng DB (insert thứ 2 ném lỗi `E11000`).
- **NHƯNG slot này dùng chung với CLAIM** (I6: "1 PENDING slot — claim **hoặc** request-access"). `claim_requests` là **collection khác** → unique index của Mongo **không** bắc cầu giữa 2 collection. ⚠️ Vì vậy ràng buộc "đang có claim PENDING thì không cho tạo request-access" **PHẢI tự kiểm trong service** (đếm `ClaimRequest` PENDING của địa điểm trước khi tạo). Đây là **schema-gap** — flag ở §11.
- Phòng race condition: vẫn `try/catch` bắt `E11000` từ index của chính request-access (2 request gửi gần như đồng thời).

### 3.5. BR-56 — mô hình HOLD bằng `holdExpiresAt` (KHÔNG có collection OwnershipHold)

- Bản nháp nghiệp vụ cũ từng mô tả một domain object `OwnershipHold` với enum `OwnershipHoldStatus = ACTIVE/EXPIRED`. **NHƯNG** trong code thật **KHÔNG có** collection/schema `OwnershipHold` ([schema.module.ts](../apps/api/src/common/schemas/schema.module.ts) không đăng ký nó), enum `OwnershipHoldStatus` **tồn tại nhưng không dùng đâu cả**.
- Cơ chế hold thật được mô hình bằng **đúng 1 field** `location.holdExpiresAt?: Date`:
  - Bật hold: `location.holdExpiresAt = now + 7 ngày`.
  - Đang trong hold ⇔ `holdExpiresAt != null && now < holdExpiresAt` → đây chính là `isUnderHold(location)`.
  - Hold tự "hết hiệu lực" khi qua mốc → **cũng là lazy**, không cần job clear field.
- ⚠️ **FLAG (§11):** dùng `holdExpiresAt`, **không** tạo `OwnershipHold` collection cho MVP. Nếu Phase 2 cần lịch sử nhiều lần hold → mới tách collection. Ghi `// RULE-AMBIGUOUS` tại helper.

### 3.6. Hold chặn gì / cho phép gì (BR-56)

| Hành động trên địa điểm đang hold | Cho phép? |
|---|---|
| Ẩn địa điểm (`status → HIDDEN`) | ❌ Chặn |
| Xóa hàng loạt sản phẩm | ❌ Chặn |
| Sửa **thông tin lõi**: `name`, `address` | ❌ Chặn |
| Sửa giờ mở cửa (`openingHours`), mô tả (`description`) | ✅ Cho phép |
| Sửa ảnh, sản phẩm lẻ | ✅ Cho phép (benign) |

> Việc **gọi** `isUnderHold(...)` để chặn các hành động trên nằm ở **WDP-36/F32 (Minh)** — F26 của bạn chỉ **cung cấp helper** + **set** `holdExpiresAt`. Bạn viết 1 endpoint demo nhỏ (§5.6) để tự test helper, nhưng việc tích hợp thật vào luồng edit là của Minh.

---

## 4. Cây file

```
apps/api/src/
├─ common/
│  ├─ contracts/
│  │  └─ notification.port.ts        (TÁI SỬ DỤNG từ WDP-19; nếu chưa có → tạo theo §5.2)
│  └─ ownership/
│     └─ hold.util.ts                (TẠO) isUnderHold() + assertNotUnderHold() — DÙNG CHUNG với F32
└─ modules/request-access/
   ├─ dto/
   │  ├─ create-request-access.dto.ts        (TẠO)
   │  ├─ respond-request-access.dto.ts       (TẠO) grant/reject
   │  └─ verify-takeover.dto.ts              (TẠO) nhánh (c)
   ├─ request-access.service.ts              (TẠO) — lazy resolver + 3 nhánh + set hold
   ├─ request-access.controller.ts           (TẠO)
   └─ request-access.module.ts               (TẠO)
apps/api/src/app.module.ts                   (SỬA: thêm RequestAccessModule)
```

> `RequestAccess`, `Location`, `Notification`, `AuditLog`, `ClaimRequest` đã nằm trong `SchemaModule` → chỉ cần `imports: [SchemaModule]`, không phải khai báo lại model.

---

## 5. Triển khai

### 5.1 — `hold.util.ts` (helper dùng chung với F32)

**`common/ownership/hold.util.ts`** — hàm thuần, không phụ thuộc Nest, để cả F26 + F32 import:

```ts
import { ForbiddenException } from '@nestjs/common';
import { Location } from 'src/common/schemas/location.schema';

/**
 * Địa điểm có đang trong "ownership hold" hay không.
 *
 * RULE-AMBIGUOUS (BR-56): MVP mô hình hold bằng MỘT field `location.holdExpiresAt`,
 * KHÔNG dùng collection OwnershipHold (enum OwnershipHoldStatus tồn tại nhưng chưa
 * có schema/collection trong repo). Hold tự hết hiệu lực khi qua mốc (lazy) — không cần job clear field.
 *
 * Dùng chung: WDP-30/F26 (set holdExpiresAt) + WDP-36/F32 (gọi để chặn sửa). SYNC với Minh.
 */
export function isUnderHold(
  location: Pick<Location, 'holdExpiresAt'>,
  now: Date = new Date(),
): boolean {
  return !!location.holdExpiresAt && now < location.holdExpiresAt;
}

/**
 * Các hành động PHÁ HỦY bị chặn khi đang hold (BR-56).
 * Benign edit (openingHours/description/ảnh) KHÔNG nằm trong danh sách này.
 */
export type DestructiveAction =
  | 'HIDE_LOCATION'
  | 'BULK_DELETE_PRODUCTS'
  | 'EDIT_CORE_INFO'; // name / address

/** Ném ForbiddenException nếu đang hold. F32 gọi hàm này ở đầu các hành động phá hủy. */
export function assertNotUnderHold(
  location: Pick<Location, 'holdExpiresAt'>,
  action: DestructiveAction,
  now: Date = new Date(),
): void {
  if (isUnderHold(location, now)) {
    const until = location.holdExpiresAt!.toISOString();
    throw new ForbiddenException(
      `Địa điểm đang trong thời gian khóa chuyển quyền (đến ${until}). ` +
        `Không thể thực hiện: ${action}. Bạn vẫn có thể sửa giờ mở cửa / mô tả.`,
    );
  }
}
```

> F26 chỉ **set** `holdExpiresAt`; helper trên là để F32 **đọc**. Tách ra `common/ownership/` để không ai phải import chéo giữa 2 module domain.

---

### 5.2 — `notification.port.ts` (TÁI SỬ DỤNG từ WDP-19)

> Nếu WDP-19 đã merge: **đừng tạo lại**, chỉ import. Bản dưới chép từ WDP-19 để bạn không bị chặn nếu code trước. Khi merge thì giữ **1 bản duy nhất**.

**`common/contracts/notification.port.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from 'src/common/schemas/notification.schema';

export interface NotificationPort {
  // Interface M3 — KHỚP với WDP-7 (sync với Đăng)
  notify(params: {
    userId: string;
    type: string;
    title: string;
    body: string;
    refCollection?: string;
    refId?: string;
  }): Promise<void>;
}

export const NOTIFICATION_PORT = Symbol('NOTIFICATION_PORT');

/** STUB TẠM — chỉ tạo in-app notification. Email/SMS + template là việc M3/WDP-7. */
@Injectable()
export class NotificationStub implements NotificationPort {
  constructor(
    @InjectModel(Notification.name) private model: Model<Notification>,
  ) {}
  async notify(p: {
    userId: string;
    type: string;
    title: string;
    body: string;
    refCollection?: string;
    refId?: string;
  }): Promise<void> {
    // TODO: depends on F03/WDP-7 — thay bằng M3 service thật (email/SMS/template)
    await this.model.create({ ...p, isRead: false });
  }
}
```

---

### 5.3 — DTO

**`modules/request-access/dto/create-request-access.dto.ts`** — B gửi yêu cầu. Cho phép kèm evidence sơ bộ (không bắt buộc ở bước gửi; proof bắt buộc nằm ở bước verify nhánh (c)).

```ts
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class GeoPointDTO {
  @IsOptional() @IsString() type?: 'Point';

  @IsArray() @IsNumber({}, { each: true })
  coordinates!: [number, number];
}

class EvidenceFileDTO {
  @IsString() @IsNotEmpty() url!: string;

  @IsEnum(['IMAGE', 'VIDEO', 'DOCUMENT'])
  fileType!: 'IMAGE' | 'VIDEO' | 'DOCUMENT';

  @IsOptional() @ValidateNested() @Type(() => GeoPointDTO)
  geo?: GeoPointDTO;

  @IsOptional() @IsNumber() @Min(0)
  accuracyMeters?: number;

  @IsOptional() @Type(() => Date)
  capturedAt?: Date;
}

export class CreateRequestAccessDTO {
  @IsString() @IsNotEmpty({ message: 'Thiếu locationId' })
  locationId!: string;

  // Lý do xin chuyển quyền (tùy chọn, để owner cân nhắc)
  @IsOptional() @IsString()
  reason?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(5)
  @ValidateNested({ each: true }) @Type(() => EvidenceFileDTO)
  evidenceFiles?: EvidenceFileDTO[];
}
```

**`modules/request-access/dto/respond-request-access.dto.ts`** — owner trả lời (grant/reject).

```ts
import { IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export enum RespondAction {
  GRANT = 'GRANT',
  REJECT = 'REJECT',
}

export class RespondRequestAccessDTO {
  @IsEnum(RespondAction, { message: 'action phải là GRANT hoặc REJECT' })
  action!: RespondAction;

  // Reject BẮT BUỘC lý do (để B kháng cáo có căn cứ); grant thì tùy chọn.
  @ValidateIf((o) => o.action === RespondAction.REJECT)
  @IsString() @MinLength(5) @MaxLength(500)
  reason?: string;
}
```

**`modules/request-access/dto/verify-takeover.dto.ts`** — nhánh (c): B nộp on-site proof sau khi owner im lặng quá hạn. Tái dùng chuẩn evidence của F23.

```ts
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class GeoPointDTO {
  @IsOptional() @IsString() type?: 'Point';
  @IsArray() @IsNumber({}, { each: true }) coordinates!: [number, number];
}

class ProofFileDTO {
  @IsString() @IsNotEmpty() url!: string;
  @IsEnum(['IMAGE', 'VIDEO', 'DOCUMENT']) fileType!: 'IMAGE' | 'VIDEO' | 'DOCUMENT';

  // On-site proof: nên có geo + thời điểm chụp (F23 cross-check geotag + timestamp)
  @ValidateNested() @Type(() => GeoPointDTO) geo!: GeoPointDTO;
  @IsOptional() @IsNumber() @Min(0) accuracyMeters?: number;
  @Type(() => Date) capturedAt!: Date;
}

export class VerifyTakeoverDTO {
  @IsArray() @ArrayMinSize(1, { message: 'Cần ít nhất 1 bằng chứng tại chỗ' })
  @ValidateNested({ each: true }) @Type(() => ProofFileDTO)
  evidenceFiles!: ProofFileDTO[];
}
```

---

### 5.4 — `request-access.service.ts` (lazy resolver + 3 nhánh + set hold)

**`modules/request-access/request-access.service.ts`**

```ts
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  RequestAccess,
  RequestAccessDocument,
} from 'src/common/schemas/request-access.schema';
import {
  Location,
  LocationDocument,
} from 'src/common/schemas/location.schema';
import {
  ClaimRequest,
  ClaimRequestDocument,
} from 'src/common/schemas/claim-request.schema';
import { AuditLog } from 'src/common/schemas/audit-log.schema';
import {
  ClaimRequestStatus,
  RequestAccessStatus,
} from 'src/common/schemas/common.enums';
import {
  NOTIFICATION_PORT,
  NotificationPort,
} from 'src/common/contracts/notification.port';
import { CreateRequestAccessDTO } from './dto/create-request-access.dto';
import {
  RespondAction,
  RespondRequestAccessDTO,
} from './dto/respond-request-access.dto';
import { VerifyTakeoverDTO } from './dto/verify-takeover.dto';

const REQUEST_TIMEOUT_DAYS = 3; // BR-55
const HOLD_DAYS = 7; // BR-56
const DAY_MS = 24 * 60 * 60 * 1000;

/** Trạng thái "hiệu lực" suy ra khi đọc (lazy) — KHÔNG ghi vào DB. */
export type EffectiveState =
  | 'PENDING_OPEN' // PENDING, còn trong hạn 3 ngày → owner còn quyền trả lời
  | 'PENDING_TIMED_OUT' // PENDING, đã quá hạn → B được verify để auto-transfer
  | 'GRANTED'
  | 'REJECTED'
  | 'AUTO_GRANTED';

@Injectable()
export class RequestAccessService {
  constructor(
    @InjectModel(RequestAccess.name)
    private reqModel: Model<RequestAccessDocument>,
    @InjectModel(Location.name)
    private locationModel: Model<LocationDocument>,
    @InjectModel(ClaimRequest.name)
    private claimModel: Model<ClaimRequestDocument>,
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLog>,
    @Inject(NOTIFICATION_PORT) private notification: NotificationPort,
  ) {}

  // ──────────────────────────────────────────────────────────────
  // LAZY RESOLVER (BR-55) — trái tim của ticket. KHÔNG cron.
  // Tính trạng thái hiệu lực tại thời điểm đọc; không tự ghi EXPIRED.
  // ──────────────────────────────────────────────────────────────
  resolveEffectiveState(
    req: Pick<RequestAccess, 'status' | 'timeoutAt'>,
    now: Date = new Date(),
  ): EffectiveState {
    switch (req.status) {
      case RequestAccessStatus.GRANTED:
        return 'GRANTED';
      case RequestAccessStatus.REJECTED:
        return 'REJECTED';
      case RequestAccessStatus.AUTO_GRANTED:
        return 'AUTO_GRANTED';
      case RequestAccessStatus.PENDING:
      default:
        return now > req.timeoutAt ? 'PENDING_TIMED_OUT' : 'PENDING_OPEN';
    }
  }

  // ── (1) B GỬI YÊU CẦU ─────────────────────────────────────────
  async createRequest(requesterId: string, dto: CreateRequestAccessDTO) {
    try {
      if (!Types.ObjectId.isValid(dto.locationId))
        return { success: false, statusCode: 400, message: 'ID địa điểm không hợp lệ' };

      const location = await this.locationModel.findById(dto.locationId).exec();
      if (!location)
        return { success: false, statusCode: 404, message: 'Không tìm thấy địa điểm' };

      // Phải là địa điểm ĐÃ CÓ CHỦ (request-access = xin từ chủ hiện tại).
      if (!location.ownerId)
        return {
          success: false,
          statusCode: 409,
          message: 'Địa điểm chưa có chủ — hãy dùng luồng claim (F23) thay vì request-access',
        };

      const ownerIdStr = String(location.ownerId);
      // Không thể tự xin quyền của chính mình.
      if (ownerIdStr === requesterId)
        return { success: false, statusCode: 409, message: 'Bạn đã là chủ địa điểm này' };

      // BR-61/I6 — SLOT DÙNG CHUNG VỚI CLAIM. Index unique chỉ chặn trong cùng
      // collection request-access; claim ở collection khác nên PHẢI tự kiểm.
      const pendingClaim = await this.claimModel.exists({
        locationId: location._id,
        status: ClaimRequestStatus.PENDING,
      });
      if (pendingClaim)
        return {
          success: false,
          statusCode: 409,
          message: 'Địa điểm đang có một yêu cầu nhận quyền (claim) chờ xử lý — chỉ 1 slot/địa điểm',
        };

      // (Phòng thủ thêm; index unique vẫn là nguồn chân lý cho 2 request-access song song.)
      const pendingReq = await this.reqModel.exists({
        locationId: location._id,
        status: RequestAccessStatus.PENDING,
      });
      if (pendingReq)
        return {
          success: false,
          statusCode: 409,
          message: 'Địa điểm đang có một yêu cầu chuyển quyền chờ xử lý',
        };

      const now = new Date();
      const created = await this.reqModel.create({
        locationId: location._id,
        requesterId: new Types.ObjectId(requesterId),
        currentOwnerId: location.ownerId,
        evidenceFiles: dto.evidenceFiles ?? [],
        otpVerified: false,
        status: RequestAccessStatus.PENDING,
        timeoutAt: new Date(now.getTime() + REQUEST_TIMEOUT_DAYS * DAY_MS), // BR-55: now + 3 ngày
        responseReason: dto.reason, // lý do của requester (tạm lưu chung field)
      });

      // Notify owner A (M3 port). Owner có 3 ngày để trả lời.
      await this.notification.notify({
        userId: ownerIdStr,
        type: 'REQUEST_ACCESS_RECEIVED',
        title: 'Có người xin chuyển quyền địa điểm của bạn',
        body: `Địa điểm "${location.name}" nhận được một yêu cầu chuyển quyền. Bạn có ${REQUEST_TIMEOUT_DAYS} ngày để phản hồi.`,
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
    } catch (error) {
      if (error?.code === 11000)
        return {
          success: false,
          statusCode: 409,
          message: 'Địa điểm đang có một yêu cầu chuyển quyền chờ xử lý',
        };
      console.log('createRequest error:', error);
      return { success: false, statusCode: 500, message: 'Lỗi khi tạo yêu cầu chuyển quyền' };
    }
  }

  // ── ĐỌC chi tiết (thể hiện lazy-timeout khi đọc) ──────────────
  async getRequestById(requestId: string, viewerId: string) {
    try {
      if (!Types.ObjectId.isValid(requestId))
        return { success: false, statusCode: 400, message: 'ID không hợp lệ' };

      const req = await this.reqModel.findById(requestId).lean().exec();
      if (!req)
        return { success: false, statusCode: 404, message: 'Không tìm thấy yêu cầu' };

      // Chỉ owner hoặc requester được xem.
      const isOwner = String(req.currentOwnerId) === viewerId;
      const isRequester = String(req.requesterId) === viewerId;
      if (!isOwner && !isRequester)
        return { success: false, statusCode: 403, message: 'Bạn không có quyền xem yêu cầu này' };

      const effective = this.resolveEffectiveState(req); // ← LAZY tại điểm đọc
      return {
        success: true,
        request: {
          ...req,
          effectiveState: effective,
          isExpired: effective === 'PENDING_TIMED_OUT',
          // Gợi ý cho B: chỉ verify được khi đã quá hạn.
          canVerifyTakeover: isRequester && effective === 'PENDING_TIMED_OUT',
        },
      };
    } catch (error) {
      console.log('getRequestById error:', error);
      return { success: false, statusCode: 500, message: 'Lỗi khi lấy yêu cầu' };
    }
  }

  // ── (2) OWNER TRẢ LỜI: nhánh (a) Grant / (b) Reject ───────────
  async respond(requestId: string, ownerId: string, dto: RespondRequestAccessDTO) {
    try {
      if (!Types.ObjectId.isValid(requestId))
        return { success: false, statusCode: 400, message: 'ID không hợp lệ' };

      const req = await this.reqModel.findById(requestId).exec();
      if (!req)
        return { success: false, statusCode: 404, message: 'Không tìm thấy yêu cầu' };

      // Chỉ CHỦ HIỆN TẠI được trả lời.
      if (String(req.currentOwnerId) !== ownerId)
        return { success: false, statusCode: 403, message: 'Chỉ chủ địa điểm mới được phản hồi' };

      if (req.status !== RequestAccessStatus.PENDING)
        return {
          success: false,
          statusCode: 409,
          message: `Yêu cầu đã ở trạng thái ${req.status}, không thể phản hồi`,
        };

      const location = await this.locationModel.findById(req.locationId).exec();
      if (!location)
        return { success: false, statusCode: 404, message: 'Không tìm thấy địa điểm' };

      const now = new Date();
      req.respondedAt = now;

      // ───── NHÁNH (b): REJECT — KHÔNG đổi owner, KHÔNG hold ─────
      if (dto.action === RespondAction.REJECT) {
        req.status = RequestAccessStatus.REJECTED;
        req.responseReason = dto.reason;
        await req.save();

        await this.notification.notify({
          userId: String(req.requesterId),
          type: 'REQUEST_ACCESS_REJECTED',
          title: 'Yêu cầu chuyển quyền bị từ chối',
          body: `Yêu cầu của bạn cho "${location.name}" đã bị từ chối. Lý do: ${dto.reason}. Bạn có thể khiếu nại.`,
          refCollection: 'request_accesses',
          refId: String(req._id),
        });

        await this.audit(ownerId, 'REQUEST_ACCESS_REJECT', location._id, dto.reason, {
          requestId: String(req._id),
          status: { from: 'PENDING', to: 'REJECTED' },
        });

        return {
          success: true,
          message: 'Đã từ chối yêu cầu chuyển quyền',
          request: { id: req._id, status: req.status },
          // Cross-ref WDP-31/F27: reject → B kháng cáo → mở Dispute. KHÔNG tạo Dispute ở đây.
          canAppeal: true,
          // TODO: depends on F27/WDP-31 — endpoint mở Dispute để B kháng cáo
          appealHint: 'Mở tranh chấp (Dispute) tại luồng F27 để khiếu nại quyết định này.',
        };
      }

      // ───── NHÁNH (a): GRANT — transfer + HOLD 7 ngày ──────────
      // Transfer KHÔNG qua Admin → BR-56: BẮT BUỘC bật hold.
      const fromOwner = String(location.ownerId);
      location.ownerId = req.requesterId;
      location.holdExpiresAt = new Date(now.getTime() + HOLD_DAYS * DAY_MS); // BR-56
      await location.save();

      req.status = RequestAccessStatus.GRANTED;
      await req.save();

      await this.notifyTransfer(location, req, fromOwner, 'GRANTED');
      await this.audit(ownerId, 'REQUEST_ACCESS_GRANT', location._id, dto.reason, {
        requestId: String(req._id),
        owner: { from: fromOwner, to: String(req.requesterId) },
        holdExpiresAt: location.holdExpiresAt,
        status: { from: 'PENDING', to: 'GRANTED' },
      });

      return {
        success: true,
        message: 'Đã chuyển quyền sở hữu (kèm khóa 7 ngày)',
        request: { id: req._id, status: req.status },
        location: { id: location._id, ownerId: location.ownerId, holdExpiresAt: location.holdExpiresAt },
      };
    } catch (error) {
      console.log('respond error:', error);
      return { success: false, statusCode: 500, message: 'Lỗi khi phản hồi yêu cầu' };
    }
  }

  // ── (3) NHÁNH (c): B VERIFY khi owner im lặng quá hạn ─────────
  async verifyTakeover(requestId: string, requesterId: string, dto: VerifyTakeoverDTO) {
    try {
      if (!Types.ObjectId.isValid(requestId))
        return { success: false, statusCode: 400, message: 'ID không hợp lệ' };

      const req = await this.reqModel.findById(requestId).exec();
      if (!req)
        return { success: false, statusCode: 404, message: 'Không tìm thấy yêu cầu' };

      if (String(req.requesterId) !== requesterId)
        return { success: false, statusCode: 403, message: 'Chỉ người gửi yêu cầu mới được xác minh' };

      if (req.status !== RequestAccessStatus.PENDING)
        return {
          success: false,
          statusCode: 409,
          message: `Yêu cầu đã ở trạng thái ${req.status}, không thể xác minh`,
        };

      // LAZY-TIMEOUT (BR-55): chỉ cho auto-transfer khi ĐÃ quá hạn 3 ngày.
      const now = new Date();
      if (this.resolveEffectiveState(req, now) !== 'PENDING_TIMED_OUT')
        return {
          success: false,
          statusCode: 409,
          message: 'Chưa hết hạn 3 ngày — chủ địa điểm vẫn còn quyền phản hồi',
        };

      const location = await this.locationModel.findById(req.locationId).exec();
      if (!location)
        return { success: false, statusCode: 404, message: 'Không tìm thấy địa điểm' };

      // Lưu proof + đánh dấu đã xác minh.
      // TODO: depends on F23/WDP-27 — gọi cơ chế cross-check geotag+timestamp+code thật của F23.
      // RULE-AMBIGUOUS: MVP chấp nhận proof có geo+capturedAt; F23 sẽ thắt chặt kiểm tra.
      req.evidenceFiles = dto.evidenceFiles as any;
      req.otpVerified = true; // tái dùng cờ "đã xác minh" của schema
      req.respondedAt = now;
      req.status = RequestAccessStatus.AUTO_GRANTED;

      // AUTO-TRANSFER + HOLD 7 ngày BẮT BUỘC (BR-56).
      const fromOwner = String(location.ownerId);
      location.ownerId = req.requesterId;
      location.holdExpiresAt = new Date(now.getTime() + HOLD_DAYS * DAY_MS);
      await location.save();
      await req.save();

      await this.notifyTransfer(location, req, fromOwner, 'AUTO_GRANTED');
      await this.audit(requesterId, 'REQUEST_ACCESS_AUTO_GRANT', location._id, 'Owner im lặng quá hạn 3 ngày', {
        requestId: String(req._id),
        owner: { from: fromOwner, to: String(req.requesterId) },
        holdExpiresAt: location.holdExpiresAt,
        status: { from: 'PENDING', to: 'AUTO_GRANTED' },
      });

      return {
        success: true,
        message: 'Đã tự động chuyển quyền do chủ cũ không phản hồi (kèm khóa 7 ngày)',
        request: { id: req._id, status: req.status },
        location: { id: location._id, ownerId: location.ownerId, holdExpiresAt: location.holdExpiresAt },
      };
    } catch (error) {
      console.log('verifyTakeover error:', error);
      return { success: false, statusCode: 500, message: 'Lỗi khi xác minh chuyển quyền' };
    }
  }

  // ── helper: notify cả 2 bên khi transfer ──────────────────────
  private async notifyTransfer(
    location: LocationDocument,
    req: RequestAccessDocument,
    fromOwnerId: string,
    kind: 'GRANTED' | 'AUTO_GRANTED',
  ) {
    const reason =
      kind === 'GRANTED' ? 'chủ cũ đã đồng ý' : 'chủ cũ không phản hồi trong 3 ngày';
    await Promise.all([
      this.notification.notify({
        userId: String(req.requesterId),
        type: 'OWNERSHIP_TRANSFERRED_TO_YOU',
        title: 'Bạn đã trở thành chủ địa điểm',
        body: `Bạn đã nhận quyền "${location.name}" (${reason}). Địa điểm bị khóa các thao tác phá hủy đến ${location.holdExpiresAt?.toISOString()}.`,
        refCollection: 'locations',
        refId: String(location._id),
      }),
      this.notification.notify({
        userId: fromOwnerId,
        type: 'OWNERSHIP_TRANSFERRED_AWAY',
        title: 'Quyền sở hữu địa điểm đã chuyển đi',
        body: `Quyền "${location.name}" đã được chuyển cho người khác (${reason}).`,
        refCollection: 'locations',
        refId: String(location._id),
      }),
    ]);
  }

  // ── helper audit (I4/BR-43) ───────────────────────────────────
  private async audit(
    actorId: string,
    action: string,
    targetId: Types.ObjectId,
    reason?: string,
    diff?: Record<string, any>,
  ) {
    await this.auditModel.create({
      actorId: new Types.ObjectId(actorId),
      action,
      targetCollection: 'locations',
      targetId,
      reason,
      diff,
    });
  }
}
```

> **Điểm reviewer soi:**
> - `resolveEffectiveState` là hàm **thuần**, được gọi ở `getRequestById` (đọc) **và** `verifyTakeover` (B bấm verify) → **không** có nơi nào ghi `EXPIRED`, **không** có `@Cron`. Đó là lazy-timeout đúng chuẩn BR-55.
> - Hold (`holdExpiresAt = now + 7d`) chỉ set ở **(a) grant** và **(c) auto-grant**. **Reject** không đụng `ownerId`/`holdExpiresAt`.

---

### 5.5 — Controller

**`modules/request-access/request-access.controller.ts`**

```ts
import {
  BadRequestException,
  Body,
  Controller,
  ConflictException,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequestAccessService } from './request-access.service';
import { CreateRequestAccessDTO } from './dto/create-request-access.dto';
import { RespondRequestAccessDTO } from './dto/respond-request-access.dto';
import { VerifyTakeoverDTO } from './dto/verify-takeover.dto';

interface AuthenticatedRequest extends Request {
  user: { userId: string };
}

@ApiTags('request-access')
@ApiBearerAuth()
@Controller('request-access')
@UseGuards(AuthGuard('jwt-at')) // I3: mọi action ghi đều cần đăng nhập
export class RequestAccessController {
  constructor(private readonly service: RequestAccessService) {}

  // B gửi yêu cầu chuyển quyền
  @Post()
  async create(@Body() dto: CreateRequestAccessDTO, @Request() req: AuthenticatedRequest) {
    return this.handle(await this.service.createRequest(req.user.userId, dto));
  }

  // Xem chi tiết (lazy-timeout thể hiện qua effectiveState/isExpired)
  @Get(':id')
  async getOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.handle(await this.service.getRequestById(id, req.user.userId));
  }

  // Owner trả lời: GRANT / REJECT
  @Patch(':id/respond')
  async respond(
    @Param('id') id: string,
    @Body() dto: RespondRequestAccessDTO,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.handle(await this.service.respond(id, req.user.userId, dto));
  }

  // B verify on-site sau khi owner im lặng quá hạn → auto-transfer
  @Patch(':id/verify-takeover')
  async verify(
    @Param('id') id: string,
    @Body() dto: VerifyTakeoverDTO,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.handle(await this.service.verifyTakeover(id, req.user.userId, dto));
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

> Dùng `ConflictException` (409) cho các trường hợp slot trùng / chưa tới hạn / sai trạng thái — đúng ngữ nghĩa REST. (WDP-19 map 409 sang `ForbiddenException`; ở đây 409 hợp hơn vì là xung đột trạng thái, không phải thiếu quyền.)

---

### 5.6 — (tùy chọn) endpoint demo để tự test `isUnderHold`

> Việc tích hợp `assertNotUnderHold` vào luồng sửa địa điểm là của **WDP-36/F32 (Minh)**. Để **tự nghiệm thu** helper trong phạm vi ticket của bạn, có thể thêm 1 endpoint nhỏ mô phỏng "ẩn địa điểm" — **xóa sau khi F32 nhận việc** để tránh trùng:

```ts
// TẠM trong request-access.controller.ts — DEMO, gỡ khi F32 làm thật.
@Patch('demo/locations/:id/hide')
async demoHide(@Param('id') id: string) {
  return this.handle(await this.service.demoHideLocation(id));
}
```

```ts
// TẠM trong request-access.service.ts — DEMO hold guard. Gỡ khi F32 làm thật.
import { assertNotUnderHold } from 'src/common/ownership/hold.util';
import { LocationStatus } from 'src/common/schemas/common.enums';

async demoHideLocation(locationId: string) {
  const location = await this.locationModel.findById(locationId).exec();
  if (!location) return { success: false, statusCode: 404, message: 'Không tìm thấy địa điểm' };
  assertNotUnderHold(location, 'HIDE_LOCATION'); // ném 403 nếu đang hold
  location.status = LocationStatus.HIDDEN;
  await location.save();
  return { success: true, message: 'Đã ẩn địa điểm' };
}
```

---

### 5.7 — Module + nối AppModule

**`modules/request-access/request-access.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { SchemaModule } from 'src/common/schemas/schema.module';
import {
  NOTIFICATION_PORT,
  NotificationStub,
} from 'src/common/contracts/notification.port';
import { RequestAccessController } from './request-access.controller';
import { RequestAccessService } from './request-access.service';

@Module({
  imports: [SchemaModule], // SchemaModule export mọi Model — đủ dùng
  controllers: [RequestAccessController],
  providers: [
    RequestAccessService,
    // AtStrategy KHÔNG cần — AuthModule đã đăng ký chiến lược 'jwt-at' toàn cục.
    // STUB tạm — TODO: depends on WDP-7 — khi M3 xong, đổi useClass sang NotificationsService thật
    { provide: NOTIFICATION_PORT, useClass: NotificationStub },
  ],
})
export class RequestAccessModule {}
```

**Sửa `app.module.ts`** — thêm `RequestAccessModule` vào `imports`:

```ts
import { RequestAccessModule } from './modules/request-access/request-access.module';
// ...
imports: [ /* ... */ AuthModule, SchemaModule, LocationModule, RequestAccessModule ],
```

> Khi M3 (WDP-7) xong: xóa `NotificationStub`, import `NotificationsModule` thật, đổi `useClass`. Interface giữ nguyên nên service của bạn không phải sửa.

---

## 6. Seed data để test (cần 1 địa điểm CÓ CHỦ + 2 user)

Phụ thuộc: request-access cần một **địa điểm đã có chủ** (`ownerId != null`). Owned location thường được tạo bởi **WDP-28/F24 (claim approve)** hoặc **WDP-29/F25 (vendor register)** — cả 2 đang `To Do`. → **Seed tay** bằng MongoDB Compass / mongosh.

**Bước 1 — 2 user** (A = chủ hiện tại, B = người xin). Có thể dùng 2 tài khoản đã đăng ký; chỉ cần `_id` của chúng.

```js
// mongosh — lấy id 2 user có sẵn, hoặc tạo nhanh:
const A = db.users.findOne({ email: 'ownerA@test.com' })._id;
const B = db.users.findOne({ email: 'userB@test.com' })._id;
```

**Bước 2 — 1 địa điểm có chủ A** (field bắt buộc theo `location.schema.ts`: `submittedBy, name(≥3), description(≥10), address, geo, source, categoryId`):

```js
db.locations.insertOne({
  submittedBy: A,
  ownerId: A,                          // ← ĐÃ CÓ CHỦ
  name: 'Quán Cà Phê Owned Test',
  description: 'Địa điểm đã có chủ để test request-access',
  address: '123 Test Street, Hoa Lac',
  geo: { type: 'Point', coordinates: [105.52, 21.01] },
  source: 'VENDOR',
  categoryId: ObjectId('<categoryId thật>'),
  status: 'PUBLISHED',
  isDuplicate: false,
  isSuspectedDuplicate: false,
  viewCount: 0,
  subCategoryIds: [],
  images: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});
```

**Bước 3 — test nhánh (c) cần "đã quá hạn".** Vì không có cron, đơn giản nhất: sau khi B gửi request, **set lùi `timeoutAt`** về quá khứ để mô phỏng đã qua 3 ngày:

```js
db.request_accesses.updateOne(
  { _id: ObjectId('<requestId>') },
  { $set: { timeoutAt: new Date(Date.now() - 60 * 1000) } } // 1 phút trước
);
```

> Test xong **xóa** record seed. KHÔNG commit dữ liệu seed.

---

## 7. Chạy & test (Swagger + mongosh)

```bash
# từ thư mục gốc repo (repo đã chuyển pnpm → npm)
npm run start:dev --workspace=api
# hoặc: npm run dev:api
```

Swagger `http://localhost:3000/api/docs` → `POST /api/auth/login` (user B) → Authorize bằng token của B. Đổi token sang A khi cần đóng vai owner.

| # | API (đăng nhập) | Kỳ vọng |
|---|---|---|
| 1 | **B**: `POST /api/request-access` `{locationId}` | 201, tạo PENDING, `timeoutAt ≈ now+3d`; `notifications` có doc cho A |
| 2 | **B**: `POST /api/request-access` lần 2 (cùng location) | 409 "đang có yêu cầu… chờ xử lý" (slot trùng) |
| 3 | **B**: gửi request lên location **chưa có chủ** | 409 "chưa có chủ — hãy dùng claim" |
| 4 | **B**: gửi request lên location mình đang sở hữu | 409 "Bạn đã là chủ" |
| 5 | seed 1 `claim_requests` PENDING cho location đó → **B** gửi request | 409 "đang có claim… chờ xử lý" (cross-constraint I6) |
| 6 | **A hoặc B**: `GET /api/request-access/:id` (còn hạn) | `effectiveState=PENDING_OPEN`, `isExpired=false` |
| 7 | **C (user thứ 3)**: `GET /api/request-access/:id` | 403 (không phải owner/requester) |
| 8a | **A**: `PATCH /:id/respond` `{action:'GRANT'}` | 200; `location.ownerId=B`; `holdExpiresAt ≈ now+7d`; 2 notify; `audit_logs` có doc `REQUEST_ACCESS_GRANT` |
| 8b | **A**: `PATCH /:id/respond` `{action:'REJECT', reason:'...'}` | 200; `ownerId` **giữ nguyên**; `holdExpiresAt` **không set**; `canAppeal=true`; status `REJECTED` |
| 9 | **A**: respond lần 2 (request đã GRANTED/REJECTED) | 409 "đã ở trạng thái…" |
| 10 | **B**: `PATCH /:id/verify-takeover` khi **còn hạn** | 409 "Chưa hết hạn 3 ngày" |
| 11 | set lùi `timeoutAt` (mongosh, §6 bước 3) → **B**: `PATCH /:id/verify-takeover` `{evidenceFiles:[…]}` | 200; `status=AUTO_GRANTED`; `ownerId=B`; `holdExpiresAt ≈ now+7d`; 2 notify; audit `REQUEST_ACCESS_AUTO_GRANT` |
| 12 | **B**: `PATCH /:id/verify-takeover` không kèm evidence | 400 (DTO `ArrayMinSize`) |
| 13 | (demo §5.6) `PATCH /demo/locations/:id/hide` khi đang hold | 403 "đang trong thời gian khóa…" |
| 14 | (demo) sau khi set `holdExpiresAt` lùi quá khứ → hide lại | 200 (hold đã hết) |

**Kiểm DB sau test:**
- `request_accesses`: status đổi đúng nhánh; `respondedAt` set khi respond/verify.
- `locations`: `ownerId` đổi đúng (a)/(c), **không** đổi ở (b); `holdExpiresAt` chỉ có ở (a)/(c).
- `notifications`: có doc ở mỗi mốc (stub M3).
- `audit_logs`: có doc grant/reject/auto-grant.

---

## 8. Checklist nghiệm thu (map DoD + invariants)

**DoD chính:**
- [ ] **Nhánh (a) Grant**: `ownerId←B`, `status=GRANTED`, `holdExpiresAt=now+7d`, notify 2 bên, audit.
- [ ] **Nhánh (b) Reject**: `status=REJECTED`+`responseReason`, `ownerId` giữ nguyên, **không hold**, trả `canAppeal=true` (cross-ref F27).
- [ ] **Nhánh (c) Silent→verify**: chỉ chạy khi `now>timeoutAt`, `status=AUTO_GRANTED`, `ownerId←B`, `holdExpiresAt=now+7d` (bắt buộc), notify 2 bên, audit.
- [ ] **Hold chặn đúng**: `assertNotUnderHold` chặn HIDE/BULK_DELETE/EDIT_CORE_INFO; cho phép giờ/mô tả.
- [ ] **Chỉ 1 PENDING slot**: request thứ 2 bị 409; có claim PENDING cũng bị 409 (cross-constraint).

**Lazy-timeout (BR-55) — reviewer soi:**
- [ ] **KHÔNG** có `@Cron` / `@nestjs/schedule` / `setInterval` ở bất kỳ đâu.
- [ ] "Quá hạn" tính qua `resolveEffectiveState` khi đọc / khi verify; request vẫn `PENDING` cho tới khi B verify.

**Hold (BR-56) — reviewer soi:**
- [ ] Hold dùng `location.holdExpiresAt` (KHÔNG tạo collection `OwnershipHold`).
- [ ] Hold **chỉ** bật ở transfer **không qua Admin** (a/c). Hiểu rõ: transfer do Admin (F27) **không** hold.

**Invariants:**
- [ ] **I6**: 1 location/1 owner; chỉ 1 PENDING slot (claim hoặc request-access).
- [ ] **I3**: mọi endpoint ghi đều `@UseGuards(AuthGuard('jwt-at'))`.
- [ ] **I1**: không hard-delete (nhánh nào cũng đổi trạng thái, không `deleteOne`).
- [ ] **I4**: mọi lần chuyển quyền/từ chối ghi `audit_logs`.
- [ ] **I8**: không tự `trustScore += …` (F26 không chấm trust — xem flag §11).
- [ ] Có `// TODO: depends on Fxx` ở seam M3 / F23 / F27.

---

## 9. Việc cần CHỐT với team (mention trong PR)

1. **`isUnderHold` / `assertNotUnderHold` — sync với Minh (WDP-36/F32):** đây là helper **dùng chung**. Chốt: đặt ở `common/ownership/hold.util.ts`, chữ ký `isUnderHold(location, now?)` + `assertNotUnderHold(location, action, now?)`. Minh **gọi** ở đầu các hành động phá hủy trong F32; bạn **set** `holdExpiresAt`. Đừng để 2 người dựng 2 bản.
2. **Notification port — tái dùng của Dương (WDP-19/F15):** `notification.port.ts` đã có ở `common/contracts/`. Nếu WDP-19 chưa merge khi bạn code → tạm tạo cùng file, **khi merge gộp 1 bản**, đừng để 2 file.
3. **M3 thật (Đăng, WDP-7):** chốt `notify(...)` (eventType + payload). Khi M3 xong, đổi provider trong `request-access.module.ts`.
4. **Owned location để test (WDP-28/F24 Dương · WDP-29/F25 Minh):** cả 2 `To Do`. Trước mắt **seed tay** (§6). Khi F24/F25 xong → test bằng owned location thật.
5. **Reject→appeal mở Dispute (WDP-31/F27 Dương):** F26 chỉ trả `canAppeal=true` + hint. Việc tạo Dispute nằm ở F27. Chốt với chính mình (Dương làm cả 2): F27 sẽ đọc request `REJECTED` để dựng case 2 bên.
6. **On-site proof (WDP-27/F23 Dương):** nhánh (c) tái dùng chuẩn geotag+timestamp+code của F23. F23 chưa xong → MVP nhận `evidenceFiles[]` + seam `// TODO`. Khi F23 xong → gọi cross-check thật.
7. **Audit util (Trung, WDP-39):** đang ghi `audit_logs` trực tiếp; sau gộp về util chung.

---

## 10. Thứ tự code (commit nhỏ)

1. `hold.util.ts` (`isUnderHold` + `assertNotUnderHold`) → unit-test thuần (đang/không hold).
2. `notification.port.ts` (tái dùng / tạo stub nếu WDP-19 chưa merge).
3. DTO (create / respond / verify-takeover).
4. `resolveEffectiveState` + `createRequest` + `getRequestById` → test slot trùng + lazy `effectiveState`.
5. `respond` nhánh (a) grant → test transfer + hold + audit + notify.
6. `respond` nhánh (b) reject → test giữ owner + no-hold + `canAppeal`.
7. `verifyTakeover` nhánh (c) → test chặn-khi-còn-hạn + auto-transfer + hold (sau khi set lùi `timeoutAt`).
8. (tùy chọn) endpoint demo hold guard → test 403/200.
9. Module + nối `app.module.ts` → chạy full §7.
10. Chạy checklist §8 → PR → review → chuyển WDP-30 sang Done.

```bash
git checkout -b WDP-30-request-access-transfer-hold
# commit nhỏ theo §10
git push -u origin WDP-30-request-access-transfer-hold
```

> KHÔNG commit `/guideline` và dữ liệu seed tạm.

---

## 11. Cờ RULE-AMBIGUOUS / schema-gap (báo reviewer)

1. **`holdExpiresAt` vs `OwnershipHold` collection (quan trọng nhất):** bản nháp nghiệp vụ cũ từng liệt kê domain object `OwnershipHold` + enum `OwnershipHoldStatus = ACTIVE/EXPIRED`, **nhưng repo KHÔNG có** schema/collection `OwnershipHold` ([schema.module.ts](../apps/api/src/common/schemas/schema.module.ts) không đăng ký), enum này **không được dùng ở đâu**. → MVP mô hình hold bằng **đúng 1 field** `location.holdExpiresAt`. Đã ghi `// RULE-AMBIGUOUS` ở `hold.util.ts`. Nếu Phase 2 cần lịch sử nhiều lần hold/nhiều địa điểm → mới tách collection riêng.

2. **Slot dùng chung claim ↔ request-access KHÔNG được index DB bảo vệ:** mỗi schema (`claim_requests`, `request_accesses`) có unique partial index `{locationId,status}` where PENDING **riêng trong collection của nó**. Mongo không enforce unique **chéo collection** → ràng buộc I6 "chỉ 1 trong 2 PENDING" **phải tự kiểm trong service** (đã làm: đếm claim PENDING trước khi tạo request). Reviewer nên biết đây là ràng buộc tầng ứng dụng, không phải tầng DB.

3. **`responseReason` bị dùng cho 2 mục đích:** schema chỉ có 1 field text `responseReason`. MVP tạm dùng nó để (a) lưu lý do của **requester** lúc gửi, rồi (b) ghi đè bằng lý do **reject của owner**. Vì sau khi reject thì lý do requester không còn cần hiển thị, việc ghi đè chấp nhận được; nhưng nếu cần giữ cả 2 → đề xuất thêm field `requesterReason` (đổi schema = đụng WDP-5, phải xin phép). Hiện **không** đổi schema.

4. **Trust khi transfer — F26 KHÔNG chấm điểm:** F26 **không** nằm trong nhóm luồng gọi Trust Engine (khác F15/F22/F27). Nên MVP **không** gọi M2 khi chuyển quyền. Nếu reviewer muốn cộng/trừ trust cho hành vi "im lặng để mất quyền" → phải bổ sung luật mới + gọi qua M2 port (đừng tự cộng điểm — I8). Để ngỏ, không tự quyết.

5. **`EXPIRED` / `ESCALATED` trong enum nhưng MVP không dùng:** do lazy-timeout, request quá hạn vẫn nằm `PENDING` (không tự chuyển `EXPIRED`). `ESCALATED` thuộc luồng tranh chấp nâng cao (Phase 2). Không set 2 giá trị này ở F26.
