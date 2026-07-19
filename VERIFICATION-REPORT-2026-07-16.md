# Báo cáo kiểm tra end-to-end các luồng trong `guideline/`

- Ngày kiểm tra: 2026-07-16
- Phạm vi: WDP-19, WDP-27, WDP-28, WDP-30, WDP-31, WDP-32
- Nguyên tắc: chỉ kiểm tra, không sửa mã nguồn ứng dụng
- Kết luận ngắn: **chưa thể xác nhận toàn bộ các luồng đúng hoàn toàn với tài liệu hiện hành**. Có 2 sai lệch runtime cần xử lý và một số nội dung guideline đã cũ.

> **Cập nhật khắc phục 2026-07-17:** Đã đối chiếu lại và xác nhận hai sai lệch runtime, hai guideline cũ và các fixture impossible state nêu trong báo cáo. P1 Claim hiện bắt buộc user `VENDOR`, `ACTIVE`, `phoneVerified=true` tại cả `start`, `verify-otp`, `submit`; P2 OwnershipHold cho phép field benign như `openingHours`, vẫn chặn core info và giữ đúng HTTP 403. WDP-27/WDP-28/WDP-32 cùng fixture seed đã được cập nhật. Regression tests mới đã chạy đỏ trước khi sửa và xanh sau khi sửa; toàn bộ API đạt **26/26 suite, 111/111 test**, production build đạt. Phần browser/simulator E2E và delivery provider bên ngoài vẫn chưa được bổ sung, nên giới hạn sign-off tương ứng ở mục 6 vẫn còn.

## 1. Nguồn đối chiếu và thứ tự ưu tiên

Đã đối chiếu các file sau:

1. [`docs/CONTEXT.md`](../docs/CONTEXT.md) — đặc tả nghiệp vụ hợp nhất, gồm state machine, happy flow, alternative/error flow và BR-xx.
2. [`docs/Campus-Local-Guide-Implementation-Guide.md`](../docs/Campus-Local-Guide-Implementation-Guide.md) — hướng dẫn triển khai hiện hành.
3. [`WDP301 - SRS.pdf`](../WDP301%20-%20SRS.pdf) — dùng để kiểm tra phạm vi use case cấp cao.
4. Code hiện tại trong `apps/api`, `apps/web`, `apps/mobile`.
5. Các file trong thư mục `guideline/`.

SRS PDF chỉ mô tả use case cấp cao và phần Functional Requirements ở cuối còn ở dạng khung/chưa có các rule Fxx/BR-xx chi tiết. Vì vậy, với các quy tắc ownership, hold, dispute và appeal, báo cáo dùng `docs/CONTEXT.md` và Implementation Guide làm nguồn chi tiết có tính quyết định.

## 2. Kết quả tổng quan

| Luồng | Kết quả | Nhận định |
|---|---|---|
| WDP-19 — Admin duyệt địa điểm | Đạt phần lõi | Phân quyền, approve/reject, trạng thái Location/LocationRequest, trust, audit và notification in-app hoạt động trên DB thật. |
| WDP-27 — Claim địa điểm | **Không đạt** | API không kiểm tra role `VENDOR` và `phoneVerified`; tài khoản `CUSTOMER` đăng nhập hợp lệ gọi `POST /api/claims/start` thành công (HTTP 201). |
| WDP-28 — Admin xét claim | Code đạt phần lõi; guideline sai một nhánh | Approve gán owner và ghi audit/notification/trust. Khi Location đã có owner khác, code hiện tại reject claim và chuyển hướng sang RequestAccess; guideline lại yêu cầu tạo Dispute trực tiếp. |
| WDP-30 — RequestAccess/transfer/hold | **Đạt một phần** | Grant, reject, appeal/escalate, hold 7 ngày và chống xử lý lặp hoạt động. Tuy nhiên code chặn mọi chỉnh sửa trong hold, kể cả `openingHours`, trái BR-56. |
| WDP-31 — Dispute | Đạt phần lõi | Kiểm tra participant/admin, evidence và TRANSFER trên API/DB thật đạt; KEEP/REVOKE được bao phủ bởi unit test. Admin transfer không tạo hold. |
| WDP-32 — Appeal | Đạt phần lõi | Một appeal/quyết định, giữ adverse state, ACCEPTED_TO_DISPUTE, audit/notification và chống resolve lặp đạt. UPHELD/OVERTURNED và rule Admin khác được bao phủ bởi unit test/static review. |

