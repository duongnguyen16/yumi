# Campus Local Guide — Full Specification (Consolidated, Defense-ready)

> **Vai trò:** Nguồn chuẩn duy nhất để xây toàn bộ dự án. Gộp toàn bộ: nền tảng, dữ liệu/trạng thái, **flow nghiệp vụ nặng (chi tiết MF/AF/EF)**, flow nhẹ, và catalog rule.
> **Mức:** Business / functional. **Không** code, schema SQL, API contract.
> **Thay thế:** `Campus-Local-Guide-Specs-v2.md`, `Campus-Local-Guide-UseCase-Specs.md`, `Campus-Local-Guide-Master-Spec.md` (đã gộp hết vào đây).
> **Quy ước:** MF = Main Flow · AF = Alternative Flow · EF = Exception Flow · BR = Business Rule. Priority: MUST / SHOULD / COULD.

---

# PHẦN I — NỀN TẢNG

## 1. Tổng quan & 4 nguyên tắc xương sống

Ứng dụng hyperlocal tổng hợp địa điểm quanh khu sinh viên Hòa Lạc. Customer đóng góp + đánh giá; Vendor xác minh & quản lý địa điểm sở hữu; Admin kiểm duyệt report, xử kháng cáo và xử tranh chấp ownership.

1. **Tạo dữ liệu ≠ Sở hữu dữ liệu.** Ai cũng _đóng góp_ được địa điểm (kể cả từ xa) — đó chỉ là dữ liệu cộng đồng chưa xác minh, **không trao quyền**. Quyền _sở hữu/quản lý_ chỉ đến từ bằng chứng kiểm soát vật lý tại chỗ.
2. **Xác minh = kiểm soát vật lý, không phải pháp nhân.** On-site proof geotagged là chuẩn phổ quát; giấy phép kinh doanh chỉ là bằng chứng bổ trợ tùy chọn.
3. **GPS là một kênh, không phải duy nhất đối với dữ liệu địa điểm.** Luôn kết hợp fused location + chỉnh tay + reverse geocoding + kiểm duyệt người. Riêng **tạo mới review** không dùng pin chỉnh tay và không dùng ảnh thay thế: phải có GPS/fused location hợp lệ cách địa điểm không quá **100m**.
4. **Mọi thứ đảo ngược được + có vết.** Soft delete, audit log, report, revoke, dispute, **kháng cáo** — không hành động phá hoại nào là vĩnh viễn hoặc ẩn danh.

- **Actors:** Customer · Vendor · Admin.
- **External systems:** Goong Maps API · Email/SMS Service · Supabase Storage.
- **Không có:** AI actor · community posts (gộp vào review) · bán hàng · crowd-voting · merge engine (Phase 2).
- **Phạm vi địa lý:** giới hạn bán kính quanh Hòa Lạc.

## 2. Mô hình 3 tầng tin cậy (xương sống chống gian lận)

| Tầng                       | Trạng thái               | Ai làm được                         | Bằng chứng                                   | Quyền nhận được                                                         |
| -------------------------- | ------------------------ | ----------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| **A — Đề xuất**            | SUBMITTED / suggest-edit | Mọi user login, **từ xa cũng được** | Không                                        | **Không quyền gì.** Chờ kiểm duyệt.                                     |
| **B — Cộng đồng đã duyệt** | PUBLISHED, **no-owner**  | Admin duyệt / TRUSTED auto-publish  | Đã qua kiểm duyệt + dedup                    | Hiển thị công khai; **không ai sở hữu**; cộng đồng sửa qua suggest-edit |
| **C — Đã xác minh chủ**    | PUBLISHED, **owned**     | Customer/Vendor đã xác minh SĐT và chứng minh kiểm soát vật lý | **SĐT verified + OTP listing (nếu có) + on-site proof** (giấy phép optional) | Toàn quyền quản lý info + badge "Đã xác minh"; Customer được chuyển thành Vendor |

**Hệ quả cốt lõi:** tạo dữ liệu (tầng A) rẻ và **không có payoff** cho kẻ gian; thứ đáng gian lận (tầng C) khóa sau **hiện diện vật lý** — điều người ngồi nhà không giả được.

## 3. Catalog toàn bộ tính năng

**Customer:** C1 Auth/hồ sơ · C2 Tìm kiếm & duyệt (map+list, filter category/sub/tag/khu vực) · C3 Xem chi tiết · C4 Đóng góp địa điểm mới · C5 Đề xuất sửa (suggest-edit) · C6 Review (rating+text+ảnh; tạo mới trong bán kính 100m) · C7 Bookmark · C8 Share · C9 Report kèm evidence (gồm "chủ sai") · C10 Top trending · C11 Tích lũy uy tín (trust) · C12 Sau khi xác minh SĐT, đăng ký địa điểm mới có sở hữu hoặc claim địa điểm chưa có chủ.

**Vendor:** V1 Đăng ký (verify SĐT) · V2 Claim địa điểm · V3 Đăng ký địa điểm mới (on-site proof → auto-own) · V4 Request-access · V5 Quản lý nhiều địa điểm · V6 Quản lý info (đổi tên/địa chỉ → duyệt lại) · V7 Quản lý sản phẩm (info-only) · V8 Reply review · V9 Duyệt suggest-edit cho địa điểm sở hữu · V10 Thống kê cơ bản · V11 Release ownership.

**Admin:** A1 Duyệt địa điểm · A2 Xét claim · A3 Xử tranh chấp từ request-access appeal · A4 Xử report · A5 Xác nhận trùng/merge (defer) · A6 Quản lý user (ban/warn/role/trust) · A7 Quản lý category/tag · A8 Duyệt suggest-edit cho địa điểm cộng đồng · A9 Dashboard + audit · A10 **Xử lý kháng cáo**.

**Hệ thống:** M1 Duplicate detection · M2 Trust engine · M3 Notification · M4 Location handling (fused location + pin) · M5 Geographic scoping.

## 4. Actors

- **Customer:** sinh viên — xem, đóng góp, đề xuất sửa, đánh giá, report, kháng cáo; sau khi xác minh SĐT được đăng ký sở hữu/claim và sẽ chuyển thành Vendor khi Admin duyệt quyền sở hữu.
- **Vendor:** chủ địa điểm — claim/đăng ký, quản lý, request-access, duyệt suggest-edit, kháng cáo.
- **Admin:** kiểm duyệt, xét claim, xử tranh chấp/report/kháng cáo, quản lý hệ thống.

