# Thiết kế cải tiến UI xét duyệt Admin

## Mục tiêu

Làm cho hai luồng `Kháng cáo` và `Duyệt địa điểm` dễ quét, dễ hiểu và an toàn khi thao tác, đồng thời giữ nguyên API, business rule, tab `Chờ xử lý / Lịch sử` và mô hình bảng + drawer hiện tại.

## Phạm vi

- Cải tiến bảng danh sách và drawer chi tiết của `/admin/appeals`.
- Cải tiến bảng danh sách và drawer chi tiết của `/admin/location-requests`.
- Việt hóa toàn bộ enum, nhãn dữ liệu và nội dung quyết định nhìn thấy trong hai luồng.
- Giữ thao tác nhanh trên bảng. Thao tác nhanh chỉ mở drawer ở đúng chế độ; quyết định cuối cùng vẫn được xác nhận trong drawer.
- Giữ lịch sử ở chế độ chỉ đọc, nhưng vẫn hiển thị trạng thái, lý do và thời điểm xử lý.
- Không thay đổi endpoint, payload, trạng thái backend hoặc các màn hình admin khác.

## Ngôn ngữ hiển thị

Các giá trị kỹ thuật vẫn được gửi về backend như hiện tại, nhưng UI dùng nhãn tiếng Việt tập trung:

- Loại kháng cáo: từ chối yêu cầu quyền truy cập, từ chối địa điểm, ẩn địa điểm trùng lặp, thu hồi quyền sở hữu, gỡ đánh giá, cảnh cáo tài khoản và khóa tài khoản.
- Kết quả kháng cáo: chuyển sang tranh chấp, đảo quyết định và giữ nguyên quyết định.
- Trạng thái: chờ xử lý, chuyển sang tranh chấp, đã đảo quyết định và giữ nguyên quyết định.
- Loại phiếu địa điểm: tạo địa điểm mới và cập nhật địa điểm.
- Trạng thái phiếu địa điểm: chờ xử lý, đã duyệt và đã từ chối.
- Khóa dữ liệu đề xuất phổ biến như `name`, `address`, `categoryId`, `location`, `phone`, `website`, `description` được đổi thành nhãn tiếng Việt. Giá trị chưa xác định vẫn hiển thị an toàn thay vì mất dữ liệu.

## Bảng danh sách

### Kháng cáo

- Loại và trạng thái dùng badge đã Việt hóa, có màu theo ý nghĩa.
- Nội dung kháng cáo hiển thị tối đa hai dòng thay vì một dòng bị cắt hoàn toàn.
- Hạn xử lý thể hiện thêm trạng thái còn hạn hoặc quá hạn khi phù hợp.
- Nút `Xem hồ sơ` có vùng bấm rõ ràng và nhãn trên màn hình đủ rộng.

### Duyệt địa điểm

- Loại phiếu và trạng thái dùng nhãn tiếng Việt thống nhất.
- Cờ cảnh báo có biểu tượng, màu và nội dung dễ hiểu.
- Giữ ba thao tác nhanh `Xem`, `Duyệt`, `Từ chối`; trên desktop có nhãn, trên màn hình hẹp có thể thu gọn nhưng vẫn giữ tooltip và nhãn truy cập.
- Hành động nhanh `Duyệt` mở drawer bình thường; `Từ chối` mở drawer trực tiếp ở chế độ nhập lý do.

## Drawer kháng cáo

- Tăng chiều rộng hợp lý trên desktop; mobile tiếp tục chiếm toàn màn hình.
- Phần đầu tóm tắt người kháng cáo, loại hồ sơ và trạng thái hiện tại.
- Tách rõ quyết định gốc, lý do gốc, nội dung kháng cáo và bằng chứng bổ sung.
- Thay chip enum nhỏ bằng các thẻ lựa chọn lớn, cao tối thiểu 56 px, có biểu tượng, tiêu đề tiếng Việt và mô tả hậu quả.
- Với kháng cáo từ chối quyền truy cập, chỉ hiển thị `Chuyển sang tranh chấp` và `Giữ nguyên quyết định`.
- Với các loại còn lại, chỉ hiển thị `Đảo quyết định` và `Giữ nguyên quyết định`.
- Nút xác nhận phản ánh lựa chọn hiện tại, bị vô hiệu hóa khi lý do dưới 5 ký tự, và không đổi payload backend.
- Drawer lịch sử thay vùng lựa chọn bằng khối kết quả chỉ đọc đã Việt hóa.

## Drawer duyệt địa điểm

- Tăng chiều rộng và phân cấp rõ phần thông tin địa điểm, cảnh báo, metadata và dữ liệu đề xuất.
- Cảnh báo trùng lặp hoặc pin xa được trình bày như khối cảnh báo thay vì chip nhỏ rời rạc.
- Dữ liệu đề xuất dùng nhãn tiếng Việt, cho phép xuống dòng và không cắt các giá trị quan trọng.
- Chế độ từ chối có tiêu đề giải thích, bộ đếm yêu cầu tối thiểu 5 ký tự và nhãn `ID địa điểm gốc` hoàn toàn bằng tiếng Việt.
- Footer giữ `Đóng`, `Từ chối`, `Duyệt`; trạng thái đang gửi phải rõ và chặn thao tác lặp.
- Drawer lịch sử hiển thị kết quả, lý do và thời điểm xử lý bằng nhãn tiếng Việt.

## Khả năng truy cập và responsive

- Mọi điều khiển có vùng bấm tối thiểu 44 px; thẻ quyết định tối thiểu 56 px.
- Trạng thái chọn không chỉ dựa vào màu mà còn có icon và viền.
- Có `aria-label` cho nút chỉ có icon và `aria-pressed` cho lựa chọn quyết định.
- Bảng vẫn cuộn ngang khi cần; nhãn hành động tự thu gọn ở breakpoint nhỏ.
- Giữ hỗ trợ `prefers-reduced-motion` từ theme hiện tại.

## Kiểm thử và tiêu chí hoàn thành

- Test tập trung xác nhận mọi loại, trạng thái và khóa dữ liệu đã biết đều có nhãn tiếng Việt; giá trị lạ có fallback dễ đọc.
- Test xác nhận từng loại kháng cáo chỉ nhận đúng tập lựa chọn hợp lệ và nội dung mô tả tương ứng.
- ESLint và Next build của workspace web phải qua.
- Kiểm tra trực tiếp cả hai route ở desktop và mobile: bảng, thao tác nhanh, drawer, validation lý do, lựa chọn quyết định và lịch sử chỉ đọc.
- Không xuất hiện enum kỹ thuật hoặc chuỗi `Optional` trong UI của hai luồng sau khi hoàn tất.
