# Campus Local Guide — Implementation Guide (WDP backlog)

> **Đối tượng đọc:** (1) dev nhận 1 ticket để code, (2) AI coding agent (Claude Code / Cursor) thực thi 1 ticket.
> **Cách dùng:** 1 ticket = 1 feature `Fxx` = 1 issue `WDP-xx`. Tìm ticket của bạn ở **§4**, đọc block từ trên xuống, build, đối chiếu **Definition of Done**.
> **Bắt buộc đọc trước khi đụng bất kỳ ticket nào:** §1 (global context) + §2 (invariants). Đây là phần non-negotiable.
> **Tham chiếu:** `BR-xx` → xem `Campus-Local-Guide-SPECS-VI.md` §9 · `UC` → SPECS · `HF-x` → flow chi tiết trong SPECS §6 (ownership/verification) · `M1–M5` → §1.3 bên dưới.
> **Nguồn task:** Jira project **WDP** (site `fptp.atlassian.net`), 35 task `WDP-5 → WDP-39`.

---

## 0. Quy ước & protocol thực thi

### 0.1 Quy ước chung
- **Người làm (owner)** trong mỗi block là người chịu trách nhiệm chính, **không phải người duy nhất được đụng** — agent/dev khác vẫn build được nếu đọc đủ block.
- **Status** lấy realtime từ Jira (lúc viết: `Đã xong!` / `Đang làm` / `Đang test` / `Cần làm`). Khi đọc, ưu tiên status trên Jira.
- Mọi ticket đều là **Task phẳng** (không subtask). Dependency nằm ở §3, không ở field `parent`.

### 0.2 Protocol cho AI agent (làm theo đúng thứ tự khi nhận 1 ticket)
1. **Đọc §1 + §2** (nếu chưa nạp vào context).
2. Mở block ticket ở §4 → đọc `Depends on`. Nếu dependency **chưa build** → stub interface theo **API contract v1** (F01), code phần của mình, ghi `// TODO: depends on Fxx` ở chỗ ráp nối. **Không** tự bịa logic của ticket khác.
3. **Không bao giờ tự chế BR mới.** Nếu rule mơ hồ → chọn cách **chặt hơn** (an toàn hơn) và để lại comment `// RULE-AMBIGUOUS: <mô tả>` để người review quyết.
4. Build theo `Implementation notes` → enforce đủ `Rules` → tự test theo `Definition of Done`.
5. Trước khi đóng: chạy lại checklist §2 (invariants) trên code mình vừa viết.

### 0.3 Mức ưu tiên (từ Jira field "Quan trọng")
`Cốt lõi` > `Cao` > `Trung bình`. Khi thiếu thời gian, cắt từ `Trung bình` lên, **không** cắt `Cốt lõi`.

---

## 1. Global context (đọc 1 lần trước khi code)

### 1.1 Repo layout (pnpm monorepo)
```
campus-local-guide/
├── api/         # NestJS (Flat MVC) — backend, REST, business logic
├── web/         # Next.js 15 + MUI v6 — admin/web client
├── mobile/      # Expo / React Native — app chính (Customer/Vendor/Admin)
└── packages/
    └── shared/  # TypeScript types dùng chung 3 app (DTO, enum, contract)
```
- **Database:** MongoDB + Mongoose. Schema theo ERD (F01 khóa lại).
- **Auth:** JWT, phân quyền theo role (Customer/Vendor/Admin) + guest read-only.
- **Map:** Goong Maps (format tương thích Google Maps API).
- **File/ảnh:** Supabase Storage.

### 1.2 Convention theo từng app
| App | Convention |
|---|---|
| `api` | NestJS Flat MVC: mỗi domain 1 module (controller → service → mongoose model). DTO + validation ở `shared`. Mọi response theo **API contract v1**. |
| `web` | Next.js 15 (App Router) + MUI v6. Chủ yếu cho **Admin** (queue duyệt, dashboard, quản trị). |
| `mobile` | Expo. Điều hướng theo 3 role + auth guard (F02). Chủ yếu cho **Customer + Vendor**. |
| `shared` | Single source of truth cho **type/enum/DTO**. Sửa status/enum ở đây, không hardcode rải rác. |

> **Cảnh báo:** **Quy tắc vàng cho agent:** mọi `status`, `role`, `trust_level`, loại report, loại notification… phải là **enum trong `shared`**, không phải magic string. Nếu chưa có enum → tạo ở `shared` trước.

### 1.3 Shared mechanisms (M1–M5) — build 1 lần, tái sử dụng khắp nơi
Đây **không phải** feature riêng mà là **service dùng chung**. Đừng implement lại trong từng ticket — gọi service.

| ID | Service | Build ở ticket | Ai gọi |
|---|---|---|---|
| **M1** | Duplicate detection (string similarity + Haversine < 50m) | **F14 / WDP-18** | F13 (submit), F25 (vendor register) |
| **M2** | Trust engine (TrustEvent + scoring + level + gating) | **F29 / WDP-33** | F15, F22, F27 (mọi chỗ resolve nội dung) |
| **M3** | Notification (email + SMS/OTP + in-app) | **F03 / WDP-7** | F04, F06, F15, F22, F23, F24, F26, F27, F28, F31 |
| **M4** | Location handling (fused location + accuracy + manual pin + reverse geocode) | dùng chung trong **F08/F13** | F13, F25 (ghi khoảng cách pin↔thiết bị) |
| **M5** | Geographic scoping (chặn ngoài bán kính Hòa Lạc) | validation chung | F13, F25 (lúc tạo location) |

