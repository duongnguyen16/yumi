# WDP-27 — F23: Claim địa điểm + xác minh — Hướng dẫn tự triển khai (manual)

> Tài liệu cá nhân, **đã gitignore** (`/guideline/`). Không commit.
> **Tự chứa:** đọc file này là code được, **không cần mở Jira (WDP-xx) hay file nghiệp vụ (SPECS/SRS)**. Mọi thuật ngữ nghiệp vụ cần thiết đã giải nghĩa ngay trong guide.
> Mục tiêu: bạn tự code WDP-27 từ đầu đến cuối mà không cần Agent, đúng convention repo.
> ⚠️ Ticket này **KHÔNG gán owner** — owner chỉ được gán ở **[WDP-28 (Admin xét claim)](WDP-28-admin-xet-claim.md)**. Ở đây bạn chỉ tạo `ClaimRequest` `status=PENDING`. Đây là invariant **I5** (xem §1).

---

## 📖 Trước khi code — thuật ngữ & bối cảnh (đọc 1 lần)

Bạn đang làm backend cho tính năng **"claim địa điểm"**. Bối cảnh: hệ thống **Campus Local Guide** là bản đồ chia sẻ địa điểm quanh trường. Customer đóng góp địa điểm, nên trong DB có nhiều địa điểm **chưa có chủ** (no-owner). **"Claim"** = một **vendor** (chủ quán/cửa hàng) đứng ra nói *"địa điểm này là của tôi, cho tôi nhận quyền sở hữu nó"*. Ticket này lo **phần vendor nộp yêu cầu claim**; việc **duyệt** yêu cầu đó là ticket khác ([WDP-28](WDP-28-admin-xet-claim.md)).

Vì "nhận sở hữu" là chuyện lớn (ai claim bừa sẽ chiếm quán của người khác), hệ thống bắt vendor chứng minh mình **thật sự đang kiểm soát địa điểm đó** bằng **3 yếu tố xác minh độc lập** (mỗi yếu tố khó giả mạo theo một kiểu khác nhau):

| Yếu tố | Là gì | Ý nghĩa "khó giả" |
|---|---|---|
| **(a) OTP về SĐT của listing** | Gửi mã 6 số tới **số điện thoại của địa điểm** (không phải SĐT của người dùng), vendor phải đọc được mã | Chứng minh vendor kiểm soát đường dây điện thoại của quán |
| **(b) Mã dùng-một-lần đặt tại hiện trường** | Hệ thống cấp 1 mã (vd `CLG-ABC123`), vendor phải **mang ra đặt cạnh biển hiệu** rồi chụp lại | Chứng minh vendor **đang đứng tại quán** đúng lúc claim |
| **(c) Ảnh geotag + timestamp** | Ảnh hiện trường (biển hiệu + mã ở trên) có **toạ độ GPS** + **thời điểm chụp** | Chứng minh ảnh chụp **đúng chỗ, đúng lúc**, không phải ảnh cũ/lấy trên mạng |

Giấy phép kinh doanh là **tuỳ chọn** — xác minh dựa vào *kiểm soát vật lý*, không phải giấy tờ.

**Thuật ngữ & "mã luật" sẽ gặp trong guide** (thấy trong guide nghĩa là đã giải nghĩa tại chỗ, không cần tra tài liệu gốc):
- **PENDING slot** = "ô chờ duyệt". Mỗi địa điểm chỉ được có **đúng 1 yêu cầu đang chờ** tại một thời điểm — dù là yêu cầu claim (ticket này) hay yêu cầu xin-quyền (request-access, ticket WDP-30). Nộp yêu cầu thứ 2 khi ô còn bận → bị chặn (409).
- **I5** ("tạo data ≠ sở hữu") = invariant **bất biến**: nộp claim **CHƯA** phải là được duyệt. Ticket này **tuyệt đối không** gán `location.ownerId`. Set owner ở đây = **fail review**. Owner chỉ đến ở bước Admin duyệt (WDP-28).
- **I6 / BR-61** = luật "1 địa điểm = 1 chủ; tại một thời điểm chỉ 1 PENDING slot". Vì slot dùng chung giữa 2 collection (`claim_requests` + `request_accesses`), phải đếm PENDING ở **cả hai** ở tầng service (xem §3.3).
- **I8** = luật "không tự chấm điểm uy tín (trust)". Ticket này **không đụng trust** — trust chỉ được cộng khi Admin duyệt claim ở WDP-28. **Đừng** viết `user.trustScore += ...` ở đây.

**Dùng lại vs tự build** (3 thứ có sẵn + 1 thứ tự tạo):

| Thứ | Trạng thái trong repo | Bạn làm gì |
|---|---|---|
| **SmsService** (gửi OTP) | ✅ Có sẵn [`apps/api/src/modules/auth/services/sms.service.ts`](apps/api/src/modules/auth/services/sms.service.ts) — dev mode in OTP ra console | **GỌI lại** `sendOtp(phone, otp)`. Không tự build SMS adapter (xem §5 Bước 0). |
| **Notification (M3)** | ⏳ Chưa xong (WDP-7 của Đăng) | **STUB** tạm qua port `NOTIFICATION_PORT`. Port đã tạo ở guide WDP-19 (`common/contracts/notification.port.ts`) → **import lại, đừng định nghĩa lại**; nếu chưa có thì tạo theo §2. |
| **Schema (data contract)** | ✅ Khoá (WDP-5) | Field cần đọc/ghi đã có sẵn ở `claim-request.schema.ts` + `location.schema.ts`. Enum lấy từ `common.enums.ts`. |
| **Module Claim + DTO + service** | ❌ Chưa có | **TỰ TẠO** toàn bộ (§4–§5) — đây là phần chính của ticket. |

---

## 0. Tóm tắt task

