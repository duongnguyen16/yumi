# Campus Local Guide — Full Specification (Defense-ready)

> **Vai trò:** Đặc tả nghiệp vụ đầy đủ + đào sâu phần ownership / tạo địa điểm / xác minh / chống gian lận. Mỗi cơ chế viết để **trả lời được mọi câu chất vấn của hội đồng mà không lộ điểm yếu**.
> **Mức:** Business / functional. **Không** code, schema SQL, API contract.
> **Mở rộng từ:** `Campus-Local-Guide-Master-Spec.md` (giữ nguyên các catalog rule, bổ sung phần sâu).

---

## 1. Tổng quan & nguyên tắc nền tảng

Ứng dụng hyperlocal tổng hợp địa điểm quanh khu sinh viên Hòa Lạc. Customer đóng góp + đánh giá; Vendor xác minh & quản lý địa điểm sở hữu; Admin kiểm duyệt report, kháng cáo và tranh chấp ownership.

**4 nguyên tắc xương sống** (mọi cơ chế phía dưới đều suy ra từ đây):

1. **Tạo dữ liệu ≠ Sở hữu dữ liệu.** Ai cũng có thể *đóng góp* một địa điểm (kể cả từ xa) vì đó chỉ là dữ liệu cộng đồng chưa xác minh, **không trao quyền gì**. Quyền *sở hữu/quản lý* chỉ đến từ bằng chứng kiểm soát vật lý tại chỗ.
2. **Xác minh = kiểm soát vật lý, không phải tư cách pháp nhân.** Bằng chứng tại chỗ (geotagged) là chuẩn phổ quát; giấy phép kinh doanh chỉ là bằng chứng bổ trợ tùy chọn.
3. **GPS là một kênh, không phải duy nhất.** Luôn kết hợp fused location + chỉnh tay + reverse geocoding + kiểm duyệt người.
4. **Mọi thứ có thể đảo ngược + có vết.** Soft delete, audit log, report, appeal, revoke, dispute — không có hành động phá hoại nào là vĩnh viễn hoặc ẩn danh.

- **Actors:** Customer, Vendor, Admin.
- **External systems:** Goong Maps API, Email/SMS Service, Supabase Storage.
- **Không có:** AI actor, community posts (gộp vào review), bán hàng, crowd-voting, merge engine (Phase 2).
- **Phạm vi địa lý:** giới hạn bán kính quanh Hòa Lạc.

---

## 2. Catalog toàn bộ tính năng app deliver

### 2.1 Customer (sinh viên)

| # | Tính năng | Priority |
|---|---|---|
| C1 | Đăng ký / đăng nhập / quản lý hồ sơ | MUST |
| C2 | Tìm kiếm & duyệt địa điểm: **map view + list view**, filter theo category / subcategory / tag / khu vực | MUST |
| C3 | Xem chi tiết địa điểm: ảnh, giờ mở, sản phẩm, review, rating TB, badge xác minh | MUST |
| C4 | **Đóng góp địa điểm mới** (community contribution) | MUST |
| C5 | **Đề xuất sửa** thông tin địa điểm đã có (suggest-edit: giờ, SĐT, kéo pin, "đã đóng cửa", "trùng lặp") | SHOULD |
| C6 | Viết / sửa / xóa **đánh giá** (rating + nội dung dài + ảnh) — đã hấp thụ phần chia sẻ trải nghiệm | MUST |
| C7 | Bookmark địa điểm + xem danh sách đã lưu | SHOULD |
| C8 | Chia sẻ link địa điểm | COULD |
| C9 | Report địa điểm / review kèm evidence (sai info / spam / đóng cửa / **chủ sở hữu sai** / khác) | SHOULD |
| C10 | Xem top trending (sort theo view + review + recency) | COULD |
| C11 | **Tích lũy uy tín** (trust_score) — đóng góp tốt được auto-publish, đóng góp xấu bị siết | MUST |