Không nên sign-off production cho nhóm ownership trước khi xử lý ít nhất hai mục P1/P2 ở phần 5.

## 3. Cách kiểm tra và bằng chứng chạy thực tế

### 3.1. Static review

Đã đọc controller, service, DTO, schema/index, guard và UI/API client liên quan đến toàn bộ sáu luồng. Các điểm được đối chiếu gồm:

- actor/role và authentication;
- điều kiện đầu vào, một pending slot và idempotency;
- state transition của LocationRequest, ClaimRequest, RequestAccess, Dispute, Appeal và Location;
- thay đổi owner và OwnershipHold;
- audit, trust event và notification;
- khả năng appeal, thời hạn 14 ngày và Admin khác người quyết định gốc;
- route/API contract giữa web/mobile và backend.

### 3.2. Kiểm tra build, typecheck và test

| Hạng mục | Kết quả |
|---|---|
| API production build | Đạt |
| API unit tests | **22/22 suite, 89/89 test đạt** |
| Web TypeScript (`tsc --noEmit`) | Đạt |
| Web admin UI contract tests | **6/6 đạt** |
| Web production build | Chưa kết luận được: Next.js không tải được Google Fonts `Inter` và `JetBrains Mono` do network/sandbox |
| Mobile TypeScript trên dependency tree sạch tạm thời | Đạt |
| Mobile targeted workflow tests | **6/6 suite, 18/18 test đạt** |
| Mobile full tests | **67/68 đạt**; một test fail ở `contribute-validation.spec.ts` về giờ mở cửa qua đêm, ngoài sáu luồng đang kiểm tra |

Dependency tree hiện có của `apps/mobile` không tự chạy được do `node_modules` cũ không nhất quán. Để phân biệt lỗi môi trường với lỗi source, typecheck và targeted tests đã được chạy trên bản sao tạm chỉ-đọc của source, nối với dependency tree sạch ở root. Không có source nào được thay đổi.

### 3.3. API + MongoDB end-to-end

API thật được chạy ở cổng 9999 với MongoDB local và bộ fixture có sẵn. Ma trận chính có 26 assertion nghiệp vụ: 24 đạt và 2 không đạt thực sự. Bốn assertion notification ban đầu báo fail do truy vấn `refId` bằng string trong khi DB lưu `ObjectId`; truy vấn lại đúng kiểu xác nhận notification tồn tại nên không tính là lỗi sản phẩm.

Các kiểm tra đã đạt trên API/DB thật:

- không token bị 401; non-admin truy cập queue admin bị 403;
- WDP-19 approve/reject cập nhật đồng thời request và Location, có audit, notification và trust khi approve; xử lý lặp bị 409;
- WDP-28 approve claim gán đúng owner, có audit/notification/trust; xử lý lặp bị 409;
- WDP-30 tạo request, owner xem inbox, GRANT chuyển owner và tạo hold 7 ngày; REJECT cho phép appeal; Admin accept appeal chuyển RequestAccess sang `ESCALATED` và tạo Dispute `OPEN`; appeal/resolve lặp bị 409;
- WDP-31 outsider không xem được dispute; participant thêm evidence; Admin TRANSFER chuyển owner, ghi audit, báo hai bên và không tạo hold;
- WDP-32 adverse state được giữ trong lúc pending; `ACCEPTED_TO_DISPUTE` tạo đúng liên kết RequestAccess/Dispute; xử lý lần hai bị 409.

Hai assertion runtime không đạt:

1. `CUSTOMER` gọi `POST /api/claims/start` nhận HTTP 201 thay vì 403.
2. Chủ mới đang trong hold sửa riêng `openingHours` nhận HTTP 400 với thông báo “Địa điểm đang bị tạm giữ, không thể chỉnh sửa”, trong khi BR-56 cho phép sửa benign field.