| | |
|---|---|
| **Issue** | [WDP-27](https://fptp.atlassian.net/browse/WDP-27) — `[S3] F23 — Claim địa điểm + xác minh` |
| **Quan trọng** | Core · Sprint S3 · Feature Ownership · HF-3 |
| **Mô tả** | Vendor claim một địa điểm **đã có sẵn** (no-owner). Bắt buộc **3 yếu tố xác minh độc lập** (BR-14): (a) **OTP gửi tới SĐT của listing**; (b) **mã dùng-một-lần do hệ thống cấp** mà người claim phải đặt tại hiện trường; (c) **ảnh hiện trường có geotag + timestamp** (biển hiệu + mã hệ thống). Giấy phép kinh doanh **tùy chọn** (BR-15). Chặn nếu đã có 1 PENDING (BR-61/I6) hoặc địa điểm đã có chủ. |
| **Đụng tới** | `api` (module Claim) + `mobile` (vendor claim wizard tại `app/claim/[locationId].tsx`) |
| **DoD** | (1) Claim chỉ gửi được khi **đủ cả 3 yếu tố**; (2) chặn **duplicate PENDING slot**; (3) **KHÔNG** gán owner (để F24 làm); (4) gọi **M3 notify** báo đã nhận claim. |

### Phân rã DoD
1. **Bước OTP:** gửi OTP tới `phone` của **listing** (không phải SĐT người dùng) → chứng minh kiểm soát số điện thoại của địa điểm. Reuse `SmsService.sendOtp`.
2. **Bước cấp mã:** hệ thống sinh **mã dùng-một-lần** (one-time site code) cho cặp (vendor, location), TTL ngắn. Người claim mang mã này ra **đặt tại biển hiệu** rồi chụp ảnh.
3. **Bước nộp claim:** upload **EvidenceFile** ảnh hiện trường có `geo` + `capturedAt` + (mã hệ thống nhìn thấy trong ảnh) → tạo `ClaimRequest { type: CLAIM_EXISTING_LOCATION, status: PENDING, otpVerified, evidenceFiles[], licenseUrl? }`.
4. **Chặn trùng:** đã có claim/request-access `PENDING` cho location này → **409** (I6/BR-61). Địa điểm đã `ownerId` → **409**, gợi ý **báo cáo (report)** thay vì claim (→ UC25).
5. **KHÔNG set `location.ownerId`** ở bất kỳ chỗ nào trong ticket này (I5).
6. **Gọi M3** (notification) báo vendor "đã nhận yêu cầu claim, đang chờ admin duyệt".

---

## 1. ⚠️ ĐỌC KỸ — cái gì TỰ BUILD, cái gì chỉ GỌI, cái gì KHÔNG được làm

Nhắc lại 3 invariant chi phối ticket này (đã giải nghĩa ở khối "Trước khi code" phía trên): **I5** (tạo data ≠ sở hữu), **I6/BR-61** (1 PENDING slot), **I8** (không tự chấm trust).

| Thành phần | Đây là gì | Bạn làm gì |
|---|---|---|
| **Gán owner cho location** | Việc của **WDP-28/F24 (Admin xét claim)** — cũng Dương | ❌ **TUYỆT ĐỐI KHÔNG.** I5: "tạo data ≠ sở hữu". Ticket này chỉ tạo `ClaimRequest` PENDING. Set `location.ownerId` ở đây = **fail review**. |
| **OTP / SMS** | `SmsService.sendOtp(phone, otp)` **ĐÃ CÓ** ([sms.service.ts](apps/api/src/modules/auth/services/sms.service.ts)). Dev mode log OTP ra console. | ✅ **GỌI lại.** Không tự build SMS adapter. Tách `SmsService` thành provider dùng chung được (xem §5 Bước 0). |
| **Notification (M3)** | **M3 = F03 / [WDP-7](https://fptp.atlassian.net/browse/WDP-7)**, owner **Đăng**, `Đang làm` | ❌ **KHÔNG build.** **GỌI** qua port `NOTIFICATION_PORT`. **Port này đã được tạo trong guide WDP-19** (`common/contracts/notification.port.ts`) → **import lại, đừng định nghĩa lại**. Nếu file chưa tồn tại (bạn chưa làm WDP-19) → tạo theo §2. |
| **Admin xét claim (đối chiếu OTP + proof, approve→gán owner)** | **WDP-28/F24** | ❌ Không làm ở đây. Ticket này **feed** vào F24. Xem cross-reference §9. |
| **Module Claim + DTO + service** | Chưa có (`grep` `modules/` chỉ có auth/locations/users/vendors) | ✅ **TỰ TẠO** toàn bộ (§4–§5). |

> **Invariant I5 (non-negotiable):** owner chỉ đến từ **claim-approval / register-with-proof / transfer**. Nộp claim **chưa** phải approval.
> **Invariant I6/BR-61 (non-negotiable):** 1 location = 1 owner; tại một thời điểm chỉ **1 PENDING slot** (claim **hoặc** request-access). Schema đã có **unique partial index** lo phần claim (xem §3.3).
> **Invariant I8:** mọi thay đổi trust qua Trust Engine (M2). Ticket này **không** đụng trust (trust cộng khi WDP-28 approve), nên **đừng** viết `user.trustScore += ...`.
> **Protocol khi dependency chưa xong:** stub interface theo contract, code phần của mình, đánh dấu seam `// TODO: depends on WDP-xx`. **Không tự bịa logic ticket khác.**
> **RULE-AMBIGUOUS:** khi 1 luật mơ hồ → chọn cách **chặt hơn (an toàn hơn)** + để lại comment `// RULE-AMBIGUOUS: ...` cho reviewer biết chỗ cần chốt.

**Còn lại bạn không bị chặn:** data contract khóa ở WDP-5 (Done). [claim-request.schema.ts](apps/api/src/common/schemas/claim-request.schema.ts) + [location.schema.ts](apps/api/src/common/schemas/location.schema.ts) đã có sẵn mọi field cần đọc/ghi. Chưa có location no-owner PUBLISHED để test → **seed tay** (§6).

---

## 2. Convention repo (bám theo cho khớp)

1. **Service trả object, KHÔNG throw:** `{ success, statusCode?, message?, ...data }` (xem [auth.service.ts](apps/api/src/modules/auth/auth.service.ts)).
2. **Controller** map object đó sang `HttpException` (xem [auth.controller.ts](apps/api/src/modules/auth/auth.controller.ts)).
3. **Auth:** `@UseGuards(AuthGuard('jwt-at'))`, lấy user qua `req.user.userId`. Token **chỉ có `userId`** ([at.strategy.ts](apps/api/src/common/guard/at.strategy.ts)).
4. **Module:** `imports: [SchemaModule]` để có mọi Model; `providers: [ClaimService]` (`AtStrategy` **không** cần thêm — `AuthModule` đã đăng ký chiến lược `'jwt-at'` toàn cục ở AppModule).
5. **DTO:** `class-validator`. `ValidationPipe({ whitelist: true, transform: true })` đã bật global ([main.ts](apps/api/src/main.ts)).
6. **Prefix `api`** → route thật là `/api/...`. Swagger `/api/docs` (đã bật `addBearerAuth`).
7. Message tiếng Việt có dấu.
8. **Enum lấy từ `common.enums.ts`** — không hardcode magic string. Dùng `ClaimRequestType.CLAIM_EXISTING_LOCATION`, `ClaimRequestStatus.PENDING`.
9. **OTP pattern reuse:** `crypto.randomInt(0, 1000000).toString().padStart(6,'0')` + `bcrypt.hash` + TTL 5 phút + max 5 lần thử + `findOneAndUpdate(..., { upsert: true })` (y hệt `requestVendorOtp`).

> **Notification port đã có sẵn (từ WDP-19):** nếu file `common/contracts/notification.port.ts` đã tồn tại → **import, đừng định nghĩa lại**. Nội dung file (để bạn đối chiếu / tạo nếu thiếu):
> ```ts
> import { Injectable } from '@nestjs/common';
> import { InjectModel } from '@nestjs/mongoose';
> import { Model } from 'mongoose';
> import { Notification } from 'src/common/schemas/notification.schema';
>
> export interface NotificationPort {
>   notify(params: {
>     userId: string; type: string; title: string; body: string;
>     refCollection?: string; refId?: string;
>   }): Promise<void>;
> }
> export const NOTIFICATION_PORT = Symbol('NOTIFICATION_PORT');
>
> /** STUB TẠM — chỉ tạo in-app notification. Email/SMS + template là việc M3/WDP-7. */
> @Injectable()
> export class NotificationStub implements NotificationPort {
>   constructor(@InjectModel(Notification.name) private model: Model<Notification>) {}
>   async notify(p: {
>     userId: string; type: string; title: string; body: string;
>     refCollection?: string; refId?: string;
>   }): Promise<void> {
>     // TODO: depends on F03/WDP-7 — thay bằng M3 service thật (email/SMS/template)
>     await this.model.create({ ...p, isRead: false });
>   }
> }
> ```

---

## 3. Quyết định kỹ thuật (chốt trước khi code)

### 3.1. Luồng 3-bước (3 yếu tố xác minh độc lập — BR-14)

```
[Vendor mở location no-owner PUBLISHED]
        │
  Bước 1: POST /api/claims/start
        │   ├─ chặn: location đã ownerId? → 409 "đã có chủ, hãy báo cáo"
        │   ├─ chặn: đã có claim/request-access PENDING? → 409 (I6/BR-61)
        │   ├─ sinh OTP (6 số) + sinh siteCode (mã đặt tại hiện trường)
        │   ├─ lưu ClaimVerificationSession (TTL ~30') {vendorId, locationId, otpHash, siteCode, expiresAt}
        │   └─ gọi SmsService.sendOtp(location.phone, otp)   ← OTP về SĐT LISTING
        │        (location KHÔNG có phone → bỏ qua OTP, đánh dấu otpRequired=false)
        ▼
  Bước 2: POST /api/claims/verify-otp  {locationId, otp}
        │   ├─ so bcrypt; sai → tăng attempts (max 5); hết hạn → 410
        │   └─ session.otpVerified = true
        ▼
  Bước 3: POST /api/claims/submit  {locationId, evidenceFiles[], licenseUrl?}
        │   ├─ yêu cầu: session tồn tại + (otpRequired ? otpVerified : true)
        │   ├─ yêu cầu: >=1 evidenceFile IMAGE có geo + capturedAt  (yếu tố c)
        │   ├─ (khuyến nghị) siteCode phải xuất hiện trong evidence.metadata (yếu tố b)
        │   ├─ tạo ClaimRequest {type: CLAIM_EXISTING_LOCATION, status: PENDING, otpVerified, evidenceFiles, licenseUrl}
        │   │     ← dựa unique partial index để chặn race duplicate PENDING
        │   ├─ xóa ClaimVerificationSession
        │   └─ notify(vendor, 'CLAIM_SUBMITTED', ...)   ← KHÔNG gán owner (I5)
        ▼
  [Chờ WDP-28/F24 Admin duyệt → mới gán owner]
```

### 3.2. 3 yếu tố map vào schema

| Yếu tố (BR-14) | Lưu ở đâu | Field |
|---|---|---|
| (a) Kiểm soát SĐT | `ClaimRequest.otpVerified` + `otpVerifiedAt` | đã có sẵn trong [claim-request.schema.ts](apps/api/src/common/schemas/claim-request.schema.ts) |
| (b) Mã hệ thống cấp, đặt tại hiện trường | **CHƯA có field riêng** → xem §3.4 (schema gap) | lưu tạm trong `ClaimVerificationSession.siteCode`; bản sao "đã thấy trong ảnh" vào `evidenceFiles[].metadata.siteCode` |
| (c) Ảnh hiện trường geotag + timestamp | `ClaimRequest.evidenceFiles[]` → `EvidenceFile` | `url`, `fileType:'IMAGE'`, `geo`, `accuracyMeters`, `capturedAt`, `metadata` — **tất cả đã có** trong [common.embedded.ts](apps/api/src/common/schemas/common.embedded.ts) |
| Giấy phép KD (tùy chọn — BR-15) | `ClaimRequest.licenseUrl?` | đã có sẵn |

### 3.3. Chống duplicate PENDING slot (I6/BR-61) — DỰA VÀO INDEX CÓ SẴN

`claim-request.schema.ts` đã khai báo:
```ts
ClaimRequestSchema.index(
  { locationId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: ClaimRequestStatus.PENDING } },
);
```
→ MongoDB chỉ cho phép **đúng 1 doc** có `(locationId, status=PENDING)`. Doc thứ 2 → **duplicate key error (11000)**.

**Chiến lược kép (cả 2, không chỉ 1):**
1. **Pre-check** (UX tốt, message rõ): trước khi tạo, query xem đã có claim PENDING **hoặc** request-access PENDING cho location chưa → trả 409 sớm.
2. **Catch 11000** (chống race-condition, nguồn chân lý): vẫn `try/catch` quanh `.create()`; bắt `error.code === 11000` → trả 409. Index mới là thứ đảm bảo cứng, pre-check chỉ là lớp UX.

> ⚠️ **request-access cũng chiếm slot** (I6 nói "claim OR request-access"). Index unique của claim **không** thấy được record bên `request_accesses`. → Phần pre-check phải query **cả 2 collection**. Đây là lý do không thể chỉ dựa index.

### 3.4. ⚠️ SCHEMA GAP — không có field cho "mã hệ thống cấp" (`siteCode`)

`ClaimRequest` **không có** field lưu mã dùng-một-lần mà hệ thống cấp ở Bước 1. Có 2 cách:

| Phương án | Mô tả | Đánh giá |
|---|---|---|
| **A. Collection tạm có TTL** (CHỌN) | Tạo `ClaimVerificationSession` (giống [pending-vendor-registration.schema.ts](apps/api/src/modules/vendors/schemas/pending-vendor-registration.schema.ts)): lưu `otpHash`, `siteCode`, `attempts`, `expiresAt` + TTL index `expireAfterSeconds: 0`. Mã sống ngắn, tự hết hạn, **không** rò vào `ClaimRequest` vĩnh viễn. | ✅ Chặt hơn, đúng pattern repo. **Khuyến nghị.** |
| B. Nhét vào `evidenceFiles[].metadata` | Dùng `metadata.siteCode` trên evidence để admin đối chiếu. | Cần để **admin (F24) xác minh** mã trong ảnh khớp mã cấp → vẫn nên giữ 1 bản ở metadata, NHƯNG đừng để đó là nơi lưu **bí mật** vì client gửi lên được. |

> **RULE-AMBIGUOUS — encode trong code:**
> ```ts
> // RULE-AMBIGUOUS (BR-14, F23): schema ClaimRequest không có field cho "system-issued
> //   one-time site code". Chọn phương án CHẶT HƠN: lưu mã ở collection tạm ClaimVerificationSession
> //   (TTL ngắn, giống pending-vendor-registration), KHÔNG persist mã bí mật vào ClaimRequest.
> //   Bản "mã nhìn thấy trong ảnh" do client khai báo lưu ở evidenceFiles[].metadata.siteCode
> //   để Admin (WDP-28/F24) đối chiếu thủ công. Cần chốt với team trước khi F24 review (xem §9).
> ```
> **Không tự thêm enum mới** (vd `ClaimRequestStatus.AWAITING_PROOF`) — quy tắc chung của repo: enum mới phải khai ở `common.enums.ts` (data contract dùng chung) và chốt cả team, không thêm lẻ. Trạng thái trung gian (đã gửi OTP, chưa nộp) ở đây là **session tạm**, không phải status của `ClaimRequest`.

### 3.5. Listing có `phone`, nhưng vẫn phải xử lý nhánh không có giá trị

`location` hiện có field `phone` trong [location.schema.ts](apps/api/src/common/schemas/location.schema.ts). Dùng trực tiếp `location.phone` để gửi OTP. Vì field là optional, location cũ hoặc community location vẫn có thể không có giá trị; khi đó:
- **Bỏ yếu tố (a)**, đặt `otpRequired = false`, `otpVerified = false`.
- **Bù lại bằng siết yếu tố (b)+(c):** vẫn bắt buộc on-site proof; ghi chú `metadata.adminScrutiny = 'NO_PHONE_HIGHER_SCRUTINY'` để **F24 soi kỹ hơn**.

> Không còn ambiguity về nguồn số điện thoại: ưu tiên `location.phone`. Nhánh no-phone chỉ là fallback dữ liệu thiếu, không được bỏ qua proof.

---

## 4. Cây file

```
apps/api/src/
├─ common/
│  └─ contracts/
│     └─ notification.port.ts            (ĐÃ CÓ từ WDP-19 — chỉ tạo nếu thiếu)
├─ common/schemas/
│  ├─ claim-verification-session.schema.ts  (TẠO) collection tạm TTL — lưu otpHash + siteCode
│  └─ schema.module.ts                    (SỬA: thêm ClaimVerificationSession vào forFeature)
├─ modules/claims/
│  ├─ dto/
│  │  ├─ start-claim.dto.ts
│  │  ├─ verify-claim-otp.dto.ts
│  │  └─ submit-claim.dto.ts
│  ├─ claim.service.ts
│  ├─ claim.controller.ts
│  └─ claim.module.ts
└─ app.module.ts                          (SỬA: thêm ClaimModule)
```

> Khi M3 (WDP-7) xong: trong `claim.module.ts` đổi `{ provide: NOTIFICATION_PORT, useClass: NotificationStub }` → service M3 thật. Interface giữ nguyên nên `claim.service.ts` không phải sửa.
> `SmsService` đang nằm trong module auth → §5 Bước 0 hướng dẫn export để dùng lại (đừng copy file).

---

## 5. Triển khai

### Bước 0 — Tái sử dụng `SmsService` (đừng copy)

`SmsService` ([sms.service.ts](apps/api/src/modules/auth/services/sms.service.ts)) hiện là provider nội bộ của `AuthModule`. Để `ClaimModule` dùng lại:
- **Cách gọn nhất:** trong `auth.module.ts`, thêm `SmsService` vào mảng `exports` (nếu chưa có), rồi `claim.module.ts` `imports: [AuthModule]`. **HOẶC**
- Tách `SmsService` ra `common/services/sms.service.ts` + một `SmsModule` nhỏ `exports: [SmsService]`, cả Auth lẫn Claim cùng import.

> Chọn cách 1 nếu không muốn đụng nhiều file; cách 2 sạch hơn về lâu dài. **Báo Đăng/Minh (owner auth)** trước khi sửa `auth.module.ts` để tránh đụng nhau (§9).
> Nội dung SMS hiện hardcode "đăng ký tài khoản vendor" — với claim nên truyền nội dung khác. Tạm chấp nhận (dev mode chỉ log); ghi `// TODO: depends on F03/WDP-7` để M3 chuẩn hóa template theo eventType.

---

### Bước 1 — Schema collection tạm (TTL) cho OTP + siteCode

**`common/schemas/claim-verification-session.schema.ts`** (mô phỏng `pending-vendor-registration`):
```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type ClaimVerificationSessionDocument =
  HydratedDocument<ClaimVerificationSession>;

@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: false },
  collection: 'claim_verification_sessions',
})
export class ClaimVerificationSession {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  vendorId!: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Location',
    required: true,
    index: true,
  })
  locationId!: Types.ObjectId;

  // Mã hệ thống cấp để đặt tại hiện trường (yếu tố b). Lưu PLAINTEXT ở đây là chấp nhận được
  // vì collection sống ngắn + chỉ server đọc; client phải tự chụp lại nên cần trả về 1 lần.
  @Prop({ required: true })
  siteCode!: string;

  // OTP gửi tới SĐT listing (yếu tố a) — chỉ lưu HASH, không lưu OTP thô.
  @Prop({ type: String, default: null })
  otp_hash?: string | null;

  // listing không có phone -> false -> bỏ qua bước verify-otp
  @Prop({ default: true })
  otpRequired!: boolean;

  @Prop({ default: false })
  otpVerified!: boolean;

  @Prop({ type: Number, default: 0 })
  attempts!: number;

  @Prop({ required: true })
  expires_at!: Date;

  created_at?: Date;
}

export const ClaimVerificationSessionSchema = SchemaFactory.createForClass(
  ClaimVerificationSession,
);

// 1 session sống / (vendor, location) — bấm "start" lại thì upsert đè
ClaimVerificationSessionSchema.index(
  { vendorId: 1, locationId: 1 },
  { unique: true },
);
// TTL: Mongo tự xóa khi quá expires_at (giống pending-vendor-registration)
ClaimVerificationSessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
```

**Sửa `common/schemas/schema.module.ts`** — thêm vào `forFeature`:
```ts
import {
  ClaimVerificationSession,
  ClaimVerificationSessionSchema,
} from './claim-verification-session.schema';
// ... trong MongooseModule.forFeature([ ... ]) thêm:
{ name: ClaimVerificationSession.name, schema: ClaimVerificationSessionSchema },
```

---

### Bước 2 — DTO

**`modules/claims/dto/start-claim.dto.ts`**
```ts
import { IsMongoId } from 'class-validator';

export class StartClaimDTO {
  @IsMongoId({ message: 'locationId không hợp lệ' })
  locationId!: string;
}
```

**`modules/claims/dto/verify-claim-otp.dto.ts`**
```ts
import { IsMongoId, IsString, Length } from 'class-validator';

export class VerifyClaimOtpDTO {
  @IsMongoId({ message: 'locationId không hợp lệ' })
  locationId!: string;

  @IsString()
  @Length(6, 6, { message: 'OTP phải gồm 6 chữ số' })
  otp!: string;
}
```

**`modules/claims/dto/submit-claim.dto.ts`** — validate đúng "3 yếu tố": ép có >=1 ảnh có geo + capturedAt.
```ts
import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsIn, IsISO8601, IsMongoId, IsNumber,
  IsOptional, IsString, Min, ValidateNested,
} from 'class-validator';

class GeoPointDTO {
  @IsIn(['Point']) type!: 'Point';
  // GeoJSON: [lng, lat]
  @IsArray() @IsNumber({}, { each: true }) coordinates!: [number, number];
}

class EvidenceFileDTO {
  @IsString() url!: string;

  @IsIn(['IMAGE', 'VIDEO', 'DOCUMENT'])
  fileType!: 'IMAGE' | 'VIDEO' | 'DOCUMENT';

  // yếu tố (c): bắt buộc geo + thời điểm chụp cho ảnh hiện trường
  @IsOptional() @ValidateNested() @Type(() => GeoPointDTO)
  geo?: GeoPointDTO;

  @IsOptional() @IsNumber() @Min(0)
  accuracyMeters?: number;

  @IsOptional() @IsISO8601()
  capturedAt?: string;

  // yếu tố (b): client khai "mã hệ thống nhìn thấy trong ảnh" để Admin đối chiếu
  @IsOptional()
  metadata?: Record<string, any>;
}

export class SubmitClaimDTO {
  @IsMongoId({ message: 'locationId không hợp lệ' })
  locationId!: string;

  @IsArray() @ArrayMinSize(1, { message: 'Cần ít nhất 1 ảnh hiện trường' })
  @ValidateNested({ each: true }) @Type(() => EvidenceFileDTO)
  evidenceFiles!: EvidenceFileDTO[];

  // BR-15: giấy phép KD TÙY CHỌN (xác minh = kiểm soát vật lý, không phải giấy tờ)
  @IsOptional() @IsString()
  licenseUrl?: string;
}
```

---

### Bước 3 — ClaimService (3 method, trả object `{success,...}`)

**`modules/claims/claim.service.ts`**
```ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Location, LocationDocument } from 'src/common/schemas/location.schema';
import {
  ClaimRequest,
  ClaimRequestDocument,
} from 'src/common/schemas/claim-request.schema';
import {
  RequestAccess,
  RequestAccessDocument,
} from 'src/common/schemas/request-access.schema';
import {
  ClaimVerificationSession,
  ClaimVerificationSessionDocument,
} from 'src/common/schemas/claim-verification-session.schema';
import {
  ClaimRequestStatus,
  ClaimRequestType,
  LocationStatus,
  RequestAccessStatus,
} from 'src/common/schemas/common.enums';
import {
  NOTIFICATION_PORT,
  NotificationPort,
} from 'src/common/contracts/notification.port';
import { SmsService } from 'src/modules/auth/services/sms.service';
import { SubmitClaimDTO } from './dto/submit-claim.dto';

const SESSION_TTL_MIN = 30; // mã/OTP claim sống 30'
const MAX_OTP_ATTEMPTS = 5;

@Injectable()
export class ClaimService {
  private readonly logger = new Logger(ClaimService.name);

  constructor(
    @InjectModel(Location.name) private locationModel: Model<LocationDocument>,
    @InjectModel(ClaimRequest.name)
    private claimModel: Model<ClaimRequestDocument>,
    @InjectModel(RequestAccess.name)
    private requestAccessModel: Model<RequestAccessDocument>,
    @InjectModel(ClaimVerificationSession.name)
    private sessionModel: Model<ClaimVerificationSessionDocument>,
    @Inject(NOTIFICATION_PORT) private notification: NotificationPort,
    private smsService: SmsService,
  ) {}

  // ───────────────────────── BƯỚC 1: start ─────────────────────────
  async start(locationId: string, vendorId: string) {
    try {
      if (!Types.ObjectId.isValid(locationId))
        return { success: false, statusCode: 400, message: 'ID địa điểm không hợp lệ' };

      const location = await this.locationModel.findById(locationId).lean().exec();
      if (!location)
        return { success: false, statusCode: 404, message: 'Không tìm thấy địa điểm' };

      // chỉ claim địa điểm đã công khai
      if (location.status !== LocationStatus.PUBLISHED)
        return { success: false, statusCode: 409, message: 'Chỉ có thể claim địa điểm đã được công khai' };

      // I5/UC25: đã có chủ -> KHÔNG cho claim, gợi ý báo cáo
      if (location.ownerId)
        return {
          success: false, statusCode: 409,
          message: 'Địa điểm này đã có chủ sở hữu. Nếu bạn cho rằng chủ sở hữu sai, hãy gửi báo cáo (report).',
        };

      // I6/BR-61: 1 PENDING slot — check CẢ claim lẫn request-access
      const blocked = await this.hasPendingSlot(locationId);
      if (blocked)
        return {
          success: false, statusCode: 409,
          message: 'Địa điểm này đang có một yêu cầu (claim hoặc xin quyền) đang chờ xử lý.',
        };

      // sinh OTP + siteCode
      const siteCode = this.generateSiteCode();
      const phone = this.resolveListingPhone(location); // RULE-AMBIGUOUS: nguồn SĐT listing — xem §9
      const otpRequired = !!phone;
      let otpHash: string | null = null;
      if (otpRequired) {
        const otp = this.generateOtp();
        otpHash = await bcrypt.hash(otp, 10);
        await this.smsService.sendOtp(phone as string, otp); // OTP về SĐT LISTING
      }

      const expiresAt = new Date(Date.now() + SESSION_TTL_MIN * 60 * 1000);
      // upsert theo (vendor, location): bấm start lại -> đè, tránh duplicate-key
      await this.sessionModel.findOneAndUpdate(
        { vendorId: new Types.ObjectId(vendorId), locationId: new Types.ObjectId(locationId) },
        {
          vendorId: new Types.ObjectId(vendorId),
          locationId: new Types.ObjectId(locationId),
          siteCode, otp_hash: otpHash, otpRequired, otpVerified: false,
          attempts: 0, expires_at: expiresAt,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      return {
        success: true,
        otpRequired,
        // Trả siteCode 1 lần để vendor mang ra hiện trường đặt cạnh biển hiệu rồi chụp ảnh
        siteCode,
        message: otpRequired
          ? `Đã gửi OTP tới số điện thoại của địa điểm. Hãy đặt mã "${siteCode}" tại biển hiệu và chụp ảnh có định vị.`
          : `Địa điểm chưa có số điện thoại nên bỏ qua OTP. Hãy đặt mã "${siteCode}" tại biển hiệu và chụp ảnh có định vị (sẽ được admin kiểm tra kỹ hơn).`,
      };
    } catch (error) {
      this.logger.error('start claim error', error as Error);
      return { success: false, statusCode: 500, message: 'Lỗi khi bắt đầu yêu cầu claim' };
    }
  }

  // ───────────────────────── BƯỚC 2: verify-otp ─────────────────────────
  async verifyOtp(locationId: string, vendorId: string, otp: string) {
    try {
      const session = await this.sessionModel.findOne({
        vendorId: new Types.ObjectId(vendorId),
        locationId: new Types.ObjectId(locationId),
      });
      if (!session)
        return { success: false, statusCode: 410, message: 'Phiên xác minh không tồn tại hoặc đã hết hạn, hãy bắt đầu lại' };
      if (!session.otpRequired)
        return { success: true, message: 'Địa điểm không yêu cầu OTP, bạn có thể nộp bằng chứng luôn' };
      if (session.attempts >= MAX_OTP_ATTEMPTS)
        return { success: false, statusCode: 429, message: 'Bạn đã nhập sai quá nhiều lần, hãy bắt đầu lại' };

      const ok = session.otp_hash ? await bcrypt.compare(otp, session.otp_hash) : false;
      if (!ok) {
        session.attempts += 1;
        await session.save();
        const remaining = MAX_OTP_ATTEMPTS - session.attempts;
        return { success: false, statusCode: 400, message: `Mã OTP không đúng, còn ${remaining} lần thử` };
      }

      session.otpVerified = true;
      await session.save();
      return { success: true, message: 'Xác minh OTP thành công' };
    } catch (error) {
      this.logger.error('verifyOtp error', error as Error);
      return { success: false, statusCode: 500, message: 'Lỗi khi xác minh OTP' };
    }
  }

  // ───────────────────────── BƯỚC 3: submit ─────────────────────────
  async submit(dto: SubmitClaimDTO, vendorId: string) {
    try {
      const { locationId } = dto;
      const location = await this.locationModel.findById(locationId).lean().exec();
      if (!location)
        return { success: false, statusCode: 404, message: 'Không tìm thấy địa điểm' };
      if (location.ownerId)
        return { success: false, statusCode: 409, message: 'Địa điểm này đã có chủ sở hữu.' };

      const session = await this.sessionModel.findOne({
        vendorId: new Types.ObjectId(vendorId),
        locationId: new Types.ObjectId(locationId),
      });
      if (!session)
        return { success: false, statusCode: 410, message: 'Phiên xác minh đã hết hạn, hãy bắt đầu lại từ bước OTP' };

      // YẾU TỐ (a): nếu cần OTP thì phải đã verify
      if (session.otpRequired && !session.otpVerified)
        return { success: false, statusCode: 400, message: 'Bạn cần xác minh OTP trước khi nộp bằng chứng' };

      // YẾU TỐ (c): >=1 ảnh có geo + capturedAt
      const hasGeoPhoto = dto.evidenceFiles.some(
        (f) => f.fileType === 'IMAGE' && f.geo?.coordinates?.length === 2 && !!f.capturedAt,
      );
      if (!hasGeoPhoto)
        return {
          success: false, statusCode: 400,
          message: 'Cần ít nhất 1 ảnh hiện trường có định vị (geo) và thời điểm chụp (capturedAt).',
        };

      // YẾU TỐ (b): mã hệ thống phải xuất hiện trong ảnh (client khai ở metadata.siteCode)
      // RULE-AMBIGUOUS: chọn cách CHẶT HƠN — bắt buộc client khai đúng siteCode đã cấp.
      const codeSeen = dto.evidenceFiles.some(
        (f) => String(f.metadata?.siteCode ?? '') === session.siteCode,
      );
      if (!codeSeen)
        return {
          success: false, statusCode: 400,
          message: 'Ảnh phải cho thấy mã hệ thống đã cấp. Hãy đặt đúng mã tại biển hiệu rồi chụp lại.',
        };

      // gắn nhãn để Admin (F24) soi kỹ khi listing không có phone
      const evidenceFiles = dto.evidenceFiles.map((f) => ({
        ...f,
        capturedAt: f.capturedAt ? new Date(f.capturedAt) : undefined,
        metadata: {
          ...(f.metadata ?? {}),
          ...(session.otpRequired ? {} : { adminScrutiny: 'NO_PHONE_HIGHER_SCRUTINY' }),
        },
      }));

      // TẠO ClaimRequest — KHÔNG set location.ownerId (I5). Owner do WDP-28/F24 gán.
      let claim: ClaimRequestDocument;
      try {
        claim = await this.claimModel.create({
          vendorId: new Types.ObjectId(vendorId),
          locationId: new Types.ObjectId(locationId),
          type: ClaimRequestType.CLAIM_EXISTING_LOCATION,
          evidenceFiles,
          licenseUrl: dto.licenseUrl,
          otpVerified: session.otpVerified,
          otpVerifiedAt: session.otpVerified ? new Date() : undefined,
          status: ClaimRequestStatus.PENDING,
        });
      } catch (e: any) {
        // unique partial index (locationId, status=PENDING) -> race-condition duplicate
        if (e?.code === 11000)
          return { success: false, statusCode: 409, message: 'Địa điểm này vừa có một yêu cầu đang chờ xử lý.' };
        throw e;
      }

      // dọn session sau khi đã tạo claim
      await this.sessionModel.deleteOne({ _id: session._id });

      // GỌI M3 — báo vendor đã nhận claim (KHÔNG gán owner, KHÔNG cộng trust ở đây)
      await this.notification.notify({
        userId: vendorId,
        type: 'CLAIM_SUBMITTED',
        title: 'Đã nhận yêu cầu xác nhận sở hữu',
        body: `Yêu cầu claim cho "${location.name}" đã được gửi và đang chờ admin duyệt.`,
        refCollection: 'claim_requests',
        refId: String(claim._id),
      });

      return {
        success: true,
        message: 'Đã gửi yêu cầu claim, vui lòng chờ admin xét duyệt',
        claim: { id: claim._id, status: claim.status },
      };
    } catch (error) {
      this.logger.error('submit claim error', error as Error);
      return { success: false, statusCode: 500, message: 'Lỗi khi nộp yêu cầu claim' };
    }
  }

  // ───────────────────────── helpers ─────────────────────────
  /** I6/BR-61: slot PENDING bị chiếm bởi claim HOẶC request-access. */
  private async hasPendingSlot(locationId: string): Promise<boolean> {
    const locId = new Types.ObjectId(locationId);
    const [claim, ra] = await Promise.all([
      this.claimModel.exists({ locationId: locId, status: ClaimRequestStatus.PENDING }),
      this.requestAccessModel.exists({ locationId: locId, status: RequestAccessStatus.PENDING }),
    ]);
    return !!claim || !!ra;
  }

  /** Lấy số trực tiếp từ Location; thiếu giá trị thì đi nhánh no-phone. */
  private resolveListingPhone(location: LocationDocument): string | undefined {
    return location.phone?.trim() || undefined;
  }

  private generateOtp(): string {
    return randomInt(0, 1000000).toString().padStart(6, '0');
  }

  /** Mã đặt tại hiện trường: dễ đọc, tránh nhầm 0/O, 1/I. */
  private generateSiteCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += alphabet[randomInt(0, alphabet.length)];
    return `CLG-${s}`;
  }
}
```

---

### Bước 4 — Controller (map object → HttpException)

**`modules/claims/claim.controller.ts`**
```ts
import {
  BadRequestException, Body, ConflictException, Controller, ForbiddenException,
  HttpException, HttpStatus, InternalServerErrorException, NotFoundException,
  Post, Request, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClaimService } from './claim.service';
import { StartClaimDTO } from './dto/start-claim.dto';
import { VerifyClaimOtpDTO } from './dto/verify-claim-otp.dto';
import { SubmitClaimDTO } from './dto/submit-claim.dto';

@ApiTags('claims')
@ApiBearerAuth()
@Controller('claims')
@UseGuards(AuthGuard('jwt-at')) // I3: phải đăng nhập mới claim được
export class ClaimController {
  constructor(private readonly service: ClaimService) {}

  @Post('start')
  async start(@Body() body: StartClaimDTO, @Request() req: any) {
    return this.handle(await this.service.start(body.locationId, req.user.userId));
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: VerifyClaimOtpDTO, @Request() req: any) {
    return this.handle(
      await this.service.verifyOtp(body.locationId, req.user.userId, body.otp),
    );
  }

  @Post('submit')
  async submit(@Body() body: SubmitClaimDTO, @Request() req: any) {
    return this.handle(await this.service.submit(body, req.user.userId));
  }

  private handle(r: any) {
    if (!r.success) {
      switch (r.statusCode) {
        case 400: throw new BadRequestException(r.message);
        case 403: throw new ForbiddenException(r.message);
        case 404: throw new NotFoundException(r.message);
        case 409: throw new ConflictException(r.message);
        case 410: throw new HttpException(r.message, HttpStatus.GONE);
        case 429: throw new HttpException(r.message, HttpStatus.TOO_MANY_REQUESTS);
        default: throw new InternalServerErrorException(r.message);
      }
    }
    return r;
  }
}
```
> Lưu ý: `Gone` không phải export của `@nestjs/common` — dùng `HttpException(..., HttpStatus.GONE)` như trên (đã bỏ import `Gone` nếu IDE báo). Tương tự pattern `TOO_MANY_REQUESTS` trong [auth.controller.ts](apps/api/src/modules/auth/auth.controller.ts).

---

### Bước 5 — Module + nối AppModule

**`modules/claims/claim.module.ts`**
```ts
import { Module } from '@nestjs/common';
import { SchemaModule } from 'src/common/schemas/schema.module';
import {
  NOTIFICATION_PORT,
  NotificationStub,
} from 'src/common/contracts/notification.port';
import { AuthModule } from 'src/modules/auth/auth.module'; // để dùng SmsService (xem Bước 0)
import { ClaimController } from './claim.controller';
import { ClaimService } from './claim.service';

@Module({
  imports: [SchemaModule, AuthModule],
  controllers: [ClaimController],
  providers: [
    ClaimService,
    // STUB tạm — TODO: khi WDP-7 (M3) xong, đổi useClass sang service M3 thật
    { provide: NOTIFICATION_PORT, useClass: NotificationStub },
  ],
})
export class ClaimModule {}
```
> **Không** thêm `AtStrategy` vào `providers` — `AuthModule` (đã nạp trong AppModule) đăng ký chiến lược passport `'jwt-at'` toàn cục rồi, `@UseGuards(AuthGuard('jwt-at'))` chạy được ngay.
> Điều kiện: `AuthModule` phải `exports: [SmsService]` (Bước 0). Nếu bạn tách `SmsModule` riêng thì `imports: [SmsModule]` thay cho `AuthModule`.

**Sửa `app.module.ts`** — thêm `ClaimModule` vào `imports`:
```ts
import { ClaimModule } from './modules/claims/claim.module';
// ...
imports: [ /* ... */ AuthModule, SchemaModule, LocationModule, ClaimModule ],
```

---

## 6. Dữ liệu mẫu để kiểm thử (không cần ai khác)

Cần: **1 user role `VENDOR`** (login lấy token) + **1 location no-owner PUBLISHED**. Dùng **MongoDB Compass / mongosh** insert vào `locations` (field bắt buộc theo `location.schema.ts`):
```js
db.locations.insertOne({
  submittedBy: ObjectId('<userId bất kỳ>'),
  // KHÔNG set ownerId  -> no-owner (điều kiện để claim)
  name: 'Quán Cà Phê Test Claim',
  description: 'Địa điểm no-owner để test luồng claim F23',
  address: '123 Test Street, Hoa Lac',
  geo: { type: 'Point', coordinates: [105.52, 21.01] },
  source: 'CUSTOMER',
  categoryId: ObjectId('<categoryId thật>'),
  status: 'PUBLISHED',          // bắt buộc PUBLISHED mới claim được
  // phone: '+84901234567',     // BỎ field này -> test nhánh no-phone; THÊM -> test nhánh OTP
  isDuplicate: false, isSuspectedDuplicate: false, viewCount: 0,
});
```
> Test nhánh **đã có chủ** (phải bị chặn): set thêm `ownerId: ObjectId('<userId khác>')`.
> Test nhánh **slot bị chiếm**: insert sẵn 1 doc `claim_requests` `{ locationId, status:'PENDING', type:'CLAIM_EXISTING_LOCATION', vendorId, evidenceFiles:[] }`.
> OTP ở dev mode **in ra console** (xem log `[DEV MODE] OTP cho số ...`) — lấy mã từ đó. `siteCode` lấy từ **response của `POST /api/claims/start`**.

---

## 7. Chạy và kiểm thử

```bash
# từ thư mục gốc repo (repo đã chuyển pnpm → npm)
npm run start:dev --workspace=api
# hoặc: npm run dev:api
```
Swagger `http://localhost:3000/api/docs` → `POST /api/auth/login` (VENDOR) → Authorize bằng token.

**Kịch bản happy-path (có phone):**
| Bước | API | Kỳ vọng |
|---|---|---|
| 1 | `POST /api/claims/start` `{locationId}` | `200 {otpRequired:true, siteCode:"CLG-..."}`; console in OTP |
| 2 | `POST /api/claims/verify-otp` `{locationId, otp}` | `200` "Xác minh OTP thành công" |
| 3 | `POST /api/claims/submit` `{locationId, evidenceFiles:[{url, fileType:'IMAGE', geo:{type:'Point',coordinates:[105.52,21.01]}, capturedAt:'2026-06-30T03:00:00Z', metadata:{siteCode:'CLG-...'}}], licenseUrl?}` | `200`; DB `claim_requests` có doc `status=PENDING`, `location.ownerId` **vẫn null** |

**Các nhánh phải chặn:**
| Tình huống | Kỳ vọng |
|---|---|
| `submit` khi chưa verify-otp (listing có phone) | `400` "cần xác minh OTP trước" |
| `submit` mà không có ảnh geo+capturedAt | `400` "Cần ít nhất 1 ảnh hiện trường có định vị..." |
| `submit` mà `metadata.siteCode` sai/thiếu | `400` "Ảnh phải cho thấy mã hệ thống đã cấp" |
| `start`/`submit` location đã có `ownerId` | `409` + gợi ý report |
| `start`/`submit` khi đã có claim **hoặc** request-access PENDING | `409` (I6/BR-61) |
| Tạo claim thứ 2 song song (race) | `409` (catch 11000 từ unique index) |
| `verify-otp` sai 6 lần | `429` "sai quá nhiều lần" |
| `submit` sau khi session hết hạn (TTL) | `410` "phiên hết hạn" |
| Không token | `401` |
| Listing **không có phone** | `start` trả `otpRequired:false`; bỏ qua bước 2; `submit` vẫn yêu cầu proof; evidence có `metadata.adminScrutiny` |

**Kiểm DB sau happy-path:**
- `claim_requests`: 1 doc `{ type:'CLAIM_EXISTING_LOCATION', status:'PENDING', otpVerified:true, evidenceFiles:[...], licenseUrl? }`.
- `locations`: `ownerId` **vẫn chưa có** (đúng I5).
- `notifications`: 1 doc `type:'CLAIM_SUBMITTED'` (stub M3).
- `claim_verification_sessions`: doc đã bị **xóa** sau submit.

---

## 8. Checklist nghiệm thu (map DoD + invariants)

- [ ] **DoD-1:** Claim chỉ submit được khi **đủ 3 yếu tố** — (a) OTP verified *(hoặc nhánh no-phone)*, (b) `siteCode` khớp trong ảnh, (c) ảnh có `geo` + `capturedAt`.
- [ ] **DoD-2:** Duplicate **PENDING slot** bị chặn — kiểm **cả** `claim_requests` lẫn `request_accesses` (I6/BR-61) + dựa unique partial index (catch 11000).
- [ ] **DoD-3 (I5):** **KHÔNG** set `location.ownerId` ở bất kỳ method nào của ticket này.
- [ ] **DoD-4:** Gọi **M3 `notify`** báo vendor đã nhận claim (qua `NOTIFICATION_PORT`, không tự gửi).
- [ ] **BR-14:** OTP gửi tới **SĐT của listing** (không phải SĐT user); reuse `SmsService.sendOtp`.
- [ ] **BR-15:** `licenseUrl` **optional** — submit không có license vẫn pass.
- [ ] **Nhánh no-phone:** bỏ OTP, vẫn bắt buộc proof, gắn `adminScrutiny` cho F24 soi kỹ.
- [ ] **Đã có chủ:** `start`/`submit` → 409 + gợi ý report (không cho claim đè).
- [ ] **I3:** mọi endpoint sau `AuthGuard('jwt-at')`; no-token → 401.
- [ ] **I8:** ticket này **không** đụng trust score (trust cộng ở F24).
- [ ] Có `// RULE-AMBIGUOUS` ở: (1) chỗ lưu siteCode (schema gap §3.4), (2) nguồn SĐT listing (§3.5), và `// TODO: depends on F03/WDP-7` ở seam M3.
- [ ] Session tạm tự hết hạn (TTL index) + bị xóa sau submit.

---

## 9. Việc cần chốt với team (dependencies / ambiguities)

1. **M3 / WDP-7 (Đăng, `Đang làm`):** notification đang dùng **stub** (`NotificationStub`, port từ guide WDP-19). Khi M3 xong → đổi `useClass` trong `claim.module.ts`. Chốt `notify(...)` eventType `CLAIM_SUBMITTED` + payload.
2. **Cross-ref WDP-28 / F24 (Admin xét claim — cũng Dương):** ticket này **feed** F24. F24 sẽ: đối chiếu `otpVerified` + `evidenceFiles[].metadata.siteCode` (so với mã đã cấp) + geo; **approve → mới gán `location.ownerId` + badge Verified + M3 + trust** (BR-29/BR-45); **reject → tạo claim mới, không ghi đè** (BR-46). → **Chốt với F24:** Admin lấy đâu ra mã gốc để đối chiếu nếu session đã bị TTL xóa? (đề xuất: lưu **hash của siteCode** vào `evidenceFiles[].metadata` hoặc một field read-only trên `ClaimRequest` lúc submit, để F24 verify mà không cần session). **Đây là điểm phải thống nhất trước khi F24 review.**
3. **SCHEMA GAP — siteCode (§3.4):** đã chọn collection tạm TTL (chặt hơn). Nếu team muốn audit lâu dài, cân nhắc thêm field `issuedCodeHash?` vào `ClaimRequest` (phải khai ở `common.enums`/schema chung, **không** tự thêm lẻ).
4. **Dữ liệu SĐT của listing (§3.5):** nguồn đã chốt là `Location.phone`. Cần seed cả nhánh có phone và không có phone để kiểm OTP/fallback; không lấy ngầm từ vendor/owner profile.
5. **SmsService dùng chung (§5 Bước 0):** mình cần `AuthModule` export `SmsService` (hoặc tách `SmsModule`). **Báo Đăng/Minh** (owner auth) để không đụng nhau. Nội dung SMS hiện hardcode "đăng ký vendor" → nhờ M3 chuẩn hóa template theo eventType.
6. **request-access (WDP-30/F26 — cũng Dương):** I6 nói slot dùng chung. Hiện mình query `request_accesses` để check. Khi F26 hoàn thiện, đảm bảo F26 **cũng** check ngược lại slot của claim (đối xứng) — chốt 1 helper `hasPendingSlot()` dùng chung.
7. **Geo trong/ngoài bán kính Hòa Lạc (I9/M5):** ảnh proof geotag nên nằm trong bán kính. Tùy mức độ, có thể thêm validate khoảng cách proof↔location ở `submit` (đề xuất Phase sau / để F24 soi). Hiện để Admin kiểm thủ công.

---

## 10. Thứ tự code (commit nhỏ)

1. `claim-verification-session.schema.ts` + đăng ký vào `schema.module.ts` → `start:dev` chạy clean.
2. Đảm bảo `notification.port.ts` tồn tại (tạo nếu chưa — từ §2) + export `SmsService` từ `AuthModule` (Bước 0).
3. DTO (start / verify-otp / submit).
4. `ClaimService.start` + controller `POST start` → test sinh OTP (console) + siteCode + chặn (đã-có-chủ / slot bận).
5. `verifyOtp` + `POST verify-otp` → test OTP đúng/sai/hết hạn.
6. `submit` + `POST submit` → test đủ-3-yếu-tố + tạo `ClaimRequest PENDING` + **assert `ownerId` vẫn null** (I5).
7. Gắn `notify` (M3 stub) vào `submit`; dọn session.
8. Seed location no-owner + chạy full checklist §8 (gồm nhánh no-phone, race 11000).
9. PR → review → chuyển WDP-27 sang Done; cross-ref WDP-28/F24.

```bash
git checkout -b WDP-27-claim-dia-diem
# commit nhỏ theo §10
git push -u origin WDP-27-claim-dia-diem
```
> KHÔNG commit `/guideline` (đã gitignore) và record seed tạm. KHÔNG sửa code app khi đang viết guide.