### 2.2 Vendor (chủ địa điểm)

| # | Tính năng | Priority |
|---|---|---|
| V1 | Đăng ký Vendor (**bắt buộc verify SĐT qua OTP**) | MUST |
| V2 | **Claim địa điểm đã có** bằng bằng chứng kiểm soát vật lý | MUST |
| V3 | **Đăng ký địa điểm mới** (kèm bằng chứng tại chỗ → auto-own sau duyệt) | SHOULD |
| V4 | **Yêu cầu quyền truy cập (request-access)** địa điểm đã có chủ | SHOULD |
| V5 | Quản lý nhiều địa điểm sở hữu (vendor home) | MUST |
| V6 | Quản lý thông tin địa điểm (giờ, SĐT, mô tả, ảnh) — đổi tên/địa chỉ → duyệt lại | MUST |
| V7 | Quản lý sản phẩm (info-only, giá kèm disclaimer locked, tối đa 50) | SHOULD |
| V8 | Phản hồi review (1 reply / review) | SHOULD |
| V9 | **Duyệt đề xuất sửa** (suggest-edit) cho địa điểm mình sở hữu: Apply / Discard | SHOULD |
| V10 | Xem thống kê cơ bản (view, số review, rating TB) | COULD |
| V11 | Release (từ bỏ) quyền sở hữu | COULD |

### 2.3 Admin

| # | Tính năng | Priority |
|---|---|---|
| A1 | Duyệt địa điểm submit (approve / reject + lý do) | MUST |
| A2 | Xét duyệt claim (đối chiếu OTP + on-site proof + giấy phép) | MUST |
| A3 | **Xử lý tranh chấp ownership từ request-access appeal** (keep / transfer / revoke) | MUST |
| A4 | Xử lý report (sửa / ẩn / gỡ review / bỏ qua / xử lý "chủ sai" + trust +/−) | SHOULD |
| A5 | Xác nhận trùng lặp → ẩn (merge defer Phase 2) | SHOULD |
| A6 | Quản lý user (ban / cảnh cáo / đổi role / chỉnh trust) | MUST |
| A7 | Quản lý category / subcategory / tag | MUST |
| A8 | Duyệt đề xuất sửa cho địa điểm **cộng đồng (chưa chủ)** | SHOULD |
| A9 | Dashboard tổng quan + audit log | COULD |

### 2.4 Chức năng hệ thống (tự động)

| ID | Cơ chế |
|---|---|
| M1 | Duplicate detection (rule-based: string similarity + Haversine < 50m) |
| M2 | Trust score engine (+/− điểm, ngưỡng auto-publish) |
| M3 | Notification (email + in-app) |
| M4 | Location handling (fused location + accuracy + manual pin + reverse geocoding) |
| M5 | Geographic scoping (giới hạn bán kính Hòa Lạc) |

---

## 3. Mô hình 3 tầng tin cậy (xương sống chống gian lận)

> Đây là phần trả lời trực diện câu hỏi "ngồi 1 góc tạo địa điểm ở góc khác". Giá trị (quyền sở hữu) **cố tình** bị tách khỏi hành động rẻ tiền (tạo dữ liệu).

| Tầng | Trạng thái | Ai làm được | Cần bằng chứng gì | Quyền nhận được |
|---|---|---|---|---|
| **A — Đề xuất** | SUBMITTED / suggest-edit | Mọi user đã login, **từ xa cũng được** | Không (chỉ cần điền form) | **Không quyền gì.** Chờ kiểm duyệt. |
| **B — Cộng đồng đã duyệt** | PUBLISHED, **no-owner** | Qua Admin duyệt, hoặc TRUSTED auto-publish | Đã qua kiểm duyệt / dedup | Hiển thị công khai; **không ai sở hữu**; cộng đồng sửa qua suggest-edit |
| **C — Đã xác minh chủ** | PUBLISHED, **owned** | Vendor chứng minh kiểm soát vật lý | **OTP + on-site proof** (giấy phép optional) | Toàn quyền quản lý info chính thức + badge "Đã xác minh" |