Sau kiểm tra, các record E2E có ID riêng đã được xóa và script fixture có sẵn được chạy lại để đưa DB local về trạng thái fixture ban đầu.

### 3.4. Web runtime smoke test

- `GET /admin/login`: HTTP 200, có nội dung đăng nhập.
- `GET /admin/location-requests`: HTTP 200.
- `GET /admin/claims`: HTTP 200.
- `GET /admin/disputes`: HTTP 200.
- `GET /admin/appeals`: HTTP 200.

Không thực hiện được thao tác click/login trên browser thật vì runtime trình duyệt tích hợp dừng với lỗi quyền Windows `EPERM` khi khởi tạo; `agent-browser` CLI cũng không được cài trong workspace. Do đó phần web chỉ được xác nhận qua HTTP shell, TypeScript và UI contract tests, **không được coi là visual/browser E2E hoàn chỉnh**.

## 4. Đánh giá theo từng luồng

### WDP-19 — Admin duyệt địa điểm

Nguồn guideline: [`WDP-19-admin-duyet-dia-diem.md`](WDP-19-admin-duyet-dia-diem.md)

Kết quả:

- guard admin và các boundary 401/403 đúng;
- approve đưa LocationRequest về `APPROVED`, Location về `PUBLISHED`;
- reject bắt buộc reason hợp lệ, giữ thông tin duplicate trong review note;
- approve có trust event, audit và notification in-app;
- request đã xử lý không được xử lý lần hai.

Giới hạn: notification hiện là `NotificationStub` ghi collection `notifications`; chưa xác nhận email/SMS/push delivery bên ngoài. Guide vẫn ghi audit trực tiếp vì “chưa có utility chung”, trong khi codebase hiện đã có [`AuditService`](../apps/api/src/common/services/audit.service.ts); phần mô tả phụ thuộc nên được cập nhật khi tài liệu được chỉnh sửa.

### WDP-27 — Vendor claim địa điểm

Nguồn guideline: [`WDP-27-claim-dia-diem.md`](WDP-27-claim-dia-diem.md)

Các phần đúng:

- chỉ Location `PUBLISHED` và chưa có owner mới qua điều kiện nghiệp vụ;
- dùng số điện thoại của listing nếu có để yêu cầu OTP;
- site code, geotag, timestamp và evidence được kiểm tra;
- submit chỉ tạo `ClaimRequest.PENDING`, không tự gán owner;
- một pending slot và xử lý session/OTP có unit test.

Sai lệch nghiêm trọng:

- controller chỉ dùng `AuthGuard('jwt-at')`, không có role guard;
- service nhận `vendorId` từ token nhưng không tải User để kiểm tra `role === VENDOR`, trạng thái Vendor hay `phoneVerified`;
- runtime xác nhận tài khoản `CUSTOMER` gọi start claim thành công.

