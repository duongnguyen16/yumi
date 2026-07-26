# Báo cáo kiểm tra End-to-End các luồng Ownership

Ngày kiểm tra: 2026-07-25

Phạm vi:

- Claim địa điểm
- Request Access và Dispute
- Appeal
- Location Request
- Đăng ký địa điểm mới có yêu cầu sở hữu
- Logic nâng role `CUSTOMER → VENDOR`

## Kết luận trọng tâm

Hiện tại khi Admin duyệt yêu cầu đăng ký địa điểm mới có sở hữu, hệ thống **chỉ gán `location.ownerId` và không cập nhật role của người gửi từ `CUSTOMER` lên `VENDOR`**.

Nhánh xử lý nằm tại:

```ts
if (ownershipRegistration) {
  location.ownerId = req.submittedBy;
}
```

File: `apps/api/src/modules/admin/admin-location.service.ts:486-520`

`AdminLocationService` hiện không inject `UserModel`, không có lệnh cập nhật `user.role`, và không dùng transaction khi lưu request/location.

Điều này trái với BR-70 trong `docs/CONTEXT.md`, theo đó việc:

1. Publish địa điểm.
2. Gán requester làm owner.
3. Đổi role `CUSTOMER → VENDOR`.

phải được thực hiện trong cùng một transaction.

Hậu quả trực tiếp:

- Customer có thể trở thành `ownerId` của location nhưng role vẫn là `CUSTOMER`.
- Mobile tiếp tục hiển thị navigation dành cho Customer.
- API có `VendorGuard` sẽ từ chối người dùng này.
- Người dùng không truy cập được đầy đủ chức năng quản lý location, product và review reply dành cho Vendor.

## Findings

### P0 — Approve đăng ký địa điểm có sở hữu không nâng role

Admin approve hiện thực hiện:

```ts
req.status = LocationRequestStatus.APPROVED;
this.applySnapshot(location, req.newData);

if (ownershipRegistration) {
  location.ownerId = req.submittedBy;
}

location.status = LocationStatus.PUBLISHED;
```

File liên quan:

- `apps/api/src/modules/admin/admin-location.service.ts:486-520`
- `apps/api/src/modules/vendor-locations/vendor-locations.controller.ts:263-266`
- `apps/mobile/src/navigation/mainTabs.ts:25-26`
- `docs/CONTEXT.md:140-159`

Thiếu:

- Load requester.
- Kiểm tra role hiện tại.
- Nếu role là `CUSTOMER`, update thành `VENDOR`.
- Transaction chứa request, location và user.
- Regression test xác nhận owner và role được update đồng thời.

### P0 — Claim đang chặn Customer trái đặc tả

Backend hiện chỉ cho Vendor claim:

```ts
if (!user || user.role !== UserRole.VENDOR) {
  return this.failure(
    403,
    'Chỉ tài khoản Vendor mới có thể claim địa điểm',
  );
}
```

File: `apps/api/src/modules/claims/claim.service.ts:348-364`

Mobile cũng chỉ hiển thị nút claim cho Vendor:

```tsx
{user?.role === "VENDOR" && !ownerId ? (
  // Nút nhận sở hữu địa điểm
) : null}
```

File: `apps/mobile/src/components/location/tabs/GeneralTab.tsx:236-248`

Trong khi đặc tả yêu cầu:

- Customer hoặc Vendor đều có thể claim sau khi xác minh số điện thoại.
- Nếu Customer được Admin approve thì phải đổi thành Vendor.
- Nếu reject thì giữ nguyên role.

`AdminClaimService` hiện chỉ gán owner:

```ts
loc.ownerId = claim.vendorId;
await loc.save();

claim.status = ClaimRequestStatus.APPROVED;
await claim.save();
```

File: `apps/api/src/modules/admin-claims/admin-claim.service.ts:116-150`

Service không inject `UserModel`, không nâng role và không dùng transaction.

Ngoài ra, test hiện tại đang khẳng định hành vi sai đặc tả:

```ts
['tài khoản Customer', { ...eligibleVendor, role: UserRole.CUSTOMER }]
```