**Hệ quả thiết kế cốt lõi:** Lên tầng càng cao → bằng chứng càng đắt. Tạo địa điểm (tầng A) rẻ và **không có payoff** cho kẻ gian (không sở hữu, không điều khiển, không kiếm tiền được). Thứ đáng để gian lận (tầng C) bị khóa sau **sự hiện diện vật lý** — điều người ngồi nhà không giả được.

---

## 4. Tạo địa điểm mới (Location Creation)

### 4.1 Hai đường tạo

| Đường | Actor | Kết quả sau duyệt | Bằng chứng khi tạo |
|---|---|---|---|
| **Đóng góp cộng đồng (UC07)** | Customer | Tầng B — **no-owner** | Không (chỉ info + ảnh + pin) |
| **Đăng ký Vendor (UC14)** | Vendor | Tầng C — **auto-own Vendor đó** | **Bắt buộc on-site proof** (vì nhận quyền sở hữu ngay) |

> **Điểm bịt lỗ hổng quan trọng:** đường Vendor (UC14) **không được** trao quyền sở hữu chỉ vì "đăng là thành chủ". Vì nó nhảy thẳng lên tầng C, nó phải kèm **đúng bộ bằng chứng tại chỗ như khi claim** (mục 6). Nếu không, kẻ gian sẽ né claim bằng cách "đăng ký mới" từ xa. → **BR-60.**

### 4.2 Luồng tạo (chung cho UC07 / UC14)

1. Nhập tên, mô tả, chọn category/subcategory + tag.
2. **Ghim vị trí** trên map / nhập địa chỉ (M4):
   - Hệ thống lấy fused location của thiết bị + **accuracy radius**.
   - **Ghi lại khoảng cách giữa vị trí thiết bị và pin** (signal chống gian lận, xem 4.3).
   - Accuracy > 50m → **bắt kéo pin chỉnh tay** trước khi tiếp tục (BR-42).
3. Upload ảnh (1–5).
4. **M1 dedup:** so tên (similarity) + khoảng cách (Haversine). Nghi trùng (>0.8 AND <50m) → cảnh báo, cho chọn "không trùng" (gắn cờ) hoặc "xem địa điểm gốc".
5. (UC14) Vendor cung cấp **on-site proof** (mục 6).
6. Xác nhận → tạo bản ghi **SUBMITTED** → vào hàng đợi Admin (UC19). TRUSTED có thể fast-track (vẫn tầng B, vẫn no-owner).

### 4.3 Các signal chống gian lận lúc tạo (cho Admin xem)

- **Cờ "pin xa thiết bị":** pin cách vị trí thiết bị lúc submit > ngưỡng (vd 2km) → đánh dấu mềm cho Admin. *Không tự chặn* (có thể hợp lệ: thêm địa điểm đã ghé hôm trước), chỉ là dấu hiệu.
- **Cờ nghi-trùng** từ M1.
- **trust_level người tạo** (NEW/RESTRICTED → soi kỹ; TRUSTED → nhẹ tay).
- **Tài khoản mới + pin lệch xa + đổi tên nhạy cảm** → Admin reject sớm.

---

## 5. Vòng đời địa điểm & quyền sở hữu

### 5.1 Location.status

```
SUBMITTED --approve--> PUBLISHED --hide--> HIDDEN --restore--> PUBLISHED
SUBMITTED --reject--> REJECTED
PUBLISHED --Vendor đổi tên/địa chỉ--> PENDING_RE_APPROVAL --approve--> PUBLISHED
PUBLISHED --confirmed duplicate--> HIDDEN (Admin xác nhận trùng)
(bất kỳ) --Admin soft delete--> DELETED
```

### 5.2 Ownership