---

# PHẦN II — DỮ LIỆU & TRẠNG THÁI

## 5. Domain Objects (góc nhìn nghiệp vụ, không phải schema)

| Đối tượng                    | Thuộc tính nghiệp vụ chính                                                                                                                    | Trạng thái                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **User**                     | email, mật khẩu (mã hóa), vai trò, tên, avatar, SĐT, cờ SĐT-verified, trust_score, trust_level, trạng thái                                    | ACTIVE/WARNED/BANNED                         |
| **Location**                 | tên, mô tả, tọa độ + accuracy, địa chỉ, ảnh (1–5), nguồn (Customer/Vendor), chủ (có/không), cờ nghi-trùng, cờ confirmed-duplicate, view_count | xem 6.1; ownership 6.2                       |
| **Category/SubCategory/Tag** | tên, mô tả, cờ visibility                                                                                                                     | —                                            |
| **Review**                   | rating (1–5), nội dung, ảnh (0–3), người viết, địa điểm, **vị trí thiết bị khi tạo mới** (GPS/fused hợp lệ, cách địa điểm ≤100m)                | PUBLISHED/DELETED/REMOVED_BY_ADMIN; ≤1 Reply |
| **Reply**                    | nội dung, Vendor, thuộc 1 Review                                                                                                              | 1/review                                     |
| **Product**                  | tên, ảnh, mô tả, giá (optional)+disclaimer                                                                                                    | —                                            |
| **Claim**                    | người yêu cầu (Customer/Vendor), địa điểm, trạng thái xác minh SĐT/OTP, on-site proof, giấy phép (optional)                                    | xem 6.4                                      |
| **RequestAccess**            | địa điểm, bên yêu cầu, chủ hiện tại, bằng chứng, hạn phản hồi                                                                                 | xem 6.5                                      |
| **Dispute**                  | địa điểm, request-access bị reject/refuse, chủ hiện tại A, Vendor yêu cầu B, bằng chứng từng bên, quyết định                                  | xem 6.6                                      |
| **Appeal**                   | đối tượng bị xử lý, người kháng, bằng chứng bổ sung, quyết định gốc, loại appeal (request-access/report/admin-action/khác)                    | xem 6.7                                      |
| **EditSuggestion**           | địa điểm, người đề xuất, trường sửa, giá trị mới, định tuyến                                                                                  | PENDING/APPLIED/DISCARDED                    |
| **OwnershipHold**            | địa điểm, chủ mới, hạn hold, action bị chặn                                                                                                   | ACTIVE/EXPIRED                               |
| **Report**                   | người báo, đối tượng, loại, mô tả, **evidence**, vendor bị ảnh hưởng nếu là "chủ sai", kết quả, liên kết appeal nếu có                       | PENDING/UNDER_REVIEW/APPROVED/REJECTED/APPEALED/RESOLVED |
| **Bookmark**                 | user, địa điểm                                                                                                                                | 1 cặp/người                                  |
| **Notification**             | người nhận, loại, nội dung, đã đọc                                                                                                            | —                                            |
| **AuditLog**                 | actor (Admin), hành động, đối tượng, thời điểm, lý do                                                                                         | —                                            |
| **TrustEvent**               | user, loại, điểm +/-, thời điểm                                                                                                               | —                                            |

## 6. State Machines

**6.1 Location.status**

```
SUBMITTED --approve--> PUBLISHED --hide--> HIDDEN --restore--> PUBLISHED
SUBMITTED --reject--> REJECTED
PUBLISHED --đổi tên/địa chỉ--> PENDING_RE_APPROVAL --approve--> PUBLISHED
PUBLISHED --confirmed duplicate--> HIDDEN
(bất kỳ) --soft delete--> DELETED
```

**6.2 Ownership**

```
no-owner --claim approved / Customer hoặc Vendor đăng ký mới có sở hữu / request-access grant/timeout hoặc dispute transfer--> owned
owned --Vendor release / Admin revoke--> no-owner
```

**6.3 Review:** `PUBLISHED → DELETED (tác giả) / REMOVED_BY_ADMIN`
**6.4 Claim:** `PENDING → APPROVED → RELEASED / REVOKED ; PENDING → REJECTED`
**6.5 RequestAccess:** `PENDING → GRANTED / REJECTED / EXPIRED → AUTO_GRANTED / ESCALATED` (`ESCALATED` chỉ khi B appeal sau khi A reject/refuse)
**6.6 Dispute:** `OPEN → RESOLVED_KEEP / RESOLVED_TRANSFER / RESOLVED_REVOKE` (chỉ mở từ RequestAccess REJECTED + B appeal)
**6.7 Appeal:** `PENDING → ACCEPTED_TO_DISPUTE / OVERTURNED (khôi phục) / UPHELD (giữ quyết định gốc)`
**6.8 User:** `ACTIVE → WARNED → BANNED → (unban) ACTIVE`
**6.9 trust_level:** `RESTRICTED (<0) | NEW (0..29) | TRUSTED (≥30), T=30`
**6.10 User.role:** `CUSTOMER --Admin approve đăng ký sở hữu/claim--> VENDOR` (không đổi role khi reject; Vendor hiện hữu giữ nguyên)

---

# PHẦN III — FLOW NGHIỆP VỤ NẶNG (chi tiết)

> Đây là các luồng nhiều bước / nhiều actor / nhiều trạng thái. Viết đầy đủ để build và defense không hở.

## HF-1 — Tạo địa điểm cộng đồng (Customer)

- **Actor:** Customer · phụ: M1, M4, Admin (duyệt). **Priority:** MUST. **Tầng kết quả:** B (no-owner).
- **Trigger:** bấm "Đóng góp địa điểm". **Pre:** login; trust_level ≠ RESTRICTED. **Post:** Location SUBMITTED vào hàng đợi.
- **States:** Location SUBMITTED → PUBLISHED/REJECTED.

**MF**

1. Nhập tên, mô tả, category/subcategory + tag.
2. **Ghim vị trí (M4):** lấy fused location + accuracy; **ghi khoảng cách pin↔thiết bị** (BR-59).
3. Upload ảnh 1–5 (ràng buộc ở §9 Validation).
4. **M1 dedup** (BR-13): so tên + Haversine.
5. Xác nhận → tạo **SUBMITTED** → vào HF Admin duyệt (A1).
6. Admin approve → **PUBLISHED, no-owner**; **M2** +15 cho Customer; **M3** "đã duyệt".

