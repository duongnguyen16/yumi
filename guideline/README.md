# Guideline — Hướng dẫn tự triển khai các task của Dương

> Thư mục cá nhân, **đã gitignore** (`/guideline/`). Không commit.
> Mỗi file = 1 ticket Jira. **Tự chứa**: đọc guide là code được, **không cần mở Jira (WDP-xx) hay file nghiệp vụ (SPECS / `WDP301 - SRS.pdf`)**. Mọi thuật ngữ nghiệp vụ cần thiết đã giải nghĩa ngay trong guide.

## Danh sách guide

| Ticket | Feature | Sprint · Ưu tiên | File |
|---|---|---|---|
| [WDP-19](https://fptp.atlassian.net/browse/WDP-19) | F15 Admin duyệt địa điểm | S2 · Cao | [WDP-19-admin-duyet-dia-diem.md](WDP-19-admin-duyet-dia-diem.md) |
| [WDP-27](https://fptp.atlassian.net/browse/WDP-27) | F23 Claim địa điểm + xác minh | S3 · Cốt lõi | [WDP-27-claim-dia-diem.md](WDP-27-claim-dia-diem.md) |
| [WDP-28](https://fptp.atlassian.net/browse/WDP-28) | F24 Admin xét claim | S3 · Cao | [WDP-28-admin-xet-claim.md](WDP-28-admin-xet-claim.md) |
| [WDP-30](https://fptp.atlassian.net/browse/WDP-30) | F26 Request-access + chuyển quyền + hold | S3 · Cốt lõi | [WDP-30-request-access-transfer-hold.md](WDP-30-request-access-transfer-hold.md) |
| [WDP-31](https://fptp.atlassian.net/browse/WDP-31) | F27 Phân xử tranh chấp | S4 · Cốt lõi | [WDP-31-dispute.md](WDP-31-dispute.md) |
| [WDP-32](https://fptp.atlassian.net/browse/WDP-32) | F28 Kháng cáo | S4 · Cao | [WDP-32-appeal.md](WDP-32-appeal.md) |

## Thứ tự code đề xuất
`F15 (WDP-19) → F23 (WDP-27) → F24 (WDP-28) → F26 (WDP-30) → F27 (WDP-31) → F28 (WDP-32)`
Đây cũng là thứ tự phụ thuộc: claim tạo ra cái để duyệt → duyệt gán owner → request-access/transfer cần có owner → dispute phân xử → appeal kháng các quyết định trên (build cuối).

---

## File index theo task

### WDP-19 — Admin duyệt địa điểm

API:

* `modules/admin/admin-location.controller.ts`
* `modules/admin/admin-location.service.ts`
* `modules/admin/admin-location.service.spec.ts`
* `modules/admin/admin.module.ts`
* `modules/admin/dto/list-pending-requests.dto.ts`
* `modules/admin/dto/reject-request.dto.ts`
* `common/contracts/notification.port.ts`
* `common/schemas/location-request.ts`

WEB:

* `apps/web/src/app/admin/(protected)/location-requests/page.tsx`
* `apps/web/src/app/admin/(protected)/location-requests/components/LocationRequestDetailDrawer.tsx`

---

### WDP-27 — Claim địa điểm

API:

* `modules/claims/claim.controller.ts`
* `modules/claims/claim.service.ts`
* `modules/claims/claim.module.ts`
* `modules/claims/dto/start-claim.dto.ts`
* `modules/claims/dto/verify-claim-otp.dto.ts`
* `modules/claims/dto/submit-claim.dto.ts`
* `common/schemas/claim-verification-session.schema.ts`

MOBILE:

* `apps/mobile/src/app/claim/[locationId].tsx`

---

### WDP-28 — Admin xét claim

API:

* `modules/admin-claims/admin-claim.controller.ts`
* `modules/admin-claims/admin-claim.service.ts`
* `modules/admin-claims/admin-claim.module.ts`
* `modules/admin-claims/dto/list-pending-claims.dto.ts`
* `modules/admin-claims/dto/reject-claim.dto.ts`
* `modules/admin-claims/dto/request-evidence.dto.ts`

WEB:

* `apps/web/src/app/admin/(protected)/claims/page.tsx`

---

### WDP-30 — Request-access, chuyển quyền và hold

API:

* `modules/request-access/request-access.controller.ts`
* `modules/request-access/request-access.service.ts`
* `modules/request-access/request-access.module.ts`
* `modules/request-access/request-access.service.spec.ts`
* `common/ownership/hold.util.ts`
* `common/ownership/hold.util.spec.ts`

MOBILE:

* `apps/mobile/src/service/requestAccessService.ts`
* `apps/mobile/src/app/request-access/new/[locationId].tsx`
* `apps/mobile/src/app/request-access/index.tsx`
* `apps/mobile/src/app/request-access/[id].tsx`

---

### WDP-31 — Phân xử tranh chấp sở hữu

API:

* `modules/disputes/dispute.controller.ts`
* `modules/disputes/dispute.service.ts`
* `modules/disputes/dispute.module.ts`
* `modules/admin-disputes/admin-dispute.controller.ts`
* `modules/admin-disputes/admin-dispute.service.ts`

WEB:

* `apps/web/src/app/admin/(protected)/disputes/page.tsx`

MOBILE:

* `apps/mobile/src/app/disputes/[id].tsx`

---

### WDP-32 — Kháng cáo

API:

* `modules/appeals/appeal.controller.ts`
* `modules/appeals/appeal.service.ts`
* `modules/appeals/appeal.module.ts`
* `modules/admin-appeals/admin-appeal.controller.ts`
* `modules/admin-appeals/admin-appeal.service.ts`

WEB:

* `apps/web/src/app/admin/(protected)/appeals/page.tsx`

MOBILE:

* `apps/mobile/src/app/appeals/new.tsx`
* `apps/mobile/src/app/request-access/[id].tsx` (nút kháng cáo)

---

## 📖 Thuật ngữ & bối cảnh — đọc 1 lần (thay cho SPECS/WDP)

Hệ thống là **Campus Local Guide**: bản đồ chia sẻ địa điểm quanh trường; customer đóng góp địa điểm/review, vendor "claim" (nhận sở hữu) địa điểm của mình, admin kiểm duyệt và phân xử.

**Sản phẩm chia thành 5 module (M1–M5), mỗi bạn phụ trách 1 mảng:**

| Ký hiệu | Là gì | Ai làm | Bạn (Dương) tương tác thế nào |
|---|---|---|---|
| **M1** | Địa điểm, review, kiểm duyệt nội dung | Long / Minh / **bạn** | WDP-19/27/28/30/31/32 nằm ở đây |
| **M2 = Trust Engine** | Cộng/trừ "điểm uy tín" (trustScore) + xếp hạng (trustLevel) cho user | **Trung** — [WDP-33](https://fptp.atlassian.net/browse/WDP-33) | ✅ **ĐÃ XONG** — bạn **gọi** `TrustEngineService.recordEvent(...)`, không tự tính điểm |
| **M3 = Notification** | Gửi thông báo (in-app / email / SMS) cho user | **Đăng** — [WDP-7](https://fptp.atlassian.net/browse/WDP-7) | ⏳ **CHƯA XONG** — tạm dùng **stub** ghi thông báo in-app; gắn `// TODO: depends on WDP-7` |
| **M4** | Bản đồ / tìm kiếm (Goong) | Long | Không đụng trong 6 ticket này |
| **M5** | Quản trị chung (category, audit dashboard…) | Trung | Category ✅ đã xong; audit dashboard (WDP-39) chưa |

**Cách đọc các "mã luật" trong guide** (nếu thấy trong guide là đã được giải nghĩa tại chỗ, không cần tra):
- **Fxx** = mã tính năng (feature). VD F15 = "Admin duyệt địa điểm".
- **BR-xx** = *Business Rule* — 1 luật nghiệp vụ. VD BR-44 = "cách cộng/trừ điểm trust".
- **Ix** = *Invariant* — quy tắc **bất biến toàn hệ thống, không được phá**:
  - **I4** = mọi hành động của Admin phải **ghi audit log**.
  - **I8** = mọi thay đổi điểm trust phải **đi qua M2** (`recordEvent`), **cấm** viết tay `user.trustScore += ...`.
- **§x / SPECS §x** = mục trong tài liệu nghiệp vụ gốc. Đã trích phần cần thiết vào guide → **không cần mở file gốc**.

---

## Trạng thái phụ thuộc (đối chiếu với code thực tế — cập nhật đêm nay)

Cái gì **đã có sẵn trong repo** để bạn dùng lại, cái gì phải tự làm:

| Thành phần | File thật trong repo | Trạng thái | Bạn làm gì |
|---|---|---|---|
| **Trust engine (M2)** | `apps/api/src/modules/trust-engine/` (`TrustEngineModule`, `TrustEngineService`) | ✅ Xong | `imports: [TrustEngineModule]`, inject `TrustEngineService`, gọi `recordEvent({ userId, type, reason?, refCollection?, refId? })`. **Không** cần stub/port trust nữa. |
| **Guard phân quyền Admin** | `apps/api/src/common/guard/admin.guard.ts` (`AdminGuard`) | ✅ Có sẵn | Tái dùng: `@UseGuards(AuthGuard('jwt-at'), AdminGuard)`. **KHÔNG tự dựng lại RolesGuard** (các ticket của bạn đều chỉ dành cho ADMIN). |
| **Category** | `apps/api/src/modules/admin-category/` | ✅ Xong | Đây cũng là **mẫu module admin mới nhất** trong repo — copy pattern của nó. |
| **Notification (M3)** | Chỉ có `common/schemas/notification.schema.ts`, **chưa có module** | ⏳ Chưa | Dùng `NotificationStub` (tự ghi 1 doc vào `notifications`). Chờ WDP-7 (Đăng). |
| **Audit log util (WDP-39)** | Chỉ có `common/schemas/audit-log.schema.ts`, chưa có util chung | ⏳ Chưa | Ghi thẳng vào collection `audit_logs` (helper nhỏ). |
| **Data contract (schema)** | `apps/api/src/common/schemas/*` | ✅ Khóa (WDP-5) | Field bạn cần đọc/ghi đã có sẵn. Enum lấy từ `common.enums.ts`. |

> ⚠️ **`TrustEventType` đã đổi so với bản nháp cũ.** Enum thật hiện chỉ có: `LOCATION_APPROVED`, `CORRECT_REPORT`, `LIVE_REVIEW`, `VIOLATING_CONTENT_REMOVED`, `FALSE_REPORT`, `ADMIN_ADJUSTMENT`.
> **Không tồn tại** `CONTENT_REJECTED` và `VALID_REPORT` — nếu bạn copy code cũ dùng 2 tên này sẽ **lỗi compile**. Cách map lại xem trong từng guide.

**Cách gọi Trust engine (M2) chuẩn — dùng chung cho mọi guide:**
```ts
// module của bạn
imports: [SchemaModule, TrustEngineModule],

// service của bạn
constructor(private readonly trust: TrustEngineService) {}

// khi có sự kiện:
await this.trust.recordEvent({
  userId: String(location.submittedBy),
  type: TrustEventType.LOCATION_APPROVED, // +15, engine tự tính điểm & xếp hạng
  reason: 'Địa điểm được duyệt',
  refCollection: 'locations',
  refId: String(location._id),            // (userId+type+ref) trùng → engine tự bỏ qua, không cộng 2 lần
});
```
Bảng điểm engine tự áp (bạn **không** truyền số): `LOCATION_APPROVED +15`, `CORRECT_REPORT +5`, `LIVE_REVIEW +2`, `VIOLATING_CONTENT_REMOVED −10`, `FALSE_REPORT −10`. Xếp hạng tự tính: `<0 → RESTRICTED`; `≥30 điểm **và** tài khoản ≥14 ngày → TRUSTED`; còn lại `NEW`; bị ban → `BANNED`.

---

## Quy ước chung của cả 6 guide (đọc 1 lần)

- **Build 1 lần, tái sử dụng:** Trust dùng `TrustEngineModule` (Trung), phân quyền dùng `AdminGuard` (đã có). Notification tạm stub cho đến khi WDP-7 xong.
- **I8 (không thương lượng):** đổi điểm trust chỉ qua `recordEvent` của M2. Viết `user.trustScore += 15` trong service của bạn = **fail review**.
- **✅ Từ chối KHÔNG trừ trust (đã chốt):** hành động reject địa điểm (WDP-19) / claim (WDP-28) **không** sinh TrustEvent. Trust chỉ **cộng** khi duyệt (`LOCATION_APPROVED` +15). Nội dung vi phạm / gian lận xử bằng luồng report + ban (F31), không trừ điểm ở bước reject.
- **✅ Model duyệt địa điểm = B (đã chốt):** duyệt trên **`LocationRequest`** (collection `location_requests`, xem `location-request.ts`), KHÔNG sửa thẳng `Location.status`. Khớp **sơ đồ ERD** (`Location_Request`) và **đồng bộ** với `ClaimRequest`/`RequestAccess` (đều là "request entity"). Xem WDP-19.
- **Audit (I4/BR-43):** ghi thẳng `audit_logs` ở mỗi action Admin (`{ actorId, action, targetCollection, targetId, reason?, diff? }`); sau này WDP-39 (Trung) gộp về util chung.
- Service trả object `{ success, statusCode?, message?, ...}`; controller map sang `HttpException`; route prefix `/api`; enum lấy từ `common.enums.ts` (không hardcode string).
- Message tiếng Việt có dấu.

---

## ⚠️ Việc PHẢI chốt với team trước khi demo (đã cập nhật theo code đêm nay)

### ✅ Đã tự giải quyết nhờ code đêm nay (không còn là "gap")
- **Điểm trust & ngưỡng level** — Trust engine (WDP-33) đã khóa số: approve `+15`, `−10` cho nội dung vi phạm / báo cáo sai, `TRUSTED` = điểm ≥30 **và** tài khoản ≥14 ngày. Không cần chốt lại con số, chỉ cần **gọi đúng `TrustEventType`**.
- **"Hold" quyền sở hữu** — schema `Location` **đã có field `holdExpiresAt`** → làm hold bằng field này (không cần collection `OwnershipHold` riêng). Chỉ cần chốt *ngữ nghĩa* (7 ngày cho nhánh nào).
- **"Ai là admin quyết định"** — embedded `AdminDecision` (`{ decidedBy, reason, decidedAt }`) đã có sẵn và được `claim_requests` / `disputes` dùng → luật "Admin **khác** mới được xét" (BR-65) đọc `decidedBy` là ra. (Riêng `Location`/`Review` không có field này → phải truy `audit_logs`.)

### Còn phải chốt (lỗ hổng schema / luật mơ hồ)
0. **`LocationRequest` chưa được nối (Model B):** schema `location-request.ts` đã có nhưng **chưa đăng ký trong `SchemaModule`** và chưa ai dùng. Cần: (a) đăng ký vào `SchemaModule`; (b) chốt **hợp đồng `submittedDataSnapshot`** (field nào) + Location khởi tạo ở status nào — với **Long (F13 gửi)** / **Minh (F32 sửa)**. *(WDP-19)*
1. **`Location` thiếu field `phone`** → F23 "OTP về SĐT của listing" chưa có nguồn số. Cần thêm field cho `Location`, hoặc chốt dùng `user.phone` (đã có) của người claim. *(WDP-27)*
2. **Không có field cho "mã 1 lần (siteCode)" hệ thống cấp** → đề xuất collection TTL `ClaimVerificationSession` (theo mẫu `pending-vendor-registration`) + lưu **hash `siteCode`** để F24 đối chiếu được. *(WDP-27 → WDP-28)*
3. **1-PENDING-slot (I6/BR-61) phải enforce ở SERVICE.** `claim_requests` **đã có** unique index chặn 2 claim PENDING trên cùng location; nhưng Mongo **không** chặn chéo `claim_requests` ↔ `request_accesses`. Trước khi insert phải **đếm PENDING ở cả 2 collection**. *(WDP-30, ảnh hưởng WDP-27)*
4. **`ClaimRequestStatus` chưa có trạng thái "cần bổ sung bằng chứng"** → tạm giữ `PENDING` + notify; cân nhắc thêm enum `NEEDS_MORE_EVIDENCE`. *(WDP-28)*
5. **`Dispute.vendorAId/vendorBId` chưa định nghĩa ai là chủ / ai thách thức** → giả định A = chủ hiện tại, B = người thách thức; cần chốt. *(WDP-31)*
6. **`TrustEventType` không có event riêng cho dispute/appeal.** Enum thật chỉ có 6 giá trị (xem trên). Tạm map: bên thắng/tố cáo đúng → `CORRECT_REPORT`; chủ gian lận bị gỡ nội dung → `VIOLATING_CONTENT_REMOVED`; tố cáo sai → `FALSE_REPORT`; kháng cáo thắng (OVERTURNED) → chưa có → tạm không cộng, hoặc dùng `ADMIN_ADJUSTMENT` (phải truyền `pointChange`). **Chốt với Trung.** *(WDP-31, WDP-32)*
7. **Audit KHÔNG được defer:** `Location`/`Review` không có `adminDecision.decidedBy` → luật "Admin khác xét" (BR-65) và mốc 14 ngày của F28 phải đọc từ `audit_logs`. F27 revoke phải ghi `diff.ownerId.from` để F28 khôi phục được chủ cũ. *(WDP-32)*

### SPECS gap (chốt trước defense)
8. **BR-63..67 mới có BR-63** trong SPECS, nhưng F28 trích cả 5 → **phải mở rộng SPECS** (BR-63 phạm vi / BR-64 1-lần / BR-65 Admin-khác / BR-66 14-ngày / BR-67 OVERTURNED→khôi phục) kẻo hội đồng soi ra. *(WDP-32)*

### Quy tắc vàng cho cả nhóm
9. **BR-56** (điểm reviewer hay soi nhất): transfer do **owner-grant / auto-timeout (F26) → CÓ hold 7 ngày** (`location.holdExpiresAt`); transfer do **Admin phân xử (F27) → KHÔNG hold**. Đừng nhầm 2 nhánh.
