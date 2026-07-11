# WDP-19 — F15: Admin duyệt địa điểm — Guide theo code hiện tại

> File cá nhân, đã gitignore. Cập nhật theo codebase ngày 2026-07-10.
> Board snapshot: WDP-19 đang ở cột **Đang làm**. Trạng thái chỉ được chuyển sau khi chạy E2E với DB và tài khoản admin.

## 1. Mục tiêu

Admin xét `LocationRequest`, không sửa `Location` trực tiếp. Mỗi quyết định phải cập nhật phiếu và địa điểm liên kết, tạo notification, audit log; approve mới gọi Trust Engine.

API hiện có:

- `GET /api/admin/location-requests/queue?page=1&limit=30`
- `PATCH /api/admin/location-requests/:id/approve`
- `PATCH /api/admin/location-requests/:id/reject`

Toàn bộ controller dùng `AuthGuard('jwt-at')` và `AdminGuard`.

## 2. Contract hiện tại

`LocationRequest` trong `common/schemas/location-request.ts` dùng các field:

- `type`: `CREATE`, `UPDATE`, `DELETE`.
- `status`: `PENDING`, `PENDING_RE_APPROVAL`, `APPROVED`, `REJECTED`, `CANCELLED`.
- `submittedBy`, `locationId`, `oldData`, `newData`, `changedFields`, `imageUrls`.
- `pinLocation`, `deviceLocation`, `deviceDistanceMeters`.
- `isPotentialDuplicate`, `suspectedDuplicateLocationIds`.
- `reviewerId`, `reviewedAt`, `reviewNote`.

Không dùng các tên cũ `submittedDataSnapshot` hoặc `rejectReason`.

Hai trạng thái admin được phép xử lý là `PENDING` (tạo mới) và `PENDING_RE_APPROVAL` (sửa địa điểm đã publish). Model có unique partial index riêng cho mỗi trạng thái update đang chờ, tránh tạo nhiều phiếu re-approval cho một địa điểm.

## 3. State machine

| Phiếu trước | Hành động | Phiếu sau | Location | Trust |
|---|---|---|---|---|
| `PENDING` / `PENDING_RE_APPROVAL` | approve | `APPROVED`, có `reviewerId`, `reviewedAt` | áp `newData` allow-list, `status=PUBLISHED` | `LOCATION_APPROVED` (+15) qua `TrustEngineService` |
| `PENDING` / `PENDING_RE_APPROVAL` | reject | `REJECTED`, có `reviewNote`, `reviewerId`, `reviewedAt` | location chưa published chuyển `REJECTED`; location đã published giữ dữ liệu cũ | không gọi Trust Engine |
| trạng thái khác | approve/reject | không đổi | không đổi | trả HTTP 409 |

Reject yêu cầu lý do sau khi trim, tối thiểu 5 ký tự. Nếu có `duplicateOfLocationId`, service lưu ID đó trong `reviewNote`, notification và audit reason.

## 4. Snapshot được phép áp dụng

`AdminLocationService` chỉ đọc các key sau từ `newData`:

`name`, `description`, `address`, `geo`, `accuracyMeters`, `openingHours`, `phone`, `categoryId`, `subCategoryIds`, `tagIds`, `imagesUrls`, `imageUrls`, `latitude`, `longitude`, `pinLatitude`, `pinLongitude`.

Các field hệ thống như `ownerId`, `status`, `source`, `submittedBy`, `viewCount`, `isDuplicate` và `isSuspectedDuplicate` không được snapshot ghi đè. ObjectId không hợp lệ bị bỏ qua; `geo` chỉ được nhận khi có đúng hai tọa độ số.

## 5. Hàng đợi và cờ cảnh báo

Queue lọc cả `PENDING` và `PENDING_RE_APPROVAL`, sort phiếu nghi trùng trước. Cờ được tính khi đọc:

- `suspectedDuplicate`: `isPotentialDuplicate === true`.
- `suspectedDuplicateLocationIds`: danh sách địa điểm để admin đối chiếu.
- `farPin`: `deviceDistanceMeters > 50` mét.

Frontend nằm tại `apps/web/src/app/admin/(protected)/location-requests/`. Drawer hiển thị dữ liệu đề xuất, cờ pin xa, ID nghi trùng; nút từ chối mở trực tiếp form lý do. `apps/web/src/app/admin/page.tsx` redirect đến `/admin/location-requests` và sidebar đã có route này.

## 6. File và dependency

```text
apps/api/src/
├─ modules/admin/
│  ├─ admin-location.controller.ts
│  ├─ admin-location.service.ts
│  ├─ admin-location.service.spec.ts
│  ├─ admin.module.ts
│  └─ dto/{list-pending-requests,reject-request}.dto.ts
├─ common/contracts/notification.port.ts
└─ common/schemas/location-request.ts

apps/web/src/
└─ app/admin/(protected)/location-requests/
   ├─ page.tsx
   └─ components/LocationRequestDetailDrawer.tsx
```

- `NotificationPort` hiện là stub ghi `notifications`; thay provider khi WDP-7 hoàn thành.
- Audit ghi trực tiếp vào `audit_logs` vì chưa có utility chung.
- `LocationContributionsService` và `VendorLocationsService` là hai flow đang tạo `LocationRequest`; không đổi contract `newData` mà không đồng bộ hai module này.

## 7. Kiểm thử hiện có và E2E cần chạy

Unit test: `apps/api/src/modules/admin/admin-location.service.spec.ts` kiểm queue flags, approve re-approval và reject không có lý do.

```bash
npm test --workspace=api -- --runInBand
npm run build --workspace=api
npm run build --workspace=web
```

E2E cần DB seed và token admin:

1. Gửi một request `CREATE` và một request `UPDATE`/`PENDING_RE_APPROVAL`.
2. Kiểm queue có cờ nghi trùng và pin xa.
3. Approve: xác nhận Location `PUBLISHED`, field allow-list được áp, trust event, notification và audit log được tạo.
4. Reject: kiểm lý do rỗng trả 400; location đã publish không bị ghi đè; reject trùng lưu ID địa điểm gốc.
5. Gọi lại approve/reject: nhận 409; non-admin nhận 403; thiếu token nhận 401.

## 8. Rủi ro còn lại

- Unit test không thay thế transaction/E2E với MongoDB. Cần kiểm tra failure của Trust Engine, Notification và AuditLog trên DB thật để quyết định chiến lược retry/transaction.
- WDP-7 vẫn chưa thay NotificationStub bằng delivery service thật.
- Chỉ một request tạo/sửa có `locationId` hợp lệ mới được admin xử lý; các flow tạo request phải duy trì invariant này.
