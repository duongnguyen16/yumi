# WDP-30 — F26: Request-access, chuyển quyền và hold

## 1. Trạng thái triển khai

WDP-30 gồm mobile và API.

- API: `apps/api/src/modules/request-access/`
- Hold helper: `apps/api/src/common/ownership/hold.util.ts`
- Mobile service: `apps/mobile/src/service/requestAccessService.ts`
- Mobile routes: `apps/mobile/src/app/request-access/`
- Test service: `apps/api/src/modules/request-access/request-access.service.spec.ts`
- Test hold: `apps/api/src/common/ownership/hold.util.spec.ts`

WDP-27 và WDP-28 đã cung cấp claim, proof và owned location. Notification tiếp tục dùng `NotificationPort` chung.

## 2. Luồng nghiệp vụ

Requester B xin quyền quản lý một location đã có owner A.

1. B gửi yêu cầu.
2. Request được tạo với `PENDING` và `timeoutAt = now + 3 ngày`.
3. A có thể grant hoặc reject khi request còn hạn.
4. Grant chuyển owner sang B và tạo hold 7 ngày.
5. Reject giữ nguyên owner, không tạo hold, B có thể kháng cáo ở WDP-31.
6. Nếu A không phản hồi sau 3 ngày, B chụp proof tại chỗ.
7. Proof hợp lệ tạo `AUTO_GRANTED`, chuyển owner sang B và tạo hold 7 ngày.

Không dùng cron, scheduler hoặc interval. Trạng thái quá hạn được suy ra lúc đọc và lúc thao tác.

## 3. State machine

| Trạng thái | Hành động | Kết quả |
|---|---|---|
| PENDING còn hạn | Owner grant | GRANTED, owner chuyển sang B, hold 7 ngày |
| PENDING còn hạn | Owner reject | REJECTED, owner giữ nguyên, không hold |
| PENDING quá hạn | Requester verify proof | AUTO_GRANTED, owner chuyển sang B, hold 7 ngày |
| PENDING quá hạn | Owner respond | 409 |
| Khác PENDING | Respond hoặc verify | 409 |

`EXPIRED` và `ESCALATED` vẫn có trong enum nhưng WDP-30 không ghi hai trạng thái này.

## 4. Lazy timeout

`resolveEffectiveState(request, now?)` trả một trong các giá trị:

- `PENDING_OPEN`
- `PENDING_TIMED_OUT`
- `GRANTED`
- `REJECTED`
- `AUTO_GRANTED`
- `EXPIRED`
- `ESCALATED`

Resolver không thay đổi database. Request PENDING quá hạn chỉ đổi sang AUTO_GRANTED khi requester verify thành công.

## 5. Hold

Hold dùng field `location.holdExpiresAt`.

- Grant: `now + 7 ngày`.
- Auto-grant: `now + 7 ngày`.
- Reject: không set hold.
- Hold hết hạn theo thời gian, không có job xóa field.

Helper dùng chung:

- `isUnderHold(location, now?)`
- `assertNotUnderHold(location, action, now?)`

Các destructive action:

- `HIDE_LOCATION`
- `BULK_DELETE_PRODUCTS`
- `EDIT_CORE_INFO`

Giờ mở cửa, mô tả, ảnh và chỉnh sửa lành tính không bị chặn.

## 6. Slot PENDING dùng chung

Mỗi location chỉ có một slot nhận quyền đang chờ.

Khi tạo request-access, service kiểm đồng thời:

- `claim_requests` có claim PENDING hay không.
- `request_accesses` có request PENDING hay không.

Unique partial index của `request_accesses` tiếp tục chặn race giữa hai request cùng collection. Duplicate key trả 409.

## 7. Điều kiện tạo request

- User ID và location ID hợp lệ.
- Location tồn tại.
- Location đang `PUBLISHED`.
- Location đã có owner.
- Requester không phải owner hiện tại.
- Không có claim hoặc request-access PENDING.

Nếu location chưa có owner, client phải dùng Claim.

## 8. Điều kiện transfer