> **Audit log** (BR-43) cũng nên là **util dùng chung từ S1** (mọi action Admin ghi log), dù *dashboard* xem log mới làm ở F35/S4. Đừng để tới S4 mới nhét audit — sẽ thiếu log của các action S2/S3.

### 1.4 Domain objects & status — quick ref
Chi tiết ở SPECS §7–8. Bản rút gọn để agent khỏi tra:

- **Location.status:** `SUBMITTED → PUBLISHED → HIDDEN/PENDING_RE_APPROVAL → ...`; `REJECTED`; `DELETED` (soft).
- **Ownership:** `no-owner` (tầng B) ↔ `owned` (tầng C). Chuyển qua claim/register/transfer; gỡ qua release/revoke.
- **Review.status:** `PUBLISHED / DELETED / REMOVED_BY_ADMIN`.
- **Claim.status:** `PENDING / APPROVED / REJECTED / REVOKED / RELEASED`.
- **Report.status:** `PENDING / RESOLVED / DISMISSED`.
- **Dispute.status:** `OPEN / RESOLVED_KEEP / RESOLVED_TRANSFER / RESOLVED_REVOKE`.
- **User:** `ACTIVE / WARNED / BANNED`; `trust_level: RESTRICTED / NEW / TRUSTED` (T=30).
- **RequestAccess:** `PENDING / GRANTED / REJECTED / EXPIRED→AUTO_GRANTED / ESCALATED`.
- **EditSuggestion:** `PENDING / APPLIED / DISCARDED / VOIDED`.
- **OwnershipHold:** `ACTIVE / EXPIRED`.

---

## 2. Invariants non-negotiable (mọi ticket phải giữ — checklist trước khi đóng)

Đây là phần **agent hay vi phạm nhất**. Đọc kỹ. Vi phạm 1 dòng = ticket fail review.

| # | Invariant | BR | Anti-pattern phải tránh |
|---|---|---|---|
| I1 | **Không xóa cứng** dữ liệu nghiệp vụ (Location, Review). Chỉ set status `DELETED/HIDDEN/REMOVED`. | BR-35, BR-47 | `Model.deleteOne()` trên Location/Review |
| I2 | **Chỉ `PUBLISHED`** mới hiện ra public / search / share / trending. | BR-11 | query quên filter status |
| I3 | **Guest read-only.** Mọi action ghi (bookmark/review/report/claim/submit) → yêu cầu login. | BR-21 | endpoint ghi không có auth guard |
| I4 | **Mọi action Admin ghi AuditLog** (ai/gì/khi/lý do); log không sửa/xóa. | BR-43 | resolve report/ban user mà không log |
| I5 | **"Tạo dữ liệu ≠ sở hữu".** Submit/contribute **không** gán owner. Owner chỉ đến từ claim/register-có-proof/transfer. | §3, BR-60 | set `owner` lúc Customer submit |
| I6 | **1 location = 1 owner; 1 slot PENDING** (claim **hoặc** request-access) tại 1 thời điểm. | BR-28, BR-61 | cho 2 claim PENDING song song |
| I7 | **Mọi trường giá** kèm disclaimer "Giá tham khảo", locked. | BR-16 | render giá trần trụi |
| I8 | **Toàn bộ thay đổi quyền/nội dung sinh TrustEvent qua M2**, không cộng/trừ điểm tay rải rác. | §10 | `user.trust_score += 5` trong controller |
| I9 | **Location ngoài bán kính Hòa Lạc bị từ chối.** | BR-40 (M5) | tạo location không validate toạ độ |
| I10 | **Vendor không xóa review khách**; chỉ Admin gỡ. Vendor **không** review địa điểm của mình. | BR-18, BR-48 | endpoint cho vendor delete review |