```
no-owner (community-owned, tầng B)
   --claim approved (UC20)----------> owned (tầng C)
   --Vendor đăng ký mới approved-----> owned (tầng C, auto)
   --request-access grant/timeout hoặc UC25 dispute transfer--> owned (chủ khác)
owned --Vendor release--> no-owner
owned --Admin revoke (giả mạo)--> no-owner   (mở lại claim)
```

---

## 6. Xác minh quyền sở hữu (Verification) — chi tiết để defense

> Mục tiêu: bộ bằng chứng vừa **chặn kẻ giả danh**, vừa **không loại quán cóc không giấy phép**. Áp cho **claim (UC13)** và **đăng ký mới của Vendor (UC14)**.

### 6.1 Bằng chứng BẮT BUỘC (baseline phổ quát — ai cũng làm được)

1. **OTP về SĐT của listing.** Chứng minh kiểm soát kênh liên lạc công khai của địa điểm.
   - *Ý nghĩa chống gian lận:* người lạ đứng trước quán **không nhận được** OTP gửi về số của quán.
2. **Bằng chứng tại chỗ (on-site proof):** ảnh **hoặc video** geotagged, quay tại địa điểm, **trong khung giờ thực**, cho thấy **biển hiệu** + **mã xác nhận do hệ thống cấp** (viết tay/hiển thị trên màn hình trong khung hình).
   - *Ý nghĩa:* gắn 3 yếu tố độc lập — **vị trí (geotag) + thời gian (timestamp) + mã dùng-một-lần** — mà người ngồi nhà không tổng hợp được.

### 6.2 Bằng chứng TÙY CHỌN (bổ trợ, không bắt buộc)

3. **Giấy phép kinh doanh.** Ai có thì nộp → đánh dấu **bằng chứng mạnh** → Admin fast-track.

> **"Có người có, có người không" được xử lý thế nào:** giấy phép **không bao giờ là điều kiện cần**. Quán cóc / hàng vỉa hè không giấy phép vẫn lên tầng C bằng (1)+(2). Có giấy phép chỉ giúp duyệt nhanh hơn. → **BR-15.**

### 6.3 Admin đối chiếu (UC20)

- Approve **chỉ khi** OTP verified **AND** on-site proof khớp địa điểm.
- Có giấy phép → fast-track.
- Bằng chứng yếu / mâu thuẫn → AF: yêu cầu bổ sung, hoặc reject (tạo claim mới khi gửi lại, không ghi đè — BR-46).

### 6.4 Các trường hợp biên của xác minh

| Trường hợp | Xử lý |
|---|---|
| Listing **chưa có SĐT** (Customer tạo, không số) | Bỏ qua (1); dựa hoàn toàn vào (2) on-site proof + Admin soi kỹ hơn + khuyến khích (3) giấy phép. |
| **GPS yếu trong nhà** khi quay on-site proof | Geotag dùng fused location (WiFi/cell hỗ trợ); nếu vẫn lệch → Admin chấp nhận dựa **mã hệ thống + timestamp + biển hiệu trong khung hình** thay vì chỉ tọa độ. GPS không phải kênh duy nhất (M4). |
| Nhiều Vendor cùng claim một lúc | Chỉ **1 claim/1 request-access PENDING / địa điểm / thời điểm** (BR-61); Admin xét theo bằng chứng mạnh hơn (BR-53). |

---

## 7. Chuyển quyền sở hữu (Ownership Transfer) — chi tiết

> Đây là phần hội đồng khoan sâu nhất (kịch bản chủ thật vs chủ giả). Mô tả đủ luồng: request-access → phản hồi/timeout → transfer/escalation → hold; report/admin-detect → review/revoke → appeal.

### 7.1 Khi nào phát sinh chuyển quyền / tranh chấp