Trước grant và auto-grant, service kiểm `location.ownerId` vẫn trùng `request.currentOwnerId`. Nếu owner đã thay đổi trong lúc request chờ, trả 409 và không ghi đè owner mới.

Proof auto-takeover cần ít nhất một file IMAGE có:

- URL hợp lệ.
- `geo.coordinates` đủ hai phần tử.
- `capturedAt`.

Mobile lấy vị trí hiện tại lúc chụp và upload ảnh qua service đóng góp đang có.

## 9. API

Tất cả endpoint dùng `AuthGuard('jwt-at')`.

| Method | Route | Mục đích |
|---|---|---|
| POST | `/api/request-access` | Tạo request |
| GET | `/api/request-access/mine?side=owner` | Yêu cầu gửi tới owner |
| GET | `/api/request-access/mine?side=requester` | Yêu cầu requester đã gửi |
| GET | `/api/request-access/:id` | Chi tiết và effective state |
| PATCH | `/api/request-access/:id/respond` | Owner grant hoặc reject |
| PATCH | `/api/request-access/:id/verify-takeover` | Requester verify sau timeout |

Response list và detail có:

- `effectiveState`
- `isExpired`
- `canVerifyTakeover`

Chỉ requester hoặc owner của request được xem detail.

## 10. Mobile

### Location detail

Vendor thấy:

- Claim nếu location chưa có owner.
- Xin quyền quản lý nếu location có owner khác.
- Chỉnh sửa nếu chính Vendor là owner.

### Tạo request

Route `/request-access/new/[locationId]` hiển thị location và cho nhập lý do. Sau khi gửi, UI thông báo owner có 3 ngày phản hồi.

### Inbox

Route `/request-access` có hai tab:

- Yêu cầu đến.
- Đã gửi.

Mỗi item hiển thị location, người liên quan và effective state.

### Chi tiết

Route `/request-access/[id]` có timeline 3 ngày.

- Owner còn hạn: grant hoặc reject.
- Requester quá hạn: chụp ảnh proof, lấy GPS và verify takeover.
- Requester bị reject: xem lý do và hướng sang WDP-31.

## 11. Notification và audit

Notification event:

- `REQUEST_ACCESS_RECEIVED`
- `REQUEST_ACCESS_REJECTED`
- `REQUEST_ACCESS_RESPONSE_RECORDED`
- `OWNERSHIP_TRANSFERRED_TO_YOU`
- `OWNERSHIP_TRANSFERRED_AWAY`

Audit action:

- `REQUEST_ACCESS_GRANT`
- `REQUEST_ACCESS_REJECT`
- `REQUEST_ACCESS_AUTO_GRANT`

WDP-30 không thay đổi trust score.

## 12. Kiểm thử

Backend test phải bao phủ:

1. Hold đang hiệu lực và hết hạn.
2. Destructive action bị chặn trong hold.
3. Lazy state không đổi status database.
4. Claim PENDING chặn request-access.
5. Tạo request và notify owner.
6. Danh sách incoming/outgoing.
7. Grant chuyển owner và tạo hold.
8. Reject giữ owner và không hold.
9. Owner không thể respond sau timeout.
10. Owner thay đổi thì transfer bị chặn.
11. Verify trước timeout bị chặn.
12. Verify sau timeout tạo AUTO_GRANTED và hold.

Lệnh kiểm tra:

```bash
npm test --workspace=api -- --runInBand
npm run build --workspace=api
npx tsc --noEmit -p apps/mobile/tsconfig.json
npm run lint --workspace=mobile
```

## 13. Rủi ro còn lại

- Unique slot claim và request-access là constraint tầng ứng dụng vì MongoDB không tạo unique index chéo collection.
- `responseReason` đang được dùng cho lý do requester trước khi owner reject ghi đè. Nếu cần giữ hai lịch sử riêng, schema phải có `requesterReason`.
- Notification vẫn dùng stub cho tới khi WDP-7 cung cấp module thật.
- Kháng cáo sau reject thuộc WDP-31, WDP-30 chỉ hiển thị quyền kháng cáo.
