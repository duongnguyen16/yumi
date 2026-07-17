# WDP-32 — F28: Kháng cáo

## Mục tiêu

Xây dựng cơ chế kháng cáo quyết định bất lợi từ Backend đến Frontend. Mỗi quyết định được kháng cáo một lần trong 14 ngày, trạng thái bất lợi được giữ nguyên khi chờ và quyết định Admin phải được một Admin khác xét lại khi hệ thống có từ hai Admin.

## Nguồn chuẩn

Ưu tiên theo thứ tự:

1. `docs/CONTEXT.md`.
2. Schema và contract đang chạy trong `apps/api/src`.
3. Implementation guide trong `docs`.

Các mã rule chuẩn:

- BR-63: quyết định bất lợi có đường kháng cáo và bằng chứng bổ sung.
- BR-64: một kháng cáo cho mỗi quyết định.
- BR-65: hạn 14 ngày.
- BR-66: giữ trạng thái bất lợi khi Appeal đang `PENDING`.
- BR-67: Admin xét phải khác Admin ra quyết định gốc khi có từ hai Admin.

## Phạm vi

- Submit Appeal với lý do và ít nhất một bằng chứng bổ sung.
- Kiểm tra target, người chịu quyết định, hạn và trùng Appeal.
- Admin xem hàng đợi và xử Appeal.
- RequestAccess bị từ chối có nhánh `ACCEPTED_TO_DISPUTE` để mở WDP-31.
- Quyết định Admin có nhánh `OVERTURNED` hoặc `UPHELD`.
- Web cung cấp hàng đợi Admin.
- Mobile cung cấp form và chi tiết Appeal dùng lại được, đồng thời nối trực tiếp từ RequestAccess bị từ chối.

Không refactor các module nguồn, không tạo trust rule mới, không xây Notification service mới và không triển khai duplicate merge.

## Data contract

### AppealType

Giữ các loại hiện có và bổ sung:

- `REQUEST_ACCESS_REJECTED`
- `LOCATION_REJECTED`
- `CLAIM_REJECTED`
- `DUPLICATE_HIDDEN`
- `OWNERSHIP_REVOKED`
- `REVIEW_REMOVED`
- `USER_BANNED`
- `USER_WARNED`

### AppealStatus

- `PENDING`
- `ACCEPTED_TO_DISPUTE`
- `OVERTURNED`
- `UPHELD`

### Appeal schema

Giữ các field hiện có và bổ sung:

- `argument`: lý do người dùng trình bày.
- `originalDeciderId`: Admin ra quyết định gốc nếu có.
- `originalDecidedAt`: thời điểm quyết định gốc.

`targetCollection + targetId` tiếp tục là unique identity của quyết định bị kháng cáo.

## Submit Appeal

DTO bắt buộc:

- `type`
- `targetId`
- `argument` từ 10 đến 1000 ký tự
- `additionalEvidenceFiles` từ 1 đến 5 file

Service phải xác minh:

- Target tồn tại.
- Target đang ở trạng thái bất lợi phù hợp với AppealType.
- User đăng nhập là người chịu ảnh hưởng trực tiếp.
- Quyết định gốc tồn tại và chưa quá 14 ngày.
- Chưa có Appeal cho cùng quyết định.

Sau khi submit:

- Appeal ở `PENDING`.
- Target giữ nguyên trạng thái bất lợi.
- Lưu snapshot người quyết định, thời điểm và lý do gốc.

## Resolve Appeal

### Quy tắc Admin khác

Nếu quyết định gốc do Admin thực hiện và có `originalDeciderId`, Admin đó không được resolve Appeal của chính mình. RequestAccess bị owner từ chối không có Admin gốc nên không áp dụng kiểm tra này.

### UPHELD

- Appeal chuyển `UPHELD`.
- Không thay đổi target.
- Ghi audit và gửi notification.

### OVERTURNED

Khôi phục theo contract hiện tại, không refactor module nguồn:

- Location request bị từ chối: request được đảo quyết định và Location được publish.
- Claim bị từ chối: Claim trở lại `PENDING`; không tự gán owner.
- Location bị xác nhận trùng: trở lại `PUBLISHED` và bỏ cờ duplicate.
- Ownership bị revoke: khôi phục owner từ `audit.diff.ownerId.from`.
- Review bị Admin gỡ: trở lại `PUBLISHED`.
- User bị ban: gọi `TrustEngineService.unbanUser`, sau đó trở lại trạng thái trước được lưu trong audit diff.
- User bị cảnh cáo: trở lại trạng thái trước được lưu trong audit diff, không gọi unban.

Nếu dữ liệu nguồn đã thay đổi khiến việc khôi phục không còn an toàn, trả conflict và giữ Appeal `PENDING`.

### ACCEPTED_TO_DISPUTE

Chỉ dùng cho `REQUEST_ACCESS_REJECTED`:

- RequestAccess phải còn `REJECTED`.
- Appeal phải do `requesterId` tạo.
- RequestAccess chuyển `ESCALATED`.
- Tạo đúng một Dispute `OPEN` với Vendor A là `currentOwnerId` và Vendor B là `requesterId`.
- Appeal chuyển `ACCEPTED_TO_DISPUTE` và trả `disputeId`.

Không dùng `OVERTURNED` cho RequestAccess appeal.

## Authorization

- Submit và xem Appeal của mình: `AuthGuard('jwt-appeal-access')` để tài khoản bị ban vẫn có đường kháng cáo; strategy này chỉ cấp phạm vi appeal, không mở quyền truy cập API thông thường.
- Queue, detail và resolve Admin: `AuthGuard('jwt-at')` cùng `AdminGuard`.
- User không được submit Appeal thay người chịu quyết định.
- User chỉ được xem Appeal của chính mình.

## Audit và Notification

- Dùng `AuditService` hiện có cho cả `ACCEPTED_TO_DISPUTE`, `OVERTURNED` và `UPHELD`.
- Dùng `NotificationPort` hiện có để báo kết quả cho appellant.
- Không tự thay đổi trust vì SPEC không định nghĩa điểm cho Appeal thắng hoặc thua.

## API

### User

- `POST /appeals`
- `GET /appeals/mine`
- `GET /appeals/:id`

### Admin

- `GET /admin/appeals`
- `GET /admin/appeals/:id`
- `PATCH /admin/appeals/:id/resolve`

## Frontend

### Admin Web

- Thêm mục Kháng cáo trong Sidebar.
- Hiển thị queue `PENDING` mặc định.
- Detail hiển thị quyết định gốc, người kháng cáo, lý do và bằng chứng mới.
- RequestAccess appeal có action `ACCEPTED_TO_DISPUTE` hoặc `UPHELD`.
- Các loại quyết định Admin có action `OVERTURNED` hoặc `UPHELD`.
- Lý do resolve là bắt buộc.

### Vendor Mobile

- RequestAccess detail hiển thị nút kháng cáo cho requester khi trạng thái `REJECTED` và còn hạn.
- Form Appeal dùng lại được cho các quyết định hỗ trợ.
- Danh sách và chi tiết Appeal của tài khoản.
- Khi Appeal chuyển `ACCEPTED_TO_DISPUTE`, hiển thị đường dẫn đến Dispute.

Không sửa hàng loạt màn hình của task khác chỉ để thêm nút Appeal. Các module nguồn có thể nối vào form dùng lại sau bằng `type` và `targetId`.

## Kiểm thử bắt buộc

- Chặn user không phải người chịu quyết định.
- Bắt buộc lý do và ít nhất một bằng chứng.
- Chặn Appeal thứ hai cho cùng quyết định.
- Chặn quyết định quá 14 ngày.
- Target không đổi khi Appeal `PENDING` hoặc `UPHELD`.
- Admin gốc không được xử lại quyết định của mình.
- RequestAccess appeal được chấp nhận tạo đúng một Dispute và chuyển `ESCALATED`.
- Mỗi restore handler khôi phục đúng dữ liệu hiện có và không tự gán owner cho Claim.
- Resolve lần hai bị chặn.
- Audit và Notification chạy cho mọi kết quả.
- Admin Web và Vendor Mobile xử lý loading, empty, error và success state.

## Hoàn thành

WDP-32 hoàn thành khi người dùng gửi Appeal, Admin xử, target được giữ hoặc khôi phục đúng, RequestAccess appeal mở được WDP-31 và toàn bộ trạng thái được phản ánh trên Web cùng Mobile.