File: `apps/api/src/modules/claims/claim.service.spec.ts:205-252`

### P1 — Location bị khóa ownership vĩnh viễn sau khi Dispute kết thúc

Khi Admin chấp nhận appeal của một Request Access bị từ chối:

1. Tạo Dispute.
2. Đổi Request Access thành `ESCALATED`.

```ts
req.status = RequestAccessStatus.ESCALATED;
await req.save();
```

File: `apps/api/src/modules/appeals/appeal.service.ts:293-334`

Khi Admin resolve Dispute, service chỉ:

- Đổi owner của location.
- Đổi trạng thái Dispute.
- Ghi audit và notification.

File: `apps/api/src/modules/disputes/dispute.service.ts:176-250`

Service không đóng hoặc cập nhật Request Access đang `ESCALATED`.

Trong khi đó, logic ownership lock coi mọi Request Access `ESCALATED` là đang khóa:

```ts
status: {
  $in: [
    RequestAccessStatus.PENDING,
    RequestAccessStatus.ESCALATED,
  ],
}
```

File: `apps/api/src/modules/request-access/request-access.service.ts:486-511`

Kết quả: sau khi Dispute đã resolve, location vẫn không thể nhận Request Access mới.

### P1 — Các thay đổi ownership không atomic

Nhiều flow thay đổi nhiều document bằng các lệnh `save()` độc lập.

#### Location Request approve

```ts
await req.save();
await location.save();
```

File: `apps/api/src/modules/admin/admin-location.service.ts:518-520`

Nếu `req.save()` thành công nhưng `location.save()` lỗi:

- Request có thể là `APPROVED`.
- Location vẫn chưa publish hoặc chưa được gán owner.

#### Claim approve

```ts
loc.ownerId = claim.vendorId;
await loc.save();

claim.status = ClaimRequestStatus.APPROVED;
await claim.save();
```

File: `apps/api/src/modules/admin-claims/admin-claim.service.ts:139-150`

Nếu `claim.save()` lỗi:

- Location đã có owner.
- Claim vẫn có thể là `PENDING`.

#### Request Access transfer

```ts
loc.ownerId = req.requesterId;
await loc.save();

req.status = status;
await req.save();
```

File: `apps/api/src/modules/request-access/request-access.service.ts:431-447`

#### Dispute resolve

```ts
loc.ownerId = newOwner;
await loc.save();

item.status = status;
await item.save();
```

File: `apps/api/src/modules/disputes/dispute.service.ts:191-216`

#### Appeal escalation

Flow tạo Dispute, cập nhật Request Access, cập nhật Appeal, audit và notification bằng các thao tác riêng biệt.

File: `apps/api/src/modules/appeals/appeal.service.ts:191-283`

Các flow này có nguy cơ:

- Partial update.
- Admin retry tạo side effect lặp.
- Owner và trạng thái workflow không đồng bộ.
- Notification/audit không tương ứng với trạng thái cuối.
- Race condition khi hai Admin xử lý cùng lúc.

### P1 — Claim chưa xác minh bằng chứng thực sự được chụp tại location

Khi submit claim, backend chỉ kiểm tra:

- `fileType === IMAGE`.
- Mảng tọa độ có hai phần tử.
- Có `capturedAt`.

```ts
const hasGeoPhoto = dto.evidenceFiles.some((file) => {
  if (file.fileType !== 'IMAGE') return false;
  if (file.geo?.coordinates.length !== 2) return false;
  return Boolean(file.capturedAt);
});
```

File: `apps/api/src/modules/claims/claim.service.ts:234-251`

Admin approve flags cũng chỉ kiểm tra sự tồn tại:

```ts
const hasOnSiteProof = files.some((file) => {
  if (file.fileType !== 'IMAGE') return false;
  if (file.geo?.coordinates.length !== 2) return false;
  return Boolean(file.capturedAt);
});
```

File: `apps/api/src/modules/admin-claims/admin-claim.service.ts:263-290`

Thiếu các kiểm tra:

- Khoảng cách giữa tọa độ bằng chứng và location.
- Độ chính xác GPS.
- Ảnh có quá cũ hay nằm trong tương lai không.
- URL có thuộc requester không.
- File có thực sự nằm trong storage hợp lệ không.

Request Access đã có implementation chặt hơn tại:

`apps/api/src/modules/request-access/ownership-evidence.service.ts:15-83`

Service này kiểm tra:

- Bán kính tối đa 50m.
- Accuracy tối đa 50m.
- Ảnh chụp trong vòng 10 phút.
- Future skew tối đa 2 phút.
- URL Supabase thuộc đúng user.

Claim nên dùng chung hoặc tái sử dụng cơ chế tương đương.

### P1 — Claim bị reject không thể Appeal

Đặc tả tại `docs/CONTEXT.md:183-188` ghi requester có thể kháng cáo khi claim bị reject.

Tuy nhiên enum hiện tại không có `CLAIM_REJECTED`:

```ts
export enum AppealType {
  REQUEST_ACCESS_REJECTED = 'REQUEST_ACCESS_REJECTED',
  LOCATION_REJECTED = 'LOCATION_REJECTED',
  OWNERSHIP_REVOKED = 'OWNERSHIP_REVOKED',
  USER_BANNED = 'USER_BANNED',
}
```

File: `apps/api/src/common/schemas/common.enums.ts:81-86`

`AppealSourceService` cũng không load Claim Request:

```ts
if (type === AppealType.REQUEST_ACCESS_REJECTED) return this.access(id);
if (type === AppealType.LOCATION_REJECTED) return this.locationRequest(id);
if (type === AppealType.OWNERSHIP_REVOKED) return this.ownership(id);
if (type === AppealType.USER_BANNED) return this.user(id);
```

File: `apps/api/src/modules/appeals/appeal-source.service.ts:53-58`

Mobile không định nghĩa loại appeal này:

`apps/mobile/src/components/workflow/appeal-presentation.ts:3-8`

Notification navigation cũng không route `CLAIM_REJECTED` sang form appeal:

`apps/mobile/src/navigation/notification-destination.ts:24-33`

Đáng chú ý: seed data lại có record `type: 'CLAIM_REJECTED'` tại:

`apps/api/scripts/seed-test-users.js:627-640`

Seed data và schema/API contract đang không đồng bộ.

### P2 — Overturn Location Appeal chưa khôi phục đúng nghiệp vụ

`AppealRestoreService.restoreLocation()` hiện chỉ:

```ts
req.status = LocationRequestStatus.APPROVED;
loc.status = LocationStatus.PUBLISHED;
await Promise.all([req.save(), loc.save()]);
```

File: `apps/api/src/modules/appeals/appeal-restore.service.ts:50-78`

Nó không:

- Apply `req.newData`.
- Gán owner nếu đây là ownership registration.
- Nâng Customer thành Vendor.
- Khôi phục các side effect tương đương một lần approve bình thường.
- Ghi lại reviewer/review metadata phù hợp.

Với Location Request loại UPDATE:

- Khi reject, location đang `PUBLISHED` sẽ tiếp tục là `PUBLISHED`.
- `restoreLocation()` lại yêu cầu location phải đang `REJECTED`.

Do đó appeal của UPDATE request bị reject có thể submit được nhưng không thể overturn thành công.

File liên quan:

- `apps/api/src/modules/admin/admin-location.service.ts:507-516`
- `apps/api/src/modules/appeals/appeal-source.service.ts:76-88`
- `apps/api/src/modules/appeals/appeal-restore.service.ts:50-64`

### P2 — Vendor registration UI có thể cho submit thiếu ảnh nhưng backend từ chối

Mobile chỉ bắt buộc ít nhất một video khi đăng ký ownership:

```ts
if (isVendorRegistration && videos.length < 1) {
  setNotice("Hãy thêm ít nhất 1 video có chứa mã xác thực.");
  return;
}
```

File: `apps/mobile/src/app/contribute/index.tsx:812-825`