**AF**

- **AF1.1** Nghi trùng (>0.8 AND <50m): cảnh báo → Customer chọn "không trùng" (gắn cờ, tiếp) / "xem địa điểm gốc" (mở chi tiết X).
- **AF1.2** Accuracy > 50m → **bắt kéo pin chỉnh tay** trước khi tiếp (BR-42).
- **AF1.3** TRUSTED → fast-track/auto-publish (BR-25) — vẫn tầng B, vẫn no-owner.
- **AF1.4** Admin reject + lý do → **REJECTED**; **M3** báo lý do (+ link gốc nếu trùng); **M2** −10; Customer sửa & gửi lại; có thể **kháng cáo** (HF-6).

**EF**

- **EF1.1** Thiếu trường/ảnh → chặn submit. **EF1.2** Vượt 3 địa điểm/ngày → chặn (BR-22). **EF1.3** Upload ảnh lỗi → giữ data đã nhập. **EF1.4** RESTRICTED → chặn submit (BR-26).
- **EF1.5** Cờ "pin xa thiết bị" + tài khoản mới + tên nhạy cảm → Admin reject sớm.

## HF-2 — Đăng ký địa điểm mới có sở hữu (Customer/Vendor, auto-own)

- **Actor:** Customer hoặc Vendor · phụ: M1, M4, Admin. **Priority:** SHOULD. **Tầng kết quả:** C (owned).
- **Trigger:** "Đăng ký địa điểm mới có sở hữu". **Pre:** Customer/Vendor login + SĐT tài khoản đã verified. **Post:** Location SUBMITTED kèm ownership request → approve → auto-own; nếu requester còn là Customer thì chuyển role thành Vendor.

**MF**

1. Nhập info + ghim vị trí + ảnh (như HF-1 bước 1–3).
2. **M1 dedup.**
3. **Cung cấp on-site proof** (mục HF-3 / P verification) — **bắt buộc** để được auto-own (BR-60).
4. Xác nhận → **SUBMITTED** kèm requester và bằng chứng sở hữu → Admin duyệt.
5. Admin approve → trong cùng một giao dịch: **PUBLISHED + auto-gán owner = requester** (tầng C), badge xác minh; nếu requester có role Customer thì đổi thành **Vendor** (BR-70); **M3** báo.

**AF**

- **AF2.1** Trùng địa điểm chưa chủ → gợi ý dùng **Claim (HF-3)** thay vì tạo mới.
- **AF2.2** Requester **không** nộp on-site proof → chỉ tạo ở **tầng B (no-owner)**, không đổi role; muốn sở hữu phải claim sau (BR-60).

**EF**

- **EF2.1** Thiếu trường/ảnh → chặn. **EF2.2** SĐT tài khoản chưa verified → yêu cầu xác minh trước khi gửi ownership request. **EF2.3** Accuracy kém → kéo pin (BR-42). **EF2.4** On-site proof không đạt → không auto-own, hạ về tầng B và không đổi role.

## HF-3 — Claim địa điểm + Xác minh

- **Actor:** Customer hoặc Vendor (claim), Admin (xét) · phụ: SMS (OTP), Storage. **Priority:** MUST.
- **Trigger:** "Claim địa điểm" trên địa điểm PUBLISHED & no-owner. **Pre:** Customer/Vendor login + SĐT tài khoản đã verified; địa điểm no-owner; **không** có claim/request-access PENDING (BR-61). **Post:** owner gán requester; nếu requester là Customer thì chuyển role thành Vendor (APPROVED) / giữ nguyên role và không gán owner (REJECTED).
- **States:** Claim PENDING → APPROVED/REJECTED.

**Bằng chứng (xác minh):**

- **Bắt buộc:** (1) **OTP về SĐT của listing** — người lạ không nhận được OTP của quán; (2) **On-site proof**: ảnh/video geotagged tại địa điểm, **biển hiệu + mã hệ thống cấp + timestamp** (3 yếu tố độc lập: vị trí + thời gian + mã).
- **Tùy chọn:** (3) **Giấy phép kinh doanh** — ai có thì nộp, đánh dấu bằng chứng mạnh → fast-track. Không bắt buộc (quán cóc vẫn claim được bằng (1)+(2)).

**MF**

1. Customer/Vendor đã xác minh SĐT mở địa điểm no-owner → "Claim".
2. Form: đại diện, SĐT (auto-fill từ listing nếu có), email.
3. Verify **OTP** về SĐT listing (BR-02, BR-03).
4. Upload **on-site proof** (BR-14).
5. (tùy chọn) upload giấy phép (BR-15).
6. Cam kết → submit → **Claim PENDING** (BR-61).
7. Admin xem trạng thái OTP + on-site proof (+ giấy phép) → đối chiếu với địa điểm.
8. Approve **chỉ khi** SĐT tài khoản đã verified, OTP listing đạt yêu cầu và proof khớp (BR-45) → trong cùng một giao dịch set **owner = requester**, đổi role Customer → **Vendor** nếu cần (BR-70), gắn badge xác minh, đặt **APPROVED**; **M3** báo requester.

**AF**

- **AF3.1** Listing **không có SĐT** → bỏ bước 3; dựa hoàn toàn on-site proof + Admin soi kỹ + khuyến khích giấy phép.
- **AF3.2** Có giấy phép → fast-track.
- **AF3.3** Admin **yêu cầu bổ sung** thay vì reject hẳn.
- **AF3.4** Reject + lý do → **REJECTED**, không gán owner và không đổi role; **M3** báo; gửi lại = **claim mới, không ghi đè** (BR-46); requester có thể **kháng cáo** (HF-6).

**EF**

- **EF3.1** Địa điểm **đã có chủ** khi mở/xét claim → chặn claim; requester đã là Vendor được chuyển hướng **Request-Access (HF-4)**, requester còn là Customer chỉ được xem/report "chủ sai" nếu có bằng chứng.
- **EF3.2** OTP sai/hết hạn → thử lại; quá số lần → tạm khóa (BR-03).
- **EF3.3** Thiếu on-site proof → chặn submit (BR-14).
- **EF3.4** SĐT tài khoản chưa verified → yêu cầu xác minh trước khi gửi claim (BR-02).
- **EF3.5** Đang có claim/request-access PENDING → chặn (BR-61).
- **EF3.6** GPS yếu → geotag lệch → Admin dựa **mã + timestamp + biển hiệu** thay vì chỉ tọa độ.