- (a) Vendor B muốn nhận một địa điểm **đã có chủ** A → **Request-Access**.
- (b) **Chỉ khi A Reject request-access và B kháng cáo** → mở **Dispute (UC25)** giữa A và B.
- (c) Report "chủ sở hữu sai" (UC11) → vào **Report queue** (UC22), lưu evidence; Admin xử report, **không tự động mở Dispute**.
- (d) Admin phát hiện chủ hiện tại giả mạo → **Revoke/Admin action**; vendor bị ảnh hưởng có quyền appeal quyết định Admin, nhưng đây là appeal quyết định, **không phải Dispute giữa 2 người**.

### 7.2 Luồng Request-Access (mô hình Google)

1. Vendor B mở địa điểm đã có chủ → bấm **"Yêu cầu quyền truy cập"**.
2. B **tự cung cấp bằng chứng kiểm soát vật lý** như khi claim (mục 6) — vì B đang khẳng định mình mới là người kiểm soát.
3. Hệ thống tạo **RequestAccess PENDING**, **thông báo chủ A** (M3). *(Chỉ cho phép 1 request PENDING / địa điểm — BR-61.)*
4. **Quy tắc N ngày** (mặc định **3 ngày**): A có thời hạn phản hồi:
   - **A Grant** → chuyển quyền cho B (xem hold 7.4).
   - **A Reject** → B có quyền **kháng nghị (appeal) lên Admin** → mở **Dispute (UC25)**. Đây là trigger duy nhất tạo tranh chấp ownership giữa 2 bên.
   - **A im lặng quá N ngày** → coi như **bỏ hoang** → B nhận nút **"Xác minh để nhận quyền"** → B verify đạt → **auto-transfer** cho B (kèm hold bắt buộc, vì không có người vetting).
5. Mọi kết quả đều **ghi audit** + **M3** báo các bên.

> **Tối ưu hạ tầng:** mốc N ngày kiểm theo kiểu **lazy** (tính lúc có truy vấn / lúc B bấm "xác minh để nhận quyền"), **không cần cron job** → giảm nợ kỹ thuật.

### 7.3 Luồng Dispute (UC25) — chỉ từ request-access bị refuse

1. Điều kiện mở dispute: đã có **RequestAccess REJECTED** và Vendor B nộp appeal trong thời hạn cấu hình.
2. Admin mở hồ sơ tranh chấp giữa **chủ hiện tại A** và **Vendor yêu cầu B**, xem **bằng chứng các bên** (OTP, on-site proof, giấy phép nếu có, lịch sử).
3. Đối chiếu mức độ mạnh — **kiểm soát vật lý ưu tiên hơn giấy phép** (BR-53).
4. Quyết định:
   - **RESOLVED_KEEP** — giữ chủ hiện tại.
   - **RESOLVED_TRANSFER** — set owner = bên mạnh hơn.
   - **RESOLVED_REVOKE** — thu hồi, địa điểm về **no-owner**, mở claim mới (BR-54).
5. Bằng chứng hai bên đều yếu → **giữ no-owner** (không trao cho ai).
6. **M3** báo các bên + audit.

> Report "chủ sai" và Admin tự phát hiện giả mạo không đi vào UC25 ngay. Hai nguồn này đi qua report/admin review; nếu Admin ra quyết định bất lợi cho vendor, vendor được appeal quyết định đó bằng evidence bổ sung.

### 7.4 Hold sau chuyển quyền (BR-56 — có điều kiện)

- **Áp dụng khi** quyền được cấp **không qua Admin vetting**: A grant request-access hoặc auto-transfer do timeout 7.2 bước 4.
- **Trong hold N ngày** (mặc định 7), chủ mới **bị chặn các hành động phá hoại**: ẩn địa điểm, xóa hàng loạt sản phẩm, đổi core-info (tên/địa chỉ). Vẫn cho **edit benign** (giờ mở, mô tả, reply review).
- **Không áp dụng** khi transfer do **Admin trực tiếp quyết** (UC25) — vì người đã vetting rồi → hold thừa.

> Đây là chỗ trả lời gọn câu "đổi chủ rồi chủ mới phá thì sao": hold chặn phá hoại đúng cửa sổ rủi ro, và chỉ bật khi không có Admin gác cửa.