Bằng chứng code: [`claim.controller.ts`](../apps/api/src/modules/claims/claim.controller.ts#L34) và [`claim.service.ts`](../apps/api/src/modules/claims/claim.service.ts#L53).

### WDP-28 — Admin xét claim

Nguồn guideline: [`WDP-28-admin-xet-claim.md`](WDP-28-admin-xet-claim.md)

Code hiện tại phù hợp với đặc tả hợp nhất:

- approve chỉ khi eligibility flags hợp lệ;
- owner được gán khi Location chưa có owner khác;
- reject giữ bản claim cũ và mở slot cho claim mới;
- request-evidence giữ claim ở `PENDING`;
- mọi quyết định có audit và notification; approve có trust event.

Guideline sai ở bảng transition: dòng mô tả “Location đã có owner khác → giữ Claim PENDING và tạo Dispute OPEN”. Quy tắc hiện hành trong `docs/CONTEXT.md` quy định Dispute chỉ được tạo từ RequestAccess bị owner reject/refuse và Vendor B appeal. Code hiện tại làm đúng: claim chuyển `REJECTED`, trả `redirectToRequestAccess: true` và không tạo Dispute.

Bằng chứng: [`WDP-28-admin-xet-claim.md`](WDP-28-admin-xet-claim.md#L103), [`docs/CONTEXT.md`](../docs/CONTEXT.md#L228), [`admin-claim.service.ts`](../apps/api/src/modules/admin-claims/admin-claim.service.ts#L128), [`admin-claim.service.ts`](../apps/api/src/modules/admin-claims/admin-claim.service.ts#L250).

### WDP-30 — RequestAccess, transfer và hold

Nguồn guideline: [`WDP-30-request-access-transfer-hold.md`](WDP-30-request-access-transfer-hold.md)

Các phần đạt:

- Location đã có owner mới tạo được RequestAccess;
- chặn self-request và một pending slot;
- owner có thể GRANT/REJECT;
- transfer do owner grant có hold 7 ngày;
- timeout 3 ngày dùng lazy-check và đường verify-to-takeover đã có unit coverage;
- reject cho phép appeal; chỉ accepted appeal mới mở Dispute;
- admin transfer từ Dispute không áp hold.

Sai lệch:

- BR-56 chỉ chặn hide/xóa sản phẩm/core info trong hold; các chỉnh sửa benign như giờ mở cửa phải được phép;
- [`vendor-locations.service.ts`](../apps/api/src/modules/vendor-locations/vendor-locations.service.ts#L103) kiểm tra hold trước khi phân loại field và trả lỗi cho toàn bộ update;
- runtime xác nhận update chỉ có `openingHours` cũng bị chặn.

Ngoài ra controller ánh xạ lỗi service 403 ở update thành `BadRequestException` nên client nhận HTTP 400, làm mất semantics “forbidden”. Đây là vấn đề contract phụ, mức ưu tiên thấp hơn lỗi blanket block.

### WDP-31 — Dispute

Nguồn guideline: [`WDP-31-dispute.md`](WDP-31-dispute.md)

Kết quả:

- nguồn hợp lệ là RequestAccess reject + appeal accepted;
- chỉ participant xem detail/thêm evidence; admin xem queue và resolve;
- evidence được tách đúng bên A/B;
- TRANSFER trên DB thật chuyển đúng owner B, không tạo hold, ghi audit và báo cả hai bên;
- KEEP/TRANSFER/REVOKE, stale-owner protection và owner canonical có unit tests đạt;
- resolve lặp bị chặn.

Giới hạn: KEEP và REVOKE chưa được lặp lại qua HTTP/DB trong phiên này; hai outcome đó được xác nhận ở service unit test và static state-transition review.

### WDP-32 — Appeal

Nguồn guideline: [`WDP-32-appeal.md`](WDP-32-appeal.md)

Kết quả:

- chỉ đối tượng bị ảnh hưởng được appeal;
- một appeal/quyết định, hạn 14 ngày;
- adverse state giữ nguyên khi `PENDING`;
- Admin gốc không được tự xét lại các quyết định admin-originated;
- `ACCEPTED_TO_DISPUTE` chỉ áp cho RequestAccess rejection và tạo Dispute;
- `OVERTURNED` gọi restore theo loại nguồn; `UPHELD` giữ trạng thái gốc;
- audit và notification có trên mọi outcome; resolve lặp bị chặn.

Guideline ghi user routes dùng `AuthGuard('jwt-at')`, nhưng code hiện tại dùng `jwt-appeal-access` cho submit/mine/detail để tài khoản bị ban vẫn có đường kháng cáo. Đây là thay đổi hợp lý theo BR-63 nhưng tài liệu cần cập nhật: [`WDP-32-appeal.md`](WDP-32-appeal.md#L130), [`appeal.controller.ts`](../apps/api/src/modules/appeals/appeal.controller.ts#L54).

## 5. Danh sách phát hiện theo mức ưu tiên

### P1 — Claim thiếu authorization theo role và trạng thái xác minh

- Ảnh hưởng: CUSTOMER hoặc tài khoản không đủ điều kiện có thể khởi tạo quy trình chiếm quyền sở hữu; đây là boundary bảo mật của ownership.
- Bằng chứng runtime: CUSTOMER nhận HTTP 201 ở `/api/claims/start`.
- Bằng chứng code: controller chỉ kiểm tra access token; service không xác minh User/Vendor profile/phoneVerified.
- Phạm vi ảnh hưởng: WDP-27 và dữ liệu chờ WDP-28.

### P2 — OwnershipHold chặn quá rộng

- Ảnh hưởng: chủ mới không thể sửa cả dữ liệu benign trong 7 ngày, trái UX và BR-56.
- Bằng chứng runtime: update riêng `openingHours` nhận HTTP 400.
- Bằng chứng code: hold check trả lỗi trước khi phân loại field update.
- Phạm vi ảnh hưởng: WDP-30 và màn quản lý Location của Vendor.

### P2 — Guideline WDP-28 mô tả sai nguồn tạo Dispute

- Ảnh hưởng: người triển khai theo guide có thể tạo đường tắt Claim → Dispute, phá invariant BR-53 và trùng với luồng RequestAccess/Appeal.
- Code hiện tại đúng; cần sửa tài liệu, không sửa service theo guide cũ.

### P3 — Guideline WDP-32 ghi guard cũ

- Ảnh hưởng: người refactor theo guide có thể vô tình khóa đường appeal của tài khoản bị ban.
- Code `jwt-appeal-access` phù hợp hơn với yêu cầu mọi quyết định bất lợi có đường kháng cáo.

### P3 — Fixture có state không thể sinh qua service

Trong fixture hiện hành có các tổ hợp cần rà soát:

- Appeal loại `LOCATION_REJECTED` nhưng status `ACCEPTED_TO_DISPUTE`; service chỉ cho outcome này với `REQUEST_ACCESS_REJECTED`.
- Một RequestAccess fixture có thể đồng thời liên quan appeal pending và dispute open; theo state machine, Dispute chỉ xuất hiện sau appeal accepted và RequestAccess phải là `ESCALATED`.
- Một số LocationRequest pending thiếu `locationId`, trong khi admin service yêu cầu Location liên kết để approve/reject.

Các fixture này có thể làm manual/demo test cho kết quả không đại diện dữ liệu hợp lệ từ API.

### P3 — Notification mới được xác nhận ở mức in-app persistence

Sáu luồng vẫn inject `NotificationPort` bằng `NotificationStub`. E2E đã xác nhận document trong `notifications`, chưa xác nhận email/SMS/push delivery thực. SMS OTP ở Claim cũng dùng seam riêng; không nên diễn giải test DB là delivery E2E bên ngoài.

## 6. Coverage còn thiếu để gọi là browser E2E hoàn chỉnh

Các phần sau chưa được chứng minh bằng browser automation trong phiên này:

- login Admin và thao tác nút approve/reject/request-evidence trên bốn queue web;
- hiển thị lỗi/empty/loading state thực tế;
- responsive/visual regression;
- mobile UI thao tác claim/request-access/dispute/appeal trên simulator;
- delivery thật của OTP và notification ngoài ứng dụng;
- transaction/retry behavior nếu trust, audit hoặc notification fail giữa chừng.

Để sign-off production, nên chạy lại browser/simulator E2E trong môi trường có browser runtime hoạt động, MongoDB test cô lập và provider notification/OTP test double quan sát được.

## 7. Kết luận sign-off

Trạng thái đề xuất: **NO-GO cho sign-off toàn bộ ownership workflows**.

Điều kiện tối thiểu để chuyển sang GO:

1. Bổ sung và kiểm thử authorization WDP-27: active, role Vendor, phone verified và điều kiện Vendor profile đã thống nhất.
2. Điều chỉnh enforcement OwnershipHold để chỉ chặn các thao tác BR-56 quy định; bổ sung contract test cho benign/core/destructive field.
3. Cập nhật WDP-28 để xóa nhánh Claim → Dispute trực tiếp và mô tả đúng redirect sang RequestAccess.
4. Cập nhật WDP-32 về `jwt-appeal-access` và rà lại fixture impossible states.
5. Chạy browser E2E thật cho các queue admin và mobile/simulator smoke test sau khi môi trường trình duyệt khả dụng.

Ngoài file báo cáo này, quá trình kiểm tra không sửa mã nguồn ứng dụng. Các thay đổi không liên quan đã tồn tại trong working tree được giữ nguyên.