## HF-4 — Request-Access + Chuyển quyền

- **Actor:** Vendor B (yêu cầu), Vendor A (chủ hiện tại), Admin (escalation). **Priority:** SHOULD (MVP, lazy-check).
- **Trigger:** "Yêu cầu quyền truy cập" trên địa điểm **đã có chủ**. **Pre:** B login + SĐT verified; **không** có request-access PENDING khác (BR-61). **Post:** giữ A / chuyển B / mở dispute nếu A reject và B appeal.
- **States:** RequestAccess PENDING → GRANTED/REJECTED/EXPIRED→AUTO_GRANTED/ESCALATED; OwnershipHold ACTIVE/EXPIRED.

**MF**

1. B mở địa điểm owned → "Yêu cầu quyền truy cập".
2. B cung cấp **bằng chứng kiểm soát vật lý** (OTP listing + on-site proof) như claim.
3. Tạo **RequestAccess PENDING** (BR-61); **M3** báo A kèm **hạn 3 ngày**.
4. A phản hồi trong 3 ngày:
   - **Grant** → chuyển owner sang B; nếu cấp không qua Admin → áp **OwnershipHold** (BR-56); **GRANTED**.
   - **Reject/Refuse** → B có quyền **kháng nghị** → nếu B appeal thì **ESCALATED** → Dispute (HF-5). Đây là trigger duy nhất tạo tranh chấp ownership giữa 2 bên.
5. A **im lặng > 3 ngày** → **lazy-check** (tính lúc B quay lại bấm "Xác minh để nhận quyền", **không cần cron**) → **EXPIRED** → B verify đạt → **AUTO_GRANTED** + **OwnershipHold bắt buộc** (BR-56).
6. Mọi nhánh: **M3** báo các bên + audit (BR-43).

**AF**

- **AF4.1** A grant ngay → chuyển nhanh.
- **AF4.2** B bằng chứng yếu khi verify-to-claim sau timeout → từ chối auto-grant; B có thể kháng cáo quyết định từ chối theo HF-6, nhưng không mở Dispute nếu không có A reject/refuse request-access.

**EF**

- **EF4.1** Đã có request-access/claim PENDING → chặn (BR-61).
- **EF4.2** B chưa verify SĐT → yêu cầu verify trước.
- **EF4.3** Trong **OwnershipHold**, B làm hành động bị chặn (ẩn địa điểm / xóa hàng loạt sản phẩm / đổi core-info) → chặn, báo "đang trong thời gian hold" (BR-56).

## HF-5 — Tranh chấp ownership (Dispute)

- **Actor:** Admin · các bên A, B. **Priority:** MUST.
- **Trigger:** chỉ từ HF-4 khi **A reject/refuse RequestAccess** và **B nộp kháng cáo** trong hạn. **Pre:** tồn tại RequestAccess REJECTED/ESCALATED. **Post:** keep/transfer/revoke.
- **States:** Dispute OPEN → RESOLVED_KEEP/TRANSFER/REVOKE.

**MF**

1. Admin mở hồ sơ tranh chấp giữa **chủ hiện tại A** và **Vendor yêu cầu B**, xem **bằng chứng các bên** (OTP, on-site proof, giấy phép, lịch sử).
2. Đối chiếu mức mạnh — **kiểm soát vật lý > giấy phép** (BR-53).
3. Quyết định: **KEEP** (giữ A) / **TRANSFER** (set B) / **REVOKE** (no-owner, mở claim — BR-54).
4. **M3** báo các bên + audit.

**AF**

- **AF5.1** Yêu cầu bổ sung bằng chứng (tạm hoãn).
- **AF5.2** Trong quá trình xử dispute, nếu phát hiện owner giả mạo → **REVOKE** + ban (A6) + trừ trust.
- **AF5.3** Transfer do Admin trực tiếp quyết → **KHÔNG** áp hold (BR-56).

**EF**

- **EF5.1** Cả hai bằng chứng yếu → giữ **no-owner** (không trao ai).
- **EF5.2** Report "chủ sai" hoặc Admin tự phát hiện giả mạo không mở HF-5 trực tiếp; chúng đi qua xử report/admin action và vendor bị ảnh hưởng có quyền kháng cáo theo HF-6.

## HF-5A — Ownership review từ report/admin-detect (không phải Dispute)

- **Actor:** Admin, reporter, vendor bị ảnh hưởng. **Priority:** SHOULD.
- **Trigger:** user report "chủ sai" hoặc Admin tự phát hiện dấu hiệu giả mạo. **Pre:** có report/admin action với evidence hoặc lý do kiểm tra. **Post:** dismiss/approve report/revoke owner; vendor có quyền appeal quyết định bất lợi.

**MF**

1. Admin mở report/admin action, xem **evidence** do reporter nộp hoặc bằng chứng nội bộ Admin thu thập.
2. Admin đối chiếu với dữ liệu claim/request-access/ownership hiện có, audit log và proof đã lưu.
3. Quyết định:
   - **DISMISS/REJECT_REPORT** — report sai/thiếu căn cứ; có thể trừ trust nếu vu cáo (BR-27).
   - **APPROVE_REPORT_NO_REVOKE** — xác nhận có vấn đề nhưng yêu cầu bổ sung/chỉnh sửa trước khi thu hồi.
   - **REVOKE_OWNER** — gỡ owner, đưa địa điểm về community-owned/no-owner, mở claim lại (BR-54); cân nhắc ban/cảnh cáo nếu giả mạo.
4. Nếu report được thông qua hoặc owner bị revoke, **M3** báo vendor bị ảnh hưởng kèm nút **Kháng cáo** (HF-6).
5. Lưu kết quả vào **Report** hoặc **AuditLog**; không tạo Dispute trừ khi nguồn gốc là request-access bị reject/refuse và B appeal.

## HF-6 — Kháng cáo (Appeal)

- **Actor:** Vendor/Customer (người kháng), Admin (xét — **khác** người quyết gốc khi có ≥2 Admin). **Priority:** SHOULD.
- **Áp cho:** request-access bị owner reject/refuse · confirmed-duplicate→ẩn · reject claim · reject địa điểm submit · report "chủ sai" được Admin thông qua · revoke ownership do report/admin-detect · gỡ review · ban/cảnh cáo.
- **Trigger:** nhận quyết định bất lợi → bấm "Kháng cáo". **Pre:** quyết định tồn tại; trong hạn N ngày (BR-65); **chưa** có appeal cho quyết định này (BR-64). **Post:** ACCEPTED_TO_DISPUTE nếu là request-access appeal hợp lệ; OVERTURNED (khôi phục) / UPHELD (giữ quyết định gốc) với các quyết định Admin.
- **States:** Appeal PENDING → ACCEPTED_TO_DISPUTE / OVERTURNED / UPHELD.