Backend luôn gọi:

```ts
await this.imagesService.uploadMultiMedia(
  'vendor-verification',
  files?.imageFiles ?? [],
);
```

`uploadMultiMedia()` ném lỗi nếu danh sách rỗng.

File liên quan:

- `apps/api/src/modules/vendor-locations/vendor-locations.service.ts:409-424`
- `apps/api/src/modules/images/images.service.ts:159-164`

Vì vậy người dùng có thể vượt qua validation mobile nhưng bị backend từ chối với lỗi không rõ từ UI.

## Tóm tắt trạng thái từng flow

| Flow | Phần hoạt động | Vấn đề chính |
|---|---|---|
| Customer contribution | Tạo Location Request, Admin approve/reject, publish location | Không liên quan owner là đúng; multi-document save chưa atomic |
| New location ownership registration | Tạo request có `ownershipRequested`, Admin UI nhận diện được proof | Approve gán owner nhưng không nâng Customer thành Vendor |
| Claim | OTP listing, system code, evidence, Admin queue | Chặn Customer; approve không nâng role; proof geo/time chưa được xác minh đầy đủ |
| Request Access | Verification session, owner respond, timeout takeover | Ownership transfer chưa atomic |
| Appeal Request Access | Reject → appeal → mở Dispute | Request Access `ESCALATED` không được đóng sau dispute |
| Dispute | Admin KEEP/TRANSFER/REVOKE, audit, notification | Sau resolve location bị ownership lock vĩnh viễn; update chưa atomic |
| Location Appeal | Submit trong 14 ngày, Admin uphold/overturn | Overturn không replay đầy đủ approve; UPDATE appeal không restore được |
| Claim Appeal | Đặc tả và seed có đề cập | API/schema/mobile chưa hỗ trợ |

## Kiểm chứng đã chạy

### API tests

Lệnh:

```powershell
npm test --workspace=api -- --runInBand
```

Kết quả:

```text
Test Suites: 36 passed, 36 total
Tests:       149 passed, 149 total
```

Lưu ý: test xanh không đồng nghĩa đúng đặc tả, vì test Claim hiện còn kỳ vọng Customer bị chặn.

### Web tests

Lệnh:

```powershell
npm test --workspace=web
```

Kết quả:

```text
tests 17
pass 17
fail 0
```

### Mobile tests

Lệnh:

```powershell
npm test --workspace=mobile -- --runInBand
```

Kết quả:

```text
Test Suites: 1 failed, 46 passed, 47 total
Tests:       1 failed, 148 passed, 149 total
```

Test fail hiện có:

```text
src/common/map-location.spec.ts
Expected mapSelectionZoom: 13
Received: 16
```

Lỗi này không thuộc các flow ownership được kiểm tra.

### Build

API build thành công:

```powershell
npm run build --workspace=api
```

Web build chưa hoàn tất do lỗi filesystem:

```text
EPERM: operation not permitted, unlink
apps/web/.next/diagnostics/build-diagnostics.json
```

Lỗi này chưa chứng minh có lỗi TypeScript trong source web.

## Thứ tự sửa đề xuất

1. Tạo một ownership approval transaction dùng chung để:
   - Gán owner.
   - Nâng `CUSTOMER → VENDOR`.
   - Update trạng thái request/claim.
   - Ghi audit cần thiết.
2. Cho Customer đã verify phone đi qua Claim UI và backend.
3. Thêm regression test cho cả Customer và Vendor:
   - Customer approve → owner + Vendor.
   - Vendor approve → owner + giữ Vendor.
   - Reject → không đổi owner/role.
   - Transaction failure → không document nào bị thay đổi.
4. Sửa lifecycle `ESCALATED` hoặc ownership lock sau khi Dispute resolve.
5. Dùng `OwnershipEvidenceService` hoặc validation tương đương cho Claim.
6. Thêm `CLAIM_REJECTED` vào Appeal end-to-end.
7. Refactor Appeal restore để gọi cùng domain operation với approve bình thường.
8. Đồng bộ validation media giữa mobile và backend.