### 7.5 Revoke (thu hồi do giả mạo)

- Admin phát hiện chủ hiện tại giả mạo (qua report, dispute hoặc tự kiểm tra) → **REVOKE** → địa điểm về no-owner → cân nhắc **ban** kẻ giả mạo (UC23) + trừ trust.
- Dữ liệu địa điểm **giữ nguyên** (community-owned), chỉ gỡ liên kết owner.
- Vendor bị revoke có quyền **appeal quyết định Admin** bằng evidence bổ sung; appeal này gắn với report/admin action, không tạo Dispute UC25 trừ khi nguồn gốc là request-access bị refuse.

---

## 8. Xử lý case đặc biệt (Defense Q&A)

> Mỗi dòng = một câu hội đồng có thể hỏi + câu trả lời hệ thống. Đây là "khiên" để defense.

| Tình huống tấn công | Hệ thống xử lý | Câu trả lời 1 dòng |
|---|---|---|
| **Ngồi 1 góc, pin & tạo địa điểm ở góc khác** | Tạo = tầng A, no-owner, không quyền; vào kiểm duyệt; ghi cờ "pin xa thiết bị"; dedup; cộng đồng sửa được | "Tạo từ xa không nguy hiểm vì không trao quyền gì — nó chỉ là dữ liệu cộng đồng chờ duyệt." |
| **Giả danh chủ để claim từ xa** | Claim cần OTP về số listing **+** on-site proof geotagged + mã + timestamp | "Quyền sở hữu khóa sau sự hiện diện vật lý — người ngồi nhà không tổng hợp được vị trí+thời gian+mã." |
| **Người lạ đứng trước quán quay video claim** | Vẫn cần **OTP về số của quán** — người lạ không nhận được; nếu listing không số → Admin soi kỹ + ưu tiên giấy phép | "Hai yếu tố độc lập: ở tại chỗ **và** kiểm soát số điện thoại của quán." |
| **Chủ thật không dùng công nghệ / không biết** | Địa điểm sống ở tầng B (cộng đồng duy trì); nếu sau này chủ thật xuất hiện → request-access; nếu bị owner từ chối thì appeal mở dispute; hoặc report "chủ sai" để Admin xử lý | "Không có chủ vẫn ổn; quyền có thể đảo ngược khi chủ thật xuất hiện." |
| **Chủ cũ bỏ hoang tài khoản** | Request-access + timeout 3 ngày → auto-transfer (kèm hold) | "Chủ im lặng quá hạn coi như bỏ hoang, quyền chuyển cho người chứng minh kiểm soát." |
| **Chủ mới (sau auto-transfer) phá hoại** | Hold 7 ngày chặn ẩn/xóa/đổi core-info | "Cửa sổ rủi ro được khóa bằng hold; chỉ bật khi không có Admin vetting." |
| **GPS không bắt được (trong nhà/hầm)** | Fused location (GPS+WiFi+cell) + accuracy radius + bắt kéo pin tay + reverse geocoding | "GPS là một kênh, không phải duy nhất." |
| **Quán cóc không có giấy phép** | Giấy phép optional; on-site proof là baseline | "Xác minh kiểm soát vật lý, không phải tư cách pháp nhân." |
| **Tạo địa điểm trùng** | M1 cảnh báo lúc tạo; Admin xác nhận trùng → ẩn; merge defer | "Phát hiện sớm + ẩn; gộp dữ liệu để Phase 2." |
| **Nhiều DN cùng địa chỉ** | Chấp nhận nếu **khác tên + biển hiệu riêng** | "Cùng địa chỉ được, miễn tách biệt rõ ràng." |
| **1 DN nhiều dịch vụ** | Gộp vào **một địa điểm**, không tạo nhiều bản | "Một doanh nghiệp = một địa điểm." |
| **Vendor đăng ký mới để né claim** | UC14 **bắt buộc on-site proof** mới auto-own (BR-60) | "Đường đăng ký mới chịu đúng bộ xác minh như claim." |
| **Tài khoản mới spam/phá** | trust_level RESTRICTED → submit bị chặn/siết; reject 3 lần → cờ tài khoản | "Uy tín thấp bị siết tự động." |
| **Report vu cáo để hạ đối thủ** | Report sai → M2 **trừ điểm** người report | "Vu cáo có giá: mất uy tín." |