> **Reversibility (nguyên tắc nền tảng #4):** mọi hành động phá hoại đều phải đảo ngược được + có vết. Khi nghi ngờ "xóa hay ẩn?" → **luôn ẩn (soft)**.

---

## 3. Build order & dependency map

### 3.1 Thứ tự sprint (đã có trên Jira)
| Sprint | Mục tiêu | Tickets |
|---|---|---|
| **S1** | Nền tảng + Auth | WDP-5, 6, 7, 8, 9, 10 |
| **S2** | Khám phá + lõi đóng góp + Trust | WDP-11, 12, 13, 14, 15, 17, 18, 19, 23, 33, 34 |
| **S3** | Ownership + Report + quản trị Admin/Vendor | WDP-16, 25, 26, 27, 28, 29, 30, 35, 36, 37 |
| **S4** | Moderation nâng cao + Dashboard | WDP-20, 21, 22, 24, 31, 32, 38, 39 |

### 3.2 Dependency chính (cái gì khóa cái gì)
```
F01 (repo/contract/schema, WDP-5) ─── khóa TẤT CẢ
F03 (notification, WDP-7) ─── khóa mọi flow có thông báo: F04,F06,F15,F22,F23,F24,F26,F27,F28,F31
F04+F05 (auth) ─── khóa mọi feature cần login
F29 (trust M2, WDP-33) ─── service dùng chung, build sớm S2 → F15,F22,F27 gọi
F14 (dedup M1, WDP-18) ─── service dùng chung → F13,F25 gọi

F13 (submit) → cần F14 (M1) + F08 (pin/map) → tạo SUBMITTED → F15 (admin duyệt)
F19 (review) → cần location/detail + F29 (trust +2)
F23 (claim) → cần F03 (OTP) + cơ chế cấp mã → F24 (admin xét claim)
F25 (vendor register) → cần F13(form) + cơ chế proof của F23 + F15(duyệt)
F26 (request-access) → cần ownership tồn tại (F24/F25) + F03
F27 (dispute) → cần F21/F22 (report routing) + F26 + F03
F28 (appeal) → cần các quyết định để kháng: F16,F24,F15,F27,F22,F31  (build cuối)
F16 (confirm duplicate) → cần F14 (cờ nghi-trùng) + F28 (hook kháng cáo)
F17+F18 (suggest-edit) → cần F10(detail) + F24(ownership để route) + F15(cơ chế re-approval)
F32 (vendor manage) → cần ownership + F15 (re-approval)
F33 (products) → cần F32
F34 (vendor dashboard) → cần F32 + số liệu review/view
F35 (audit+dashboard) → audit LOGGING dùng chung từ S1; VIEW dashboard ở S4
```

### 3.3 Critical path (chuỗi không được trễ)
`F01 → F03 → F04/F05 → F13+F14 → F15 → F23+F24 → F26 → F27`. Đây là xương sống ownership — trễ chuỗi này là trễ demo.

---

## 4. Per-ticket implementation specs

> Mỗi block theo thứ tự: **Mục tiêu** · **Phụ thuộc** · **Đụng tới** · **Rule** · **Ghi chú** · **DoD** · **Tránh**.

---

### SPRINT 1 — Nền tảng + Auth

#### WDP-5 · F01 — Khởi tạo dự án + API contract + DB schema  `Đã xong!` · owner: Dương · **Cốt lõi**
- **Mục tiêu:** Dựng monorepo (api/mobile/web/shared), DB theo ERD, **khóa API contract v1** để team build song song; CI lint+test xanh.
- **Phụ thuộc:** Không có (gốc).
- **Đụng tới:** Toàn repo + `shared` (types/enum/DTO) + Mongoose models.
- **Rule:** Mọi enum status ở §1.4 phải khai báo trong `shared` ngay từ đây.
- **Ghi chú:** Contract v1 phải public cho team (Swagger/openapi hoặc file `shared`). 1 endpoint `GET /health`.
- **DoD:** Clone về chạy được; contract công bố; health-check trả 200.
- **Tránh:** Đừng để type rải rác trong từng app — tất cả ở `shared`.

#### WDP-6 · F02 — Mobile app shell + navigation  `Đã xong!` · owner: Minh · **Cao**
- **Mục tiêu:** Expo: điều hướng 3 role (Customer/Vendor/Admin), theme, **auth guard**, env config, error boundary.
- **Phụ thuộc:** F01.
- **Đụng tới:** `mobile`.
- **Rule:** I3 (guest read-only): màn cần login phải bị chặn khi chưa auth.
- **DoD:** Chuyển màn theo role; màn cần login bị chặn khi guest.

#### WDP-7 · F03 — Notification service (Email + SMS/OTP + in-app)  `Đang làm` · owner: Đăng · **Cao**
- **Mục tiêu:** Adapter gửi email, **gửi OTP qua SMS**, inbox in-app + đánh dấu đã đọc; template theo catalog notification (SPECS §14).
- **Phụ thuộc:** F01.
- **Đụng tới:** `api` (module Notification = **M3**), `mobile`/`web` (inbox UI).
- **Rule:** Đây là **M3** — mọi flow khác **gọi service này**, không tự gửi.
- **Ghi chú:** Thiết kế interface ổn định: `notify(recipient, eventType, payload)`. OTP: hạn 5 phút, ≤5 lần sai (BR-03).
- **DoD:** Gửi được OTP thật; inbox hiển thị + mark read; flow khác gọi được qua interface.
- **Tránh:** Đừng hardcode nội dung trong từng caller — template tập trung theo eventType.

#### WDP-8 · F04 — Đăng ký + OTP cho Vendor  `Đang làm` · owner: Đăng · **Cốt lõi**
- **Mục tiêu:** Form 2 role; **Vendor bắt buộc verify SĐT** (OTP); email duy nhất; mật khẩu mã hóa.
- **Phụ thuộc:** F03 (OTP), F01.
- **Đụng tới:** `api` (Auth), `mobile`.
- **Rule:** BR-01 (email unique), BR-02 (Vendor verify SĐT, Customer optional), BR-03 (OTP 5'/5 lần), BR-04 (hash password).
- **Ghi chú:** Vendor **không qua OTP thì không tạo account**. Customer bỏ SĐT → bỏ OTP (AF01.1).
- **DoD:** Tạo được cả 2 loại account; Vendor thiếu OTP → reject.
- **Tránh:** Không lưu password plain text (I-auth).

#### WDP-9 · F05 — Đăng nhập / Đăng xuất  `Đã xong!` · owner: Minh · **Cốt lõi**
- **Mục tiêu:** JWT; tài khoản `BANNED` bị chặn kèm lý do.
- **Phụ thuộc:** F04, F01.
- **Rule:** BR-05 (sai 5 lần → khóa 15'), BR-06 (BANNED không cấp phiên).
- **DoD:** Login đúng role; logout hủy phiên; BANNED bị chặn có lý do.

#### WDP-10 · F06 — Quên / reset mật khẩu  `Đang test` · owner: Đăng · **Cao**
- **Mục tiêu:** Link reset qua email hạn 15', dùng 1 lần; reset xong **vô hiệu mọi phiên cũ**.
- **Phụ thuộc:** F03 (email), F04.
- **Rule:** BR-07 (vô hiệu phiên cũ), BR-08 (link 15'/1 lần).
- **Ghi chú:** Email không tồn tại → vẫn báo "đã gửi nếu tồn tại" (AF03.1, chống dò email).
- **DoD:** Nhận link → đặt lại → link cũ hết tác dụng; phiên cũ bị logout.

---

### SPRINT 2 — Khám phá + lõi đóng góp + Trust

#### WDP-11 · F07 — Quản lý hồ sơ cá nhân  `Đang test` · owner: Đăng · **Trung bình**
- **Mục tiêu:** Sửa tên/avatar (Supabase)/SĐT; **Vendor đổi SĐT phải verify OTP lại**; không đổi email.
- **Phụ thuộc:** F04, F03 (OTP), Supabase.
- **Rule:** BR-09 (Vendor đổi SĐT → OTP số mới), BR-10 (không đổi email).
- **DoD:** Lưu info; upload avatar; Vendor đổi SĐT phải OTP.

#### WDP-12 · F08 — Bản đồ lõi (Goong + clustering)  `Đang test` · owner: Minh · **Cốt lõi**
- **Mục tiêu:** Map: **viewport-based loading + clustering** chống lag khi zoom out; marker → mở chi tiết.
- **Phụ thuộc:** F01, Goong.
- **Đụng tới:** `mobile`/`web` + endpoint trả location theo bounding box.
- **Rule:** BR-41 (viewport + clustering — **bắt buộc**, không tải hết points), I2 (chỉ PUBLISHED).
- **Ghi chú:** Đây là chỗ memory đã cảnh báo: **không cluster = lag lúc demo zoom rộng**. API nhận `bbox` + zoom, trả cluster ở zoom thấp, điểm ở zoom cao.
- **DoD:** Zoom xa không khựng; hiển thị cụm marker; tap cluster → zoom in.
- **Tránh:** Đừng `find(all locations)` rồi render hết.

#### WDP-13 · F09 — Tìm kiếm + lọc + danh sách  `Cần làm` · owner: Minh · **Cốt lõi**
- **Mục tiêu:** Keyword + filter category/subcategory/tag/khu vực; **chỉ PUBLISHED**; empty state gợi ý đóng góp.
- **Phụ thuộc:** F08, F30 (category/tag để filter).
- **Rule:** BR-11 (I2).
- **DoD:** Tìm + lọc đúng; list phân trang; rỗng → CTA đóng góp (UC07).

#### WDP-14 · F10 — Chi tiết địa điểm + chia sẻ  `Đang làm` · owner: Minh · **Cốt lõi**
- **Mục tiêu:** Ảnh, giờ mở, sản phẩm (disclaimer giá), review + rating TB, **badge Đã xác minh**, đếm view chống trùng, deeplink share.
- **Phụ thuộc:** F08; tích hợp output F19 (review), F33 (product) — có thể stub trước.
- **Rule:** BR-12 (1 view/lần, chống đếm trùng khoảng ngắn), BR-16 (disclaimer giá), I2 (HIDDEN/DELETED → "không khả dụng").
- **Ghi chú:** Badge "Đã xác minh" chỉ hiện khi `owned` (tầng C). Review/product để placeholder nếu ticket đó chưa xong.
- **DoD:** Hiển thị đủ; +view_count chống trùng; copy deeplink.

#### WDP-15 · F11 — Bookmark  `Cần làm` · owner: Đăng · **Trung bình**
- **Mục tiêu:** Lưu/bỏ lưu, trang "Đã lưu"; 1 cặp/user; guest → login.
- **Phụ thuộc:** F04, F10.
- **Rule:** BR-23 (1 cặp/user), BR-21 (I3).
- **DoD:** Thêm/xóa bookmark; list đúng; guest bị đẩy login.

#### WDP-17 · F13 — Submit địa điểm (Customer)  `Cần làm` · owner: Long · **Cốt lõi**
- **Mục tiêu:** Form + **ghim pin** (accuracy > 50m buộc kéo tay, **lưu khoảng cách pin↔thiết bị**) + ảnh 1–5 + quota 3/ngày → tạo `SUBMITTED`. *(HF-1)*
- **Phụ thuộc:** F08 (map/pin = M4), **F14 (M1 dedup)**, F04.
- **Đụng tới:** `api` (Location), `mobile`.
- **Rule:** BR-22 (3/ngày), BR-42 (accuracy>50m → kéo pin), BR-59 (lưu khoảng cách → cờ mềm), **I5 (KHÔNG gán owner)**, BR-26 (RESTRICTED bị chặn submit), BR-40/M5 (trong bán kính).
- **Ghi chú:** Gọi **M1 (F14)** trước khi tạo: nghi trùng → cho "không phải trùng" (gắn cờ) hoặc xem bản gốc. TRUSTED → fast-track (vẫn no-owner, BR-25).
- **DoD:** Nộp được → status `SUBMITTED`, owner = null; vượt quota bị chặn; accuracy kém buộc kéo pin.
- **Tránh:** **Tuyệt đối không** set owner ở đây (I5). Không tạo location ngoài bán kính (I9).

#### WDP-18 · F14 — Phát hiện trùng lặp (M1)  `Cần làm` · owner: Long · **Cốt lõi**
- **Mục tiêu:** String similarity + Haversine; **similarity > 0.8 AND distance < 50m → cảnh báo**; rule-based, **không AI**.
- **Phụ thuộc:** F01.
- **Đụng tới:** `api` (service **M1** dùng chung).
- **Rule:** BR-13 (ngưỡng), BR-58 (nghi-trùng ≠ confirmed-duplicate — chỉ cảnh báo, **không tự ẩn**).
- **Ghi chú:** Trả về danh sách ứng viên trùng + score, không tự block. Dùng lib string-similarity; Haversine tính từ toạ độ.
- **DoD:** Submit gần + tên giống → cảnh báo đúng ngưỡng; xa hoặc tên khác → không cảnh báo.
- **Tránh:** Không gọi LLM/AI. Không tự đổi status location.

#### WDP-19 · F15 — Admin duyệt địa điểm  `Cần làm` · owner: Dương · **Cao**
- **Mục tiêu:** Queue `SUBMITTED` + `PENDING_RE_APPROVAL`; **approve/reject kèm lý do**; hiện cờ nghi-trùng + cờ pin-xa; hook cộng/trừ trust. *(HF-1)*
- **Phụ thuộc:** F13 (có cái để duyệt), **F03 (notify)**, **F29 (M2 trust)**.
- **Đụng tới:** `web` (Admin queue), `api`.
- **Rule:** BR-44 (approve → +điểm; reject vi phạm → −điểm qua **M2**), BR-43 (I4 audit), BR-30 (duyệt `PENDING_RE_APPROVAL` → áp info mới).
- **Ghi chú:** Approve → `PUBLISHED` + M2 +15 + M3 "đã duyệt". Reject → `REJECTED` + lý do + M3 + cho sửa & gửi lại. Reject do trùng → kèm link gốc.
- **DoD:** Duyệt đổi status đúng; gửi notify cho người submit; ghi audit; trust cập nhật.

#### WDP-23 · F19 — Đánh giá (review)  `Cần làm` · owner: Long · **Cốt lõi**
- **Mục tiêu:** Tạo/sửa/xóa; rating 1–5 + nội dung ≥ 20 ký tự + ảnh ≤ 3; **1 review/user/địa điểm**; chặn tự đánh giá địa điểm mình; tính lại rating TB.
- **Phụ thuộc:** F10 (detail), F29 (trust +2), F04.
- **Rule:** BR-17 (1/user/địa điểm, cập nhật không tạo thêm), BR-18 (Vendor không review địa điểm mình — **I10**), BR-19 (review survived → M2 +2), BR-48 (Vendor không xóa review khách).
- **Ghi chú:** Từ cấm → vẫn hiển thị + gắn cờ cho UC22. Xóa review (tác giả) → `DELETED` + tính lại rating; Admin gỡ → `REMOVED_BY_ADMIN`.
- **DoD:** Ràng buộc đúng; rating TB cập nhật khi thêm/sửa/xóa.
- **Tránh:** Không cho Vendor xóa review khách; không cho review địa điểm của chính mình.

#### WDP-33 · F29 — Trust engine (M2)  `Đang làm` · owner: Trung · **Cốt lõi**
- **Mục tiêu:** `TrustEvent` + scoring (**+15 / +5 / +2, −10 / −10**); level `RESTRICTED/NEW/TRUSTED` (T=30); gating: chặn submit khi RESTRICTED, fast-track khi TRUSTED. *(HF-9)*
- **Phụ thuộc:** F01.
- **Đụng tới:** `api` (service **M2** dùng chung).
- **Rule:** BR-25/26/51 (level → quyền), §10 scoring table, **I8 (mọi điểm qua M2)**.
- **Ghi chú:** Interface: `recordTrustEvent(userId, eventType)` → tự cập nhật `trust_score` → suy `trust_level`. Gating đọc level. Admin chỉnh tay được (qua F31).
- **DoD:** Điểm cập nhật theo sự kiện; vượt/giảm ngưỡng đổi quyền (RESTRICTED chặn submit, TRUSTED auto-publish).
- **Tránh:** Không cộng/trừ điểm ngoài service này.

#### WDP-34 · F30 — Quản lý category  `Đang làm` · owner: Trung · **Trung bình**
- **Mục tiêu:** CRUD category/subcategory; **ẩn thay vì xóa cứng**.
- **Phụ thuộc:** F01.
- **Rule:** BR-52 (visibility flag), I1 (soft).
- **Ghi chú:** Xóa category đang dùng → cảnh báo số location ảnh hưởng (EF24.1).
- **DoD:** CRUD đầy đủ; ẩn category thay vì xóa cứng.

---

### SPRINT 3 — Ownership + Report + quản trị

#### WDP-16 · F12 — Top trending  `Cần làm` · owner: Đăng · **Trung bình**
- **Mục tiêu:** Sort theo view + số review + recency, lọc theo category; thiếu data → fallback "mới nhất".
- **Phụ thuộc:** F10, F19.
- **Rule:** BR-11 (I2 — chỉ PUBLISHED vào trending).
- **DoD:** Bảng xếp hạng cập nhật theo dữ liệu thực; thiếu data → mới nhất.

#### WDP-25 · F21 — Report địa điểm / review  `Cần làm` · owner: Long · **Cao**
- **Mục tiêu:** Report theo loại (sai info/spam/đóng cửa/**chủ sở hữu sai**/khác); 1 PENDING/đối tượng/loại; loại "chủ sai" → định tuyến tranh chấp.
- **Phụ thuộc:** F10, F04.
- **Rule:** BR-24 (1 PENDING/đối tượng/loại), I3 (guest → login).
- **Ghi chú:** Loại "chủ sở hữu sai" tạo đường dẫn sang **F27 (Dispute)** (AF11.1).
- **DoD:** Gửi được; chống report trùng; "chủ sai" route đúng.

#### WDP-26 · F22 — Admin xử lý report  `Cần làm` · owner: Trung · **Cao**
- **Mục tiêu:** Queue → resolve/dismiss; gỡ review (tính lại rating); **hook trust** (+5 đúng / −10 vu cáo); kéo sang ban khi nặng.
- **Phụ thuộc:** F21, **F03**, **F29 (M2)**, F31 (ban).
- **Rule:** BR-27 (vu cáo → −10 reporter), BR-48 (chỉ Admin gỡ review), BR-43 (I4 audit).
- **Ghi chú:** Gỡ review → `REMOVED_BY_ADMIN` + tính lại rating. Report đúng → +5 reporter; vu cáo → −10. Vi phạm nặng → F31.
- **DoD:** Xử lý đổi status; trust cập nhật; audit.

#### WDP-27 · F23 — Claim địa điểm + xác minh  `Cần làm` · owner: Dương · **Cốt lõi**
- **Mục tiêu:** **OTP về SĐT listing** + hệ thống **cấp mã 1 lần** + upload **on-site proof geotagged** (biển hiệu + mã + timestamp) + giấy phép optional; chặn khi đã có yêu cầu PENDING. *(HF-3)*
- **Phụ thuộc:** **F03 (OTP)**, F10, F04.
- **Đụng tới:** `api` (Claim), `mobile`.
- **Rule:** BR-14 (OTP + on-site proof **bắt buộc**), BR-15 (giấy phép optional, verify = kiểm soát vật lý), **BR-61/I6 (1 slot PENDING)**, BR-02 (Vendor verified).
- **Ghi chú:** 3 yếu tố độc lập: **geotag + timestamp + mã-1-lần**. Listing chưa có SĐT → bỏ OTP, dựa on-site proof + Admin soi kỹ. Đã có chủ → chặn, gợi ý report nếu nghi chủ sai (→ UC25).
- **DoD:** Nộp **đủ 3 yếu tố** mới gửi được claim; trùng slot PENDING bị chặn.
- **Tránh:** Không cho gửi claim thiếu OTP/proof. Không gán owner ở bước này (owner set ở F24).

#### WDP-28 · F24 — Admin xét claim  `Cần làm` · owner: Dương · **Cao**
- **Mục tiêu:** Đối chiếu OTP + on-site proof; **approve → gán owner + badge**; reject → claim mới không ghi đè; cho yêu cầu bổ sung.
- **Phụ thuộc:** F23, **F03**.
- **Rule:** BR-45 (approve chỉ khi OTP verified + proof khớp), BR-46 (reject → claim mới, **không ghi đè**), BR-29 (gán owner), BR-43 (I4).
- **Ghi chú:** Approve → set `owner` + badge "Đã xác minh" + M3. Đã có chủ khác khi xét → chuyển **F27 (Dispute)** (EF20.1). Giấy phép → fast-track.
- **DoD:** Approve set chủ sở hữu; reject mở claim mới (record cũ giữ nguyên).

#### WDP-29 · F25 — Vendor đăng ký địa điểm mới (auto-own)  `Cần làm` · owner: Minh · **Cao**
- **Mục tiêu:** Form như F13 + **bắt buộc on-site proof** để tự thành chủ sau duyệt; **không proof → rơi về no-owner** phải claim sau. *(HF-2)*
- **Phụ thuộc:** F13 (form), F23 (cơ chế proof), **F14 (M1)**, F15 (duyệt).
- **Rule:** **BR-60/I5 (đây là chỗ bịt lỗ hổng "đăng ký = thành chủ")**, BR-29 (approve → gán owner), BR-13 (dedup).
- **Ghi chú:** Có proof → sau Admin duyệt **auto-own**. Thiếu proof → tạo ở tầng B (no-owner), Vendor phải đi claim (F23) sau. Trùng địa điểm chưa chủ → gợi ý dùng claim (AF14.1).
- **DoD:** Có proof thì auto-own sau khi Admin duyệt; thiếu proof thì no-owner.
- **Tránh:** **Không** auto-own nếu thiếu on-site proof (đây là loại tấn công "né claim bằng đăng ký mới").

#### WDP-30 · F26 — Request-access + chuyển quyền + hold  `Cần làm` · owner: Dương · **Cốt lõi**
- **Mục tiêu:** **1 slot PENDING/địa điểm** (người khác bị chặn); báo chủ, hạn **3 ngày (lazy-check)**; grant / reject→kháng nghị / im lặng→verify-to-claim; **hold 7 ngày** khi cấp không qua Admin. *(HF-4)*
- **Phụ thuộc:** ownership tồn tại (F24/F25), **F03**, F23 (proof).
- **Đụng tới:** `api` (RequestAccess + OwnershipHold), `mobile`.
- **Rule:** BR-61/I6 (1 slot PENDING), BR-56 (hold 7 ngày khi auto-transfer/đang kháng được), BR-55 (MVP dùng **lazy-timeout**, không cron).
- **Ghi chú:** **Lazy-check 3 ngày:** tính hạn lúc có truy vấn / lúc B bấm "verify để nhận quyền" — **không cron job**. 3 nhánh: (a) chủ Grant → transfer + hold; (b) chủ Reject → B kháng nghị → mở Dispute (F27); (c) chủ im lặng quá hạn → B verify đạt → auto-transfer + **hold bắt buộc**. Hold chặn: ẩn địa điểm / xóa hàng loạt sản phẩm / đổi core-info; vẫn cho edit benign.
- **DoD:** Đủ 3 nhánh phản hồi; hold chặn đúng các action phá hoại; chỉ 1 slot PENDING.
- **Tránh:** Đừng làm cron real-time (đó là Phase 2). Đừng bật hold khi transfer do Admin trực tiếp quyết (xem F27).

#### WDP-35 · F31 — Admin quản lý tài khoản  `Cần làm` · owner: Trung · **Cao**
- **Mục tiêu:** Ban/cảnh cáo/đổi role/**chỉnh trust thủ công**; không tự ban; luôn ≥ 2 Admin.
- **Phụ thuộc:** **F29 (M2 để chỉnh trust)**, F03.
- **Rule:** BR-49 (không tự ban), BR-50 (≥ 2 Admin), BR-51 (level → quyền), BR-43 (I4).
- **Ghi chú:** Chỉnh trust tay → vẫn đi qua M2 (sinh TrustEvent loại "admin_adjust"). Hạ quyền Admin cuối → cảnh báo (EF23.2).
- **DoD:** Đổi trạng thái user + ghi audit; chặn tự ban; chặn xuống dưới 2 Admin.

#### WDP-36 · F32 — Vendor quản lý địa điểm sở hữu  `Cần làm` · owner: Minh · **Cao**
- **Mục tiêu:** Sửa giờ/mô tả/ảnh/SĐT; **đổi tên/địa chỉ → `PENDING_RE_APPROVAL`** (public giữ bản cũ); ẩn thay vì xóa; release ownership.
- **Phụ thuộc:** ownership (F24/F25), F15 (re-approval).
- **Rule:** BR-30 (đổi tên/địa chỉ → duyệt lại, public giữ info cũ), BR-35/I1 (ẩn không xóa cứng).
- **Ghi chú:** Sửa nhẹ (giờ/mô tả) → áp ngay. Sửa lớn (tên/địa chỉ) → tạo bản chờ duyệt, public vẫn hiện bản cũ tới khi Admin approve. Bị revoke quyền → chặn sửa. **Trong hold (F26)** → chặn action phá hoại.
- **DoD:** Sửa nhẹ áp ngay; sửa lớn chờ duyệt; release → no-owner.
- **Tránh:** Không hard-delete location (chỉ ẩn).

#### WDP-37 · F33 — Vendor quản lý sản phẩm  `Cần làm` · owner: Trung · **Trung bình**
- **Mục tiêu:** CRUD ≤ 50 sản phẩm/địa điểm; **giá optional + disclaimer locked**; không giỏ hàng.
- **Phụ thuộc:** F32 (ownership).
- **Rule:** BR-37 (≤50), BR-16/I7 (disclaimer giá locked), BR-36 (không bán hàng).
- **DoD:** CRUD; giá luôn kèm "giá tham khảo"; vượt 50 bị chặn.

---

### SPRINT 4 — Moderation nâng cao + Dashboard

#### WDP-20 · F16 — Xác nhận trùng lặp + ẩn  `Cần làm` · owner: Long · **Cao**
- **Mục tiêu:** Admin xác nhận trùng thật → **`HIDDEN`** + thông báo kèm nút kháng cáo; phân biệt nghi-trùng vs confirmed-duplicate. *(HF-7)*
- **Phụ thuộc:** F14 (cờ nghi-trùng), F15 (Admin tooling), **F28 (hook kháng cáo)**.
- **Rule:** BR-58 (2 mức trùng), I1 (HIDDEN không xóa cứng), I4 (audit).
- **Ghi chú:** **Merge defer Phase 2** — MVP chỉ ẩn, không gộp/chuyển review/cộng view. Ẩn → mở được kháng cáo sang F28.
- **DoD:** Ẩn khỏi search; mở được kháng cáo.
- **Tránh:** Đừng làm merge engine (Phase 2).

#### WDP-21 · F17 — Đề xuất sửa (gửi đề xuất)  `Cần làm` · owner: Long · **Cao**
- **Mục tiêu:** Customer đề xuất sửa **field-level** (giờ, SĐT, kéo pin, cờ "đã đóng cửa"/"trùng lặp"/"không tồn tại") → tạo `EditSuggestion PENDING`. *(HF-8)*
- **Phụ thuộc:** F10 (detail), F04.
- **Đụng tới:** `api` (EditSuggestion), `mobile`.
- **Rule:** (routing ở F18). I3 (guest → login).
- **DoD:** Gửi được; vào đúng hàng đợi (theo F18).

#### WDP-22 · F18 — Đề xuất sửa (định tuyến & duyệt)  `Cần làm` · owner: Long · **Cốt lõi**
- **Mục tiêu:** **Claimed → Vendor inbox** (Apply/Discard); **no-owner → Admin queue**; Apply trường nhạy cảm (tên/địa chỉ) → re-approval; cờ "trùng" → đẩy sang F16.
- **Phụ thuộc:** F17, **F24 (ownership để route)**, F15 (re-approval).
- **Rule:** BR-57 (routing theo ownership, **không crowd-voting**), BR-30 (tên/địa chỉ → re-approval).
- **Ghi chú:** **Hai spec gap đã ratify (xem §5):**
  - **Auto-void:** location chuyển `HIDDEN`/`DELETED` khi suggestion còn `PENDING` → set suggestion `VOIDED` (giữ record cho audit), **không** giữ pending.
  - **Re-route on ownership change:** ownership đổi giữa chừng (claim approved / revoke / release) → suggestion `PENDING` **re-route** sang inbox/queue đúng với chủ mới, không xử theo route cũ.
- **DoD:** Route đúng theo trạng thái sở hữu; Apply cập nhật info (tên/địa chỉ → chờ duyệt); auto-void & re-route hoạt động.
- **Tránh:** Không crowd-voting. Không Apply edit lên location đã `HIDDEN/DELETED`.

#### WDP-24 · F20 — Vendor phản hồi review  `Cần làm` · owner: Minh · **Trung bình**
- **Mục tiêu:** Vendor xem review địa điểm sở hữu, **reply 1 lần/review**, sửa reply; thông báo khi có review mới.
- **Phụ thuộc:** F19, F32 (ownership), F03.
- **Rule:** BR-38 (1 reply/review), BR-39 (chỉ địa điểm sở hữu).
- **DoD:** Reply hiển thị dưới review; reply lần 2 bị chặn.

#### WDP-31 · F27 — Phân xử tranh chấp (Dispute)  `Cần làm` · owner: Dương · **Cốt lõi**
- **Mục tiêu:** Hồ sơ 2 bên + bằng chứng từ report; quyết **giữ / chuyển / thu hồi**; revoke → no-owner mở claim lại; **transfer do Admin → KHÔNG hold**. *(HF-5)*
- **Phụ thuộc:** F21/F22 (report routing), F26 (transfer), F03.
- **Rule:** BR-53 (kiểm soát vật lý > giấy phép), BR-54 (revoke → no-owner, mở claim), BR-56 (transfer do Admin **không** hold), I4 (audit).
- **Ghi chú:** 3 kết cục: `RESOLVED_KEEP` / `RESOLVED_TRANSFER` (set owner mới, **không hold** vì Admin đã vetting) / `RESOLVED_REVOKE` (no-owner, mở claim). Cả 2 bên yếu → giữ no-owner. Owner giả mạo → revoke + cân nhắc ban (F31).
- **DoD:** 3 kết cục chạy đúng; ghi audit; transfer do Admin không bật hold.

#### WDP-32 · F28 — Kháng cáo (Appeal)  `Cần làm` · owner: Dương · **Cao**
- **Mục tiêu:** **1 lần/quyết định, hạn 14 ngày, Admin KHÁC xét**; áp cho duplicate-hide / reject claim / reject location / revoke / gỡ review / ban; `OVERTURNED` → khôi phục. *(HF-6)*
- **Phụ thuộc:** các quyết định: F16, F24, F15, F27, F22, F31; F03.
- **Rule:** **BR-63..67** (bộ rule appeal — xem **Cảnh báo:** bên dưới), I4 (audit).
- **Ghi chú:** Appeal phải do **Admin khác** người ra quyết định gốc xét (chống thiên vị). `OVERTURNED` → khôi phục trạng thái trước (un-hide / re-publish / restore owner / un-ban / restore review). 1 quyết định chỉ kháng 1 lần.
- **DoD:** Nộp kèm bằng chứng; lật được quyết định → khôi phục.
- **Cảnh báo:** **Cờ cho team:** ticket này tham chiếu **BR-63..67** nhưng SPECS hiện chỉ có **BR-63** (appeal gộp 1 dòng). Phải **mở rộng SPECS thành BR-63..67** trước defense (đề xuất: BR-63 phạm vi áp dụng / BR-64 "1 lần/quyết định" / BR-65 "Admin khác xét" / BR-66 "hạn 14 ngày" / BR-67 "OVERTURNED → khôi phục"). Nếu không, hội đồng soi ra ticket nói rule mà spec không có.

#### WDP-38 · F34 — Vendor dashboard + thống kê  `Cần làm` · owner: Trung · **Trung bình**
- **Mục tiêu:** Danh sách địa điểm sở hữu; thống kê view / số review / rating TB, lọc 7/30 ngày.
- **Phụ thuộc:** F32, F19 (review/rating), F14/F10 (view).
- **Rule:** I2 (số liệu chỉ từ location PUBLISHED của vendor).
- **DoD:** Số liệu hiển thị đúng theo từng địa điểm; lọc 7/30 ngày.

#### WDP-39 · F35 — Audit log + Admin dashboard  `Cần làm` · owner: Trung · **Trung bình**
- **Mục tiêu:** Ghi **mọi action Admin** (ai/gì/khi/lý do); dashboard đếm user, địa điểm theo status, review.
- **Phụ thuộc:** cross-cutting (mọi feature Admin: F15,F16,F22,F24,F27,F28,F30,F31).
- **Rule:** BR-43/I4 (audit không xóa được).
- **Ghi chú:** **Audit *logging* phải là util dùng chung từ S1** — ticket này (S4) chủ yếu làm **VIEW dashboard + bảng tra log**. Nếu các ticket S2/S3 chưa ghi log → quay lại bổ sung lệnh ghi, đừng để dashboard rỗng.
- **DoD:** Log không xóa được; dashboard tổng quan hiển thị đúng số liệu theo status.

---

## 5. Hai spec gap đã ratify (encode vào F18/WDP-22)

Hai quyết định này **đã chốt** và đã nhúng vào ticket F18. Đây là behavior chính thức của `EditSuggestion`:

**(1) Auto-void khi location rời `PUBLISHED`.** EditSuggestion đang `PENDING` mà location bị `HIDDEN`/`DELETED` → suggestion chuyển **`VOIDED`** (giữ record cho audit), không giữ pending.

**(2) Re-route khi ownership đổi giữa chừng.** EditSuggestion `PENDING` mà ownership đổi (claim approved / revoke / release) → **re-route** sang đúng inbox/queue của chủ mới (claimed→Vendor, no-owner→Admin), xử theo route mới.

State machine cuối của EditSuggestion:
```
PENDING ──Apply──────────────────────────────> APPLIED
PENDING ──Discard────────────────────────────> DISCARDED
PENDING ──location HIDDEN/DELETED────────────> VOIDED       (auto, giữ record)
PENDING ──ownership đổi──────────────────────> PENDING      (re-route, không đổi state)
```

> Lập luận defense cho **auto-void thay vì giữ pending** → xem phần trả lời trong chat (không nhồi vào guide build).

---

*Implementation Guide — Campus Local Guide (WDP backlog). Bám 35 ticket Jira; rule chi tiết ở `Campus-Local-Guide-SPECS-VI.md`. Khi ticket và SPECS lệch nhau → build theo ticket (build target), đồng thời flag để sửa SPECS. Đã flag sẵn: (a) cloud ID Jira đúng là `bdacd6a5-...` (không phải bản trong memory cũ); (b) appeal cần mở rộng SPECS BR-63 → BR-63..67.*