**MF (trọng tâm: bị đánh trùng → ẩn → Vendor kháng cáo)**

1. Admin xác nhận trùng (BR-58) → địa điểm **HIDDEN**; **M3** báo owner/creator kèm nút "Kháng cáo".
2. Người kháng nộp kháng cáo + **bằng chứng: ảnh biển hiệu cố định** chứng minh độc lập (khác tên/biển) → **Appeal PENDING**.
3. Địa điểm **vẫn HIDDEN** trong lúc chờ (BR-66) — chống lạm dụng kháng cáo để giữ địa điểm trùng hiển thị.
4. Admin (khác người quyết gốc — BR-67) xét:
   - **OVERTURNED** → khôi phục **PUBLISHED**, gỡ cờ duplicate (áp **BR-62**: nhiều DN cùng địa chỉ được nếu khác tên + biển riêng).
   - **UPHELD** → giữ HIDDEN; tiến hành merge (Phase 2) / soft-delete bản phụ.
5. **M3** báo kết quả + audit.

**AF (các loại quyết định khác)**

- **AF6.1** Kháng request-access bị owner reject/refuse → ACCEPTED_TO_DISPUTE: chuyển RequestAccess sang ESCALATED và mở HF-5.
- **AF6.2** Kháng reject claim → nộp bằng chứng bổ sung → OVERTURNED: cho tạo claim mới ưu tiên / UPHELD: giữ.
- **AF6.3** Kháng report "chủ sai" được Admin thông qua → OVERTURNED: bác report, khôi phục/giữ owner; UPHELD: giữ quyết định xử report.
- **AF6.4** Kháng revoke ownership do report/admin-detect → OVERTURNED: khôi phục owner / UPHELD: giữ no-owner.
- **AF6.5** Kháng ban → OVERTURNED: gỡ ban + phục hồi trust / UPHELD: giữ ban.
- **AF6.6** Kháng gỡ review → OVERTURNED: khôi phục review / UPHELD: giữ removed.

**EF**

- **EF6.1** Quá hạn N ngày → không nhận (BR-65).
- **EF6.2** Đã có appeal cho quyết định này → chặn (BR-64).
- **EF6.3** Đã UPHELD mà kháng lại không có bằng chứng mới đáng kể → từ chối (BR-64).

## HF-7 — Trùng lặp & Hợp nhất (Duplicate & Merge)

- **Actor:** M1 (tự động), Admin, Customer (gắn cờ qua suggest-edit), Vendor (kháng cáo). **Priority:** detection MUST; **merge DEFER Phase 2**.
- **States:** Location: cờ nghi-trùng (M1) ≠ confirmed-duplicate (Admin) (BR-58).

**MF (detection + confirm — MVP)**

1. Lúc tạo (HF-1/HF-2): M1 so similarity + Haversine; >0.8 AND <50m → **nghi-trùng** (cảnh báo, **không ẩn** — BR-13, BR-58).
2. Customer gắn cờ "trùng lặp" qua suggest-edit (HF-8) → vào luồng này.
3. Admin xem cặp nghi trùng → đúng trùng → **confirmed-duplicate** → bản phụ **HIDDEN**.
4. **M3** báo owner/creator bản phụ kèm "Kháng cáo" (→ HF-6).

**AF (Merge — Phase 2, mô tả để defense)**

- **AF7.1** Hai địa điểm cùng DN: Admin merge → giữ địa điểm chính, **cộng dồn view_count**, **chuyển toàn bộ review** từ phụ sang chính; **cảnh báo trước** rằng **reply của Vendor ở phụ có thể mất**; phụ bị soft-delete/đánh bỏ.
- **MVP KHÔNG merge** — chỉ confirmed-duplicate → hide.

**Rule đặc thù**

- **BR-62:** nhiều DN cùng địa chỉ vật lý → chấp nhận nếu **khác tên + biển hiệu riêng** (đây là tiêu chí OVERTURNED khi kháng cáo trùng). Một DN nhiều dịch vụ → gộp **một địa điểm**.

## HF-8 — Đề xuất sửa (Suggest-edit) + Routing

- **Actor:** Customer (đề xuất), Vendor (duyệt cho địa điểm sở hữu), Admin (duyệt cho cộng đồng). **Priority:** SHOULD.
- **States:** EditSuggestion PENDING → APPLIED/DISCARDED.

**MF**

1. Customer mở địa điểm → "Đề xuất sửa".
2. Chọn trường: tên, giờ mở, SĐT, **kéo pin tọa độ**, thuộc tính (wifi/đỗ xe), hoặc gắn cờ trạng thái: "đã đóng cửa vĩnh viễn" / "không tồn tại" / "trùng lặp".
3. Submit → **EditSuggestion PENDING**.
4. **Routing (BR-57):**
   - Địa điểm **claimed** → **Vendor inbox** (V9): **Apply** (cập nhật) / **Discard**.
   - Địa điểm **no-owner** → **Admin queue** (A8): Apply / Discard.
5. Apply → cập nhật info; Discard → bỏ; **M3** báo người đề xuất (tùy chọn).

**AF**

- **AF8.1** "Đã đóng cửa" được Apply → đánh dấu địa điểm closed/hidden.
- **AF8.2** "Trùng lặp" → đưa vào luồng duplicate (HF-7) cho Admin xác nhận.
- **AF8.3** **Không crowd-voting** (BR-57) — chỉ owner/Admin quyết.

**EF**

- **EF8.1** Apply trường nhạy cảm (đổi tên/địa chỉ) trên địa điểm claimed → vào **PENDING_RE_APPROVAL** (BR-30).
- **EF8.2** Spam đề xuất từ RESTRICTED → siết.

## HF-9 — Trust engine (M2)

- **Trigger:** khi HF Admin duyệt / xử report / dispute / review resolve. **Cơ chế tự động**, không UI riêng.

**Mechanics**

1. `trust_score` khởi tạo 0. Mỗi sự kiện sinh **TrustEvent** với điểm:

| Sự kiện                       | Điểm |
| ----------------------------- | ---- |
| Địa điểm submit được duyệt    | +15  |
| Report được xác nhận đúng     | +5   |
| Review được giữ (không bị gỡ) | +2   |
| Nội dung bị reject/gỡ vi phạm | −10  |
| Report bị xác định vu cáo     | −10  |

2. `trust_level` suy ra: **RESTRICTED (<0) · NEW (0..29) · TRUSTED (≥30)**, T=30.
3. **Hệ quả:** RESTRICTED → submit chặn/siết (BR-26), tái phạm → ban; NEW → hàng đợi bình thường; TRUSTED → **fast-track/auto-publish** (BR-25).
4. Admin chỉnh tay (A6).
5. **Defer Phase 2:** badge / level UI / leaderboard.

---

# PHẦN IV — FLOW NHẸ (tóm tắt)

> Luồng đơn giản, ít nhánh. Ghi gọn; ràng buộc chi tiết tham chiếu Phần V.

- **Auth (C1/V1):** Đăng ký (Vendor verify OTP — BR-02) · Đăng nhập/Đăng xuất (sai 5 lần → khóa 15' — BR-05) · Reset mật khẩu (link 15', 1 lần — BR-08) · Quản lý hồ sơ (đổi SĐT Vendor → verify lại — BR-09; không đổi email — BR-10).
- **Tìm kiếm & xem (C2/C3):** map (viewport + clustering — BR-41) + list + filter; chỉ PUBLISHED (BR-11). Xem chi tiết → +view (BR-12); badge xác minh nếu claimed. Không lấy được vị trí → mặc định trung tâm Hòa Lạc; lỗi Goong → list-only.
- **Bookmark (C7):** lưu/bỏ; 1 cặp/người (BR-23); Guest → login (BR-21).
- **Share (C8):** deeplink + copy; chỉ PUBLISHED.
- **Review (C6):** rating(1–5) + nội dung + ảnh ≤3; **tạo mới review chỉ khi GPS/fused location hợp lệ của thiết bị cách địa điểm ≤100m** (BR-68), không chấp nhận pin chỉnh tay hoặc ảnh thay thế; hiển thị ngay; 1/user/địa điểm (BR-17); Vendor không review địa điểm mình (BR-18); địa điểm claimed → báo Vendor (mở reply V8); review giữ → +2 trust (BR-19). Customer toàn quyền **sửa/xóa review cũ từ xa** mà không kiểm tra lại khoảng cách; edit không được tạo review mới hoặc đổi địa điểm gốc (BR-69). Vendor không xóa được (BR-48).
- **Report (C9):** chọn loại (sai info/spam/đóng cửa/**chủ sai**/khác) + mô tả/evidence; 1 PENDING/đối tượng/loại (BR-24); "chủ sai" → vào Report queue để Admin xử, không tự mở Dispute; nếu Admin thông qua report, vendor bị ảnh hưởng có quyền kháng cáo theo HF-6; vu cáo → −10 trust (BR-27).
- **Top trending (C10):** sort view + review + recency; chỉ PUBLISHED.
- **Vendor — info (V6):** sửa giờ/SĐT/mô tả/ảnh; đổi tên/địa chỉ → PENDING_RE_APPROVAL, public giữ info cũ (BR-30); không hard delete, chỉ ẩn (BR-35).
- **Vendor — sản phẩm (V7):** CRUD; giá optional + disclaimer locked (BR-16); ≤50/địa điểm (BR-37); không bán hàng (BR-36).
- **Vendor — reply (V8):** 1 reply/review (BR-38); chỉ địa điểm sở hữu (BR-39).
- **Vendor — thống kê (V10):** view + số review + rating TB.
- **Admin — user (A6):** ban/cảnh cáo/đổi role/chỉnh trust; không tự ban (BR-49); ≥2 Admin (BR-50).
- **Admin — category/tag (A7):** CRUD + visibility (BR-52); xóa tag đang dùng → cảnh báo.
- **Admin — dashboard (A9):** tổng user / địa điểm theo status / review; audit log (BR-43).

---

# PHẦN V — CATALOG CHUẨN

## 7. Business Rules (BR-01 → BR-70)

**Auth & tài khoản:** BR-01 email duy nhất/hợp lệ · BR-02 Vendor bắt buộc verify SĐT; Customer có thể để SĐT optional cho chức năng thường nhưng bắt buộc verify trước khi gửi đăng ký sở hữu/claim · BR-03 OTP 5', tối đa 5 lần sai · BR-04 mật khẩu mã hóa · BR-05 sai mật khẩu 5 lần → khóa 15' · BR-06 BANNED không cấp phiên · BR-07 reset → vô hiệu phiên cũ · BR-08 link reset 15', 1 lần · BR-09 đổi SĐT Vendor → verify lại · BR-10 không đổi email.

**Hiển thị & địa điểm:** BR-11 chỉ PUBLISHED hiển thị · BR-12 1 view/lượt mở (chống đếm trùng) · BR-13 nghi trùng: similarity>0.8 AND <50m → cảnh báo · BR-16 giá luôn kèm disclaimer locked.

**Đóng góp & trust:** BR-22 ≤3 địa điểm/Customer/ngày · BR-25 TRUSTED → fast-track/auto-publish · BR-26 RESTRICTED → submit chặn/siết · BR-44 approve → +điểm, reject vi phạm → −điểm.

**Review:** BR-17 1 review/user/địa điểm · BR-18 Vendor không review địa điểm mình · BR-19 review giữ → +2 trust · BR-48 chỉ Admin gỡ review · BR-68 tạo mới review bắt buộc xác thực hiện diện bằng GPS/fused location hiện tại của thiết bị: khoảng cách tới Location **≤100m** và accuracy **≤50m**; không cho kéo pin tay và không chấp nhận ảnh làm bằng chứng thay thế. Không lấy được vị trí hợp lệ, accuracy kém hoặc ngoài bán kính → chặn tạo review · BR-69 người viết được sửa/xóa review cũ từ xa mà không kiểm tra lại khoảng cách, nhưng edit chỉ cập nhật nội dung/rating/ảnh của review hiện hữu, không được đổi locationId hoặc dùng để tạo review mới từ xa.

**Report & tranh chấp:** BR-24 1 report PENDING/đối tượng/loại và phải lưu evidence · BR-27 vu cáo → −trust · BR-53 tranh chấp ownership chỉ mở từ RequestAccess bị reject/refuse + Vendor B appeal; khi xét tranh chấp, kiểm soát vật lý > giấy phép · BR-54 sau REVOKE → community-owned, mở claim.