---

## 9. Use Cases (tham chiếu nhanh)

> Đặc tả chi tiết MF/AF/EF của 26 UC nằm ở `Campus-Local-Guide-UseCase-Specs.md`. Bảng dưới là bản đồ tính năng ↔ UC ↔ rule.

| UC | Tên | Tính năng | Rule chính |
|---|---|---|---|
| UC01–04 | Auth (đăng ký/đăng nhập/reset/hồ sơ) | C1, V1 | BR-01…BR-10 |
| UC05–06 | Tìm kiếm & xem chi tiết | C2, C3 | BR-11, BR-12, BR-41, BR-42 |
| UC07 | Đóng góp địa điểm (Customer) | C4 | BR-13, BR-22, BR-26, BR-60 |
| UC08–09 | Bookmark / Share | C7, C8 | BR-23, BR-11 |
| UC10 | Review (đã gộp chia sẻ) | C6 | BR-17, BR-18, BR-19 |
| UC11 | Report kèm evidence (gồm "chủ sai") | C9 | BR-24, BR-27, **BR-64** |
| UC12 | Top trending | C10 | BR-11 |
| UC13 | Claim địa điểm | V2 | BR-14, BR-15, BR-28 |
| UC14 | Đăng ký mới (Vendor) | V3 | **BR-60**, BR-29 |
| UC15–16 | Quản lý info / sản phẩm | V6, V7 | BR-30, BR-16, BR-36, BR-37 |
| UC17 | Reply review | V8 | BR-38, BR-39 |
| UC18 | Thống kê | V10 | BR-18(stat) |
| (mới) | Request-Access | V4 | **BR-61**, BR-56 |
| (mới) | Suggest-edit + duyệt | C5, V9, A8 | routing claimed→Vendor / unclaimed→Admin |
| UC19 | Duyệt địa điểm | A1 | BR-43, BR-44 |
| UC20 | Xét claim | A2 | BR-45, BR-46 |
| UC21 | Quản lý địa điểm + xác nhận trùng | A5 | BR-47 |
| UC22 | Xử lý report | A4 | BR-27, BR-48 |
| UC23 | Quản lý user + trust | A6 | BR-49, BR-50, BR-51 |
| UC24 | Quản lý category/tag | A7 | BR-52 |
| UC25 | Tranh chấp ownership từ request-access appeal | A3 | BR-53, BR-54, **BR-56** |
| UC26 | Dashboard | A9 | BR-43 |

---

## 10. Business Rules bổ sung (nối tiếp Master Spec)

