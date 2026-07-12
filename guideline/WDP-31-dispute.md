# WDP-31 — F27: Phân xử tranh chấp sở hữu

## Mục tiêu

Xây dựng luồng tranh chấp sở hữu hai bên từ Backend đến Frontend. Dispute chỉ xuất hiện sau khi chủ hiện tại từ chối RequestAccess và kháng cáo của người yêu cầu được Admin chấp nhận theo WDP-32.

## Nguồn chuẩn

Ưu tiên theo thứ tự:

1. `docs/CONTEXT.md`.
2. Schema và contract đang chạy trong `apps/api/src`.
3. Implementation guide trong `docs`.

Không mở Dispute trực tiếp từ claim, report chủ sai hoặc hành động Admin tự phát hiện gian lận.

Nếu Admin duyệt một Claim nhưng Location đã có chủ khác, Claim phải chuyển sang `REJECTED`, lưu quyết định và hướng Vendor sang RequestAccess. Không được giữ Claim `PENDING` vì BR-61 sẽ chặn RequestAccess và tạo deadlock.

## Phạm vi

- Vendor A là chủ hiện tại được lưu trong RequestAccess.
- Vendor B là người gửi RequestAccess.
- RequestAccess phải ở trạng thái `ESCALATED` trước khi tạo Dispute.
- Hai bên được xem hồ sơ và bổ sung bằng chứng cho phía của mình khi Dispute còn `OPEN`.
- Admin được xem hàng đợi, chi tiết và ra một trong ba phán quyết.
- Web cung cấp màn hình Admin.
- Mobile cung cấp màn hình Vendor xem Dispute và bổ sung bằng chứng.

Không thực hiện ban tài khoản, tự động chấm độ mạnh bằng chứng, thay đổi Trust Engine hoặc xây Notification service mới.

## Data contract

### Dispute

Giữ các field hiện có:

- `locationId`
- `vendorAId`
- `vendorBId`
- `evidenceA`
- `evidenceB`
- `status`
- `adminDecision`

Bổ sung `requestAccessId` để chứng minh nguồn hợp lệ. Field này có index unique dạng partial để không phá dữ liệu Dispute cũ nhưng chặn tạo hai Dispute từ cùng một RequestAccess.

### Trạng thái

- `OPEN`
- `RESOLVED_KEEP`
- `RESOLVED_TRANSFER`
- `RESOLVED_REVOKE`

## Quy tắc nghiệp vụ

### Nguồn tạo Dispute

Dispute mới chỉ được tạo bởi WDP-32 khi:

- RequestAccess đang `REJECTED`.
- Người kháng cáo là `requesterId`.
- Appeal còn hạn và chưa tồn tại cho quyết định này.
- Admin chấp nhận Appeal sang `ACCEPTED_TO_DISPUTE`.

Khi đó:

- RequestAccess chuyển sang `ESCALATED`.
- `vendorAId = currentOwnerId`.
- `vendorBId = requesterId`.
- `evidenceB` nhận bằng chứng của RequestAccess và bằng chứng bổ sung từ Appeal.
- `evidenceA` khởi tạo từ bằng chứng phía chủ hiện có hoặc rỗng.

### Bổ sung bằng chứng

- Chỉ Vendor A hoặc Vendor B của Dispute được truy cập endpoint dành cho bên tranh chấp.
- Mỗi Vendor chỉ được thêm bằng chứng vào phía của mình.
- Không nhận bằng chứng mới sau khi Dispute đã đóng.
- Bằng chứng dùng cùng contract `EvidenceFile` hiện có.

### Phán quyết

#### KEEP

- Dispute chuyển `RESOLVED_KEEP`.
- `location.ownerId` giữ Vendor A.
- Không tạo hoặc thay đổi hold.

#### TRANSFER

- Dispute chuyển `RESOLVED_TRANSFER`.
- `location.ownerId` chuyển sang Vendor B.
- `location.holdExpiresAt` không được tạo; giá trị cũ nếu có được xóa.

#### REVOKE

- Dispute chuyển `RESOLVED_REVOKE`.
- Xóa `location.ownerId` và hold.
- Không tạo claim mới. Location không còn owner nên luồng claim hiện có tự mở lại.

### An toàn dữ liệu

- Chỉ xử Dispute đang `OPEN`.
- Location phải tồn tại.
- Owner hiện tại phải còn khớp Vendor A trước KEEP, TRANSFER hoặc REVOKE.
- TRANSFER không nhận `winnerId`; outcome đã xác định Vendor B là người nhận quyền.
- Lý do phán quyết là bắt buộc.
- Không tự cộng hoặc trừ trust vì SPEC không định nghĩa trust event cho Dispute.

## Audit và Notification

Mỗi phán quyết:

- Lưu `adminDecision.decidedBy`, `reason`, `decidedAt`.
- Gọi `AuditService` hiện có.
- Audit diff phải có `disputeStatus` và `ownerId.from/to` để WDP-32 có thể khôi phục.
- Gọi `NotificationPort` hiện có cho cả Vendor A và Vendor B.

## API

### Vendor

- `GET /disputes/mine`
- `GET /disputes/:id`
- `POST /disputes/:id/evidence`

### Admin

- `GET /admin/disputes`
- `GET /admin/disputes/:id`
- `PATCH /admin/disputes/:id/resolve`

Endpoint Vendor dùng `AuthGuard('jwt-at')`. Endpoint Admin dùng `AuthGuard('jwt-at')` và `AdminGuard`.

## Frontend

### Admin Web

- Thêm mục Tranh chấp trong Sidebar.
- Hiển thị hàng đợi `OPEN` mặc định.
- Drawer chi tiết hiển thị Location, Vendor A, Vendor B và hai nhóm bằng chứng.
- Form phán quyết gồm outcome và lý do.
- TRANSFER không yêu cầu nhập winner.

### Vendor Mobile

- Danh sách Dispute liên quan đến tài khoản.
- Chi tiết hai bên và trạng thái.
- Cho phép thêm bằng chứng vào đúng phía khi còn `OPEN`.
- Hiển thị kết quả sau khi Admin xử.

## Kiểm thử bắt buộc

- Không tạo Dispute từ Claim.
- Chỉ một Dispute cho một RequestAccess đã `ESCALATED`.
- Vendor ngoài vụ việc không được xem hoặc thêm bằng chứng.
- Vendor A và B chỉ sửa bằng chứng phía mình.
- KEEP giữ Vendor A.
- TRANSFER chuyển Vendor B và không có hold.
- REVOKE xóa owner và cho phép luồng claim hoạt động lại.
- Dispute đã đóng không được xử lần hai.
- Mỗi phán quyết ghi audit và gửi thông báo cho hai bên.
- Admin Web và Vendor Mobile xử lý loading, empty, error và success state.

## Hoàn thành

WDP-31 hoàn thành khi luồng từ Appeal được chấp nhận, tạo Dispute, bổ sung bằng chứng, Admin phán quyết và Vendor xem kết quả chạy xuyên suốt Backend đến Frontend.