**Claim & ownership:** BR-14 claim bắt buộc requester có SĐT tài khoản verified + OTP listing (nếu listing có SĐT) + on-site proof · BR-15 giấy phép optional, verify = kiểm soát vật lý · BR-28 1 owner/địa điểm · BR-29 đăng ký địa điểm mới có sở hữu của Customer/Vendor được duyệt → auto-own cho requester · BR-30 đổi tên/địa chỉ → duyệt lại, public giữ info cũ · BR-45 approve claim chỉ khi SĐT tài khoản verified + OTP listing đạt yêu cầu + proof khớp · BR-46 reject claim → giữ record cũ, claim mới riêng · BR-70 khi Admin approve đăng ký địa điểm mới có sở hữu hoặc claim của Customer, việc gán owner và đổi role Customer → Vendor phải diễn ra cùng một giao dịch; reject không đổi role, requester đã là Vendor thì giữ nguyên role.

**Vendor & sản phẩm:** BR-35 không hard delete, chỉ ẩn · BR-36 không bán hàng · BR-37 ≤50 sản phẩm/địa điểm · BR-38 1 reply/review · BR-39 chỉ reply địa điểm sở hữu.

**Admin & hệ thống:** BR-43 mọi action Admin ghi audit · BR-47 chỉ soft delete · BR-49 Admin không tự ban · BR-50 ≥2 Admin · BR-51 trust_level tác động auto-publish · BR-52 tag có visibility.

**Cross-cutting:** BR-21 Guest read-only, action → login · BR-40 giới hạn bán kính Hòa Lạc · BR-41 map viewport + clustering · BR-42 accuracy>50m → kéo pin tay.

**Request-access / transfer / hold (MVP, lazy):** BR-55 request-access có **timeout 3 ngày** cho owner không phản hồi, kiểm theo **lazy-check** (không cron) · BR-56 sau transfer không qua Admin vetting (A grant request-access hoặc auto-transfer timeout) → chủ mới bị **hold 7 ngày** (chặn ẩn/xóa sản phẩm/đổi core-info); **không** áp với transfer Admin trực tiếp quyết hoặc revoke theo report/admin action · BR-61 1 claim **hoặc** 1 request-access PENDING/địa điểm/thời điểm.

**Suggest-edit & trùng lặp:** BR-57 routing: claimed→Vendor inbox, no-owner→Admin; **không voting** · BR-58 nghi-trùng (cảnh báo) ≠ confirmed-duplicate (ẩn) · BR-59 ghi khoảng cách pin↔thiết bị, lệch xa → cờ mềm · BR-60 Customer/Vendor đăng ký địa điểm mới có sở hữu **bắt buộc SĐT tài khoản verified + on-site proof** để auto-own; thiếu proof chỉ được tạo tầng B và không đổi role · BR-62 nhiều DN cùng địa chỉ nếu khác tên + biển riêng; 1 DN nhiều dịch vụ → 1 địa điểm.

**Kháng cáo (Appeal):** BR-63 mọi quyết định bất lợi có đường kháng cáo + bằng chứng bổ sung → Admin xét lại; Vendor B bị owner A từ chối request-access có quyền appeal để mở Dispute HF-5; vendor bị ảnh hưởng bởi report "chủ sai" được Admin thông qua hoặc revoke do Admin tự phát hiện có quyền appeal quyết định Admin, không phải dispute giữa 2 người · BR-64 1 kháng cáo/quyết định; UPHELD → không kháng lại trừ bằng chứng mới đáng kể · BR-65 hạn nộp kháng cáo **14 ngày** kể từ quyết định · BR-66 trong lúc Appeal PENDING, đối tượng **giữ trạng thái bất lợi**, chỉ đổi khi OVERTURNED · BR-67 người xét kháng cáo **khác** người ra quyết định gốc (khi ≥2 Admin).

## 8. Trust scoring

Khởi tạo 0. +15 submit duyệt · +5 report đúng · +2 review giữ · −10 nội dung gỡ vi phạm · −10 report vu cáo. Level: RESTRICTED(<0)/NEW(0..29)/TRUSTED(≥30). (Chi tiết HF-9.)

## 9. Validation & Constraints (field-level)

| Trường                   | Ràng buộc                                       |
| ------------------------ | ----------------------------------------------- |
| email                    | hợp lệ; duy nhất                                |
| mật khẩu                 | ≥ 8 ký tự                                       |
| SĐT                      | định dạng VN; Vendor phải verified; Customer phải verified trước ownership request/claim |
| Location.tên             | 3–100 ký tự                                     |
| Location.mô tả           | ≥ 10 ký tự                                      |
| tọa độ                   | lat/long hợp lệ, trong bán kính Hòa Lạc (BR-40) |
| tag                      | ≥ 1                                             |
| ảnh địa điểm             | 1–5; định dạng ảnh; ≤ 5MB/ảnh                   |
| Review.rating            | bắt buộc 1–5                                    |
| Review.nội dung          | bắt buộc, không giới hạn tối thiểu              |
| Review.ảnh               | 0–3                                             |
| Review.tạo mới           | GPS/fused location hiện tại phải cách Location ≤100m và accuracy ≤50m; không pin tay, không ảnh thay thế; edit review cũ không kiểm tra lại khoảng cách |
| Product.giá              | optional; ≥ 0; luôn kèm disclaimer              |
| Claim/Request.bằng chứng | ≥ 1 ảnh/video geotagged + OTP verified          |
| Report.evidence          | optional với report thường; bắt buộc nếu report "chủ sai" |
| Appeal.bằng chứng        | ≥ 1 evidence bổ sung liên quan quyết định bị kháng cáo; duplicate ưu tiên ảnh biển hiệu cố định |

## 10. Rate Limits & Quotas

Submit địa điểm 3/Customer/ngày · Review 1/user/địa điểm, **tạo mới phải qua presence check ≤100m** · Reply 1/review · Ảnh địa điểm 1–5 · Ảnh review ≤3 · Sản phẩm ≤50/địa điểm · OTP 5'/tối đa 5 sai · Đăng nhập sai 5 lần→khóa 15' · Link reset 15'/1 lần · Reject liên tiếp 3 lần→cờ tài khoản · Claim/Request-access 1 PENDING/địa điểm · Kháng cáo 1/quyết định, hạn 14 ngày · Admin tối thiểu 2 · Request-access timeout 3 ngày · Ownership hold 7 ngày.