- **BR-56** Sau transfer không qua Admin vetting (A grant request-access hoặc auto-transfer do timeout) → chủ mới bị **hold N ngày** (mặc định 7): chặn ẩn địa điểm / xóa hàng loạt sản phẩm / đổi core-info. **Không áp dụng** với transfer do Admin trực tiếp quyết hoặc revoke theo report/admin action.
- **BR-57** Suggest-edit: địa điểm **claimed** → đề xuất gửi tới **Vendor inbox** (Apply/Discard); địa điểm **no-owner** → vào **Admin queue**. Không dùng crowd-voting.
- **BR-58** Trạng thái trùng lặp tách 2 mức: **nghi-trùng** (M1, cảnh báo, không ẩn) ≠ **confirmed-duplicate** (Admin xác nhận → ẩn).
- **BR-59** Ghi lại khoảng cách pin ↔ vị trí thiết bị lúc submit; lệch xa → cờ mềm cho Admin (không tự chặn).
- **BR-60** Vendor đăng ký địa điểm mới (UC14) **bắt buộc** cung cấp on-site proof như khi claim để được auto-own; thiếu → chỉ tạo ở tầng B (no-owner), phải claim sau.
- **BR-61** Mỗi địa điểm chỉ tồn tại **1 claim hoặc 1 request-access PENDING** tại một thời điểm.
- **BR-62** Nhiều doanh nghiệp cùng địa chỉ vật lý: chấp nhận nếu **khác tên + biển hiệu tách biệt**. Một doanh nghiệp nhiều dịch vụ: gộp vào **một địa điểm**.
- **BR-63** Kháng nghị (appeal): bên bị reject claim / bị đánh dấu trùng có quyền nộp bổ sung bằng chứng (ảnh biển hiệu cố định) → Admin xét lại. Vendor B bị chủ A từ chối request-access có quyền appeal để mở Dispute UC25. Vendor bị ảnh hưởng bởi report "chủ sai" được Admin thông qua hoặc revoke do Admin tự phát hiện có quyền appeal quyết định Admin; appeal này không phải Dispute UC25 giữa 2 người.
- **BR-64** Report phải lưu evidence: loại report, mô tả, ảnh/video/tài liệu đính kèm nếu có, người report, địa điểm/review liên quan, vendor bị ảnh hưởng nếu là report "chủ sai", kết quả xử lý và liên kết tới appeal nếu vendor kháng cáo quyết định Admin.

*(BR-01…BR-55 giữ nguyên ở Master Spec; trust scoring P6, validation P7, rate limit P8, permission P9, notification P10, cross-cutting P11, glossary P12 dùng chung.)*

---

## 11. Domain objects bổ sung

| Đối tượng | Thuộc tính nghiệp vụ chính | Trạng thái |
|---|---|---|
| **RequestAccess** | địa điểm, bên yêu cầu (Vendor), chủ hiện tại, bằng chứng, hạn phản hồi | PENDING / GRANTED / REJECTED / EXPIRED→AUTO_GRANTED / ESCALATED |
| **Report** | địa điểm/review, người report, loại report, mô tả, **evidence**, vendor bị ảnh hưởng nếu là "chủ sai", kết quả xử lý, liên kết appeal nếu có | PENDING / UNDER_REVIEW / APPROVED / REJECTED / APPEALED / RESOLVED |
| **Appeal** | người kháng cáo, quyết định bị kháng cáo (claim/report/admin action/request-access reject), evidence bổ sung, hạn xử lý, kết quả Admin | PENDING / ACCEPTED_TO_DISPUTE / APPROVED / REJECTED / EXPIRED |
| **EditSuggestion** | địa điểm, người đề xuất, trường sửa, giá trị mới, định tuyến (Vendor/Admin) | PENDING / APPLIED / DISCARDED |
| **OwnershipHold** | địa điểm, chủ mới, hạn hold, các action bị chặn | ACTIVE / EXPIRED |

*(Các object còn lại — User, Location, Claim, Dispute, Review, Product, Tag… — ở Master Spec P2.)*

---

## 12. Phạm vi MVP vs Defer

**MVP (làm):** 3 tầng tin cậy, tạo địa điểm (2 đường) + on-site proof, claim/verify, request-access (lazy timeout), dispute chỉ từ request-access appeal, revoke, trust engine, dedup detection, suggest-edit (lean), review, search/map.

**Defer Phase 2:** merge engine (gộp + chuyển review + cộng view), crowd-voting, badge/level/leaderboard UI, request-access có cron real-time, multi-owner/manager.

---

*Full Specification — Campus Local Guide. Mọi cơ chế ownership/verification được thiết kế để tách "tạo dữ liệu" (rẻ, vô hại) khỏi "sở hữu" (đắt, khóa bằng hiện diện vật lý) — đó là câu trả lời gốc cho toàn bộ chất vấn về giả danh và gian lận.*