## 11. Permission Matrix

| Action                                             | Guest | Customer | Vendor                        | Admin         |
| -------------------------------------------------- | ----- | -------- | ----------------------------- | ------------- |
| Xem/search                                         | ✅    | ✅       | ✅                            | ✅            |
| Bookmark                                           | ❌    | ✅       | ✅                            | ✅            |
| Review                                             | ❌    | ✅ (tạo mới ≤100m; edit cũ từ xa) | ✅ (không phải địa điểm mình; tạo mới ≤100m) | ✅            |
| Reply review                                       | ❌    | ❌       | ✅ (sở hữu)                   | ✅            |
| Submit địa điểm                                    | ❌    | ✅       | ✅                            | ✅            |
| Đăng ký địa điểm mới có sở hữu                     | ❌    | ✅ (SĐT verified) | ✅ (SĐT verified)        | —             |
| Suggest-edit                                       | ❌    | ✅       | ✅                            | ✅            |
| Claim địa điểm chưa có chủ                         | ❌    | ✅ (SĐT verified) | ✅ (SĐT verified)        | —             |
| Request-access địa điểm đã có chủ                  | ❌    | ❌       | ✅                            | —             |
| Sửa info địa điểm                                  | ❌    | ❌       | ✅ (sở hữu)                   | ✅ (all)      |
| Duyệt suggest-edit                                 | ❌    | ❌       | ✅ (sở hữu)                   | ✅ (no-owner) |
| Duyệt place/claim · xử report/tranh chấp/kháng cáo | ❌    | ❌       | ❌                            | ✅            |
| Quản lý user/tag/trust                             | ❌    | ❌       | ❌                            | ✅            |
| Kháng cáo                                          | ❌    | ✅       | ✅                            | —             |

## 12. Notification Catalog (M3)

| Sự kiện                                | Người nhận                          | Nội dung                                           |
| -------------------------------------- | ----------------------------------- | -------------------------------------------------- |
| Địa điểm duyệt/từ chối                 | người submit                        | kết quả (+ link gốc nếu trùng); ownership approve Customer → Vendor |
| Claim duyệt/từ chối                    | requester (Customer/Vendor)         | kết quả + lý do; approve Customer → Vendor         |
| Request-access tạo                     | chủ hiện tại                        | "có yêu cầu quyền truy cập, phản hồi trong 3 ngày" |
| Request-access kết quả / auto-transfer | các bên                             | quyết định                                         |
| Có review mới                          | Vendor (claimed)                    | thông báo                                          |
| Suggest-edit cần duyệt                 | Vendor (claimed) / Admin (no-owner) | nội dung đề xuất                                   |
| Report/dispute xử lý xong              | reporter + các bên liên quan        | kết quả + nút kháng cáo nếu là quyết định bất lợi |
| Confirmed-duplicate → ẩn               | owner/creator bản phụ               | + nút kháng cáo                                    |
| Kháng cáo kết quả                      | người kháng                         | OVERTURNED/UPHELD                                  |
| Cảnh cáo/ban                           | user                                | lý do                                              |

## 13. Cross-cutting

- **Audit (BR-43):** mọi action Admin ghi log (actor/hành động/đối tượng/thời điểm/lý do); không xóa.
- **Soft delete (BR-47):** không xóa cứng dữ liệu nghiệp vụ; đánh dấu DELETED/REMOVED.
- **Guest (BR-21):** đọc tự do; action ghi → login.
- **GPS (M4):** với dữ liệu địa điểm, dùng fused location (GPS+WiFi+cell) + accuracy; >50m → kéo pin tay; Goong reverse geocoding là kênh phụ. Riêng **tạo mới review**, GPS/fused location hiện tại phải cách Location ≤100m và accuracy ≤50m; không dùng pin chỉnh tay hay ảnh thay thế. Edit review cũ không kiểm tra lại vị trí/khoảng cách.
- **Dedup (M1):** string similarity + Haversine; ngưỡng BR-13; rule-based, không AI; cảnh báo, không tự chặn.
- **Phạm vi địa lý (M5/BR-40):** chỉ nhận/hiển thị địa điểm trong bán kính Hòa Lạc.

## 14. Glossary

**Location** (danh từ chuẩn, không dùng "Place") · **Community-owned** (no-owner, tầng B) · **On-site proof** (ảnh/video geotagged chứng minh kiểm soát vật lý để xin ownership) · **Review presence check** (điều kiện chỉ dùng khi tạo mới review: GPS/fused location hiện tại cách Location ≤100m và accuracy ≤50m; không có ảnh thay thế) · **Claim** (yêu cầu sở hữu địa điểm chưa có chủ; Customer/Vendor đều gửi được khi SĐT verified) · **Request-Access** (yêu cầu quyền truy cập địa điểm đã có chủ) · **OwnershipHold** (cửa sổ hạn chế chủ mới sau transfer không qua Admin vetting) · **Dispute** (tranh chấp owner giữa A và B, chỉ từ request-access bị reject/refuse + B appeal) · **Appeal** (kháng cáo quyết định bất lợi) · **Suggest-edit** (đề xuất sửa field-level) · **Confirmed-duplicate** (Admin xác nhận trùng → ẩn) · **Fast-track** (đóng góp TRUSTED ưu tiên/auto-publish) · **Lazy-check** (kiểm timeout lúc query, không cron) · **M1/M2/M3/M4/M5** (dedup / trust / notification / location handling / geo-scope).

## 15. MVP vs Defer

**MVP:** 3 tầng tin cậy · tạo địa điểm (2 đường) + on-site proof · claim/verify · request-access (lazy timeout 3 ngày) + hold 7 ngày · dispute chỉ từ request-access appeal · revoke · **kháng cáo** · trust engine · dedup detection + confirmed-duplicate · suggest-edit (lean) · review · search/map.
**Defer Phase 2:** merge engine (gộp + chuyển review + cộng view) · crowd-voting · badge/level/leaderboard UI · request-access cron real-time · multi-owner/manager.

---

_Full Specification (Consolidated) — Campus Local Guide. Mọi cơ chế ownership/verification tách "tạo dữ liệu" (rẻ, vô hại) khỏi "sở hữu" (đắt, khóa bằng hiện diện vật lý). Sửa logic ở Phần V để giữ nhất quán; flow nặng ở Phần III là tài liệu build chính._
