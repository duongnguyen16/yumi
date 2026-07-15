# Mobile Redesign Screen & Element Specifications (`DESIGN_SPECS.md`)

This document details every screen and contained UI element in the mobile application (`apps/mobile`) for use in Stitch or other UI design app workflows.

---

## Part 1: Atomic Element Matrix & Inventory

### 1. Status Badges & Pill Indicators
- **Location Status Badge**: Indicator pill rendering status states (`PUBLISHED`, `SUBMITTED`, `REJECTED`, `HIDDEN`, `DELETED`).
- **Workflow Status Badge**: Indicator pill rendering workflow states (`PENDING_OPEN`, `GRANTED`, `REJECTED`, `EXPIRED`, `AUTO_GRANTED`).
- **Unread Counter Pill**: Overlay pill badge displaying active unread count.
- **Rating Score Pill**: Star icon paired with numerical average score text (e.g. `4.5/5.0`).

---

### 2. Form Inputs & Control Components
- **Standard Text Input Box (`TextInput`)**: Input field with label placeholder, optional left icon prefix, and inline error message text label.
- **Secure Secret Input Box**: Text field with interactive end-icon toggle (Eye/Eye-off icon) for password entry.
- **Multiline Text Area**: Resizable multi-line text input field for notes and justification arguments.
- **Search Header Input Bar**: Input bar with left search magnifier icon, clear text button icon, and trailing filter trigger button.
- **Selector Launcher Inputs**: Button fields opening selector modals (Category modal, Sub-Category modal, Operational schedule TimePicker modal).

---

### 3. Buttons & Interactive Controls
- **Primary Action Button**: Full-width action button for main screen setup or form submissions.
- **Secondary Action Button**: Outlined action button for secondary choices.
- **Text Link Button**: Inline text action button (e.g., *"Quên mật khẩu?"*, *"Gửi lại mã OTP"*).
- **Icon Action Buttons**:
  - **GPS Re-center Button**: Circular icon button with crosshairs icon.
  - **Camera Capture Button**: Button block with camera icon label (*"Chụp bằng chứng"* / *"Chụp ảnh bảng hiệu"*).
  - **Top Bar Action Controls**: Back icon button, Share icon button, Report flag icon button, Edit pencil button.
- **Segmented Control Switch**: 2-way horizontal split pill selector (e.g., `Chủ địa điểm` vs `Người yêu cầu`).

---

### 4. Cards & Container Modules
- **Selectable Role Card**: Choice card container with icon, section title (*"Khách hàng"* vs *"Chủ quán / Doanh nghiệp"*), and selection indicator.
- **Notification Item Card**: List card with category icon, unread status dot, subject text, preview snippet, and datetime label (`dd/mm/yyyy hh:mm`).
- **Location Search Result Card**: List card displaying thumbnail photo/icon, place title, distance indicator pill, category tag, and address text.
- **Product Showcase Card**: Product card displaying item thumbnail, name text, description text, price formatted numeral, and item management buttons (Edit, Delete).
- **Vendor Dashboard Stat Tile**: Grid tile displaying metric icon, numerical count, metric title, and status pill.
- **Timeline / Evidence Display Box**: Container housing submitted argument text, original admin decision reason text, and proof image frames.

---

### 5. Modals, Sheets & Overlays
- **Bottom Option Sheet**: Sliding popup presenting action rows (*Chỉnh sửa thông tin, Báo cáo địa điểm, Xin chuyển quyền, Gọi điện thoại*).
- **Confirmation Dialog**: Centered modal popup with title label, prompt text body, and dual action buttons (*Hủy* vs *Xác nhận*).
- **Category Filter Modal (`Category`)**: Modal listing category options with search filter text area.
- **SubCategory Filter Modal (`SubCategory`)**: Modal container housing multi-select tag chips.
- **Interactive Pin Setup Sheet (`GetNewLocation`)**: Full map overlay sheet with center crosshairs pin target and location confirmation button.
- **Phone OTP Verification Dialog (`PhoneVerificationModal`)**: Modal dialog with Phone number field, OTP dispatch button, 6-digit pin code input, resend countdown label, and verification button.

---

## Part 2: Screen Element Manifests

Screen list and all contained visual elements across every app route:

```
─────────────────────────────────────────────────────────────────────────────────
1. AUTHENTICATION SCREENS
─────────────────────────────────────────────────────────────────────────────────

[SCREEN] Route: /app/auth/login.tsx & LoginForm.tsx
└── Title: Đăng nhập
├── Inputs:
│   ├── Email / Phone Input Field (Left User Icon)
│   └── Password Input Field (Right Eye-Toggle Icon)
├── Buttons:
│   ├── "Đăng nhập" Primary Submit Button
│   ├── "Quên mật khẩu?" Action Link Button
│   └── "Chưa có tài khoản? Đăng ký" Navigation Link
└── Feedback:
    └── Inline Form Error Message Label

[SCREEN] Route: /app/auth/register.tsx
└── Title: Đăng ký tài khoản (Multi-step View)
├── Step 1 (Role Selection):
│   ├── "Khách hàng" Role Select Card (Icon, Title, Subtitle, Radio Marker)
│   ├── "Chủ quán / Doanh nghiệp" Role Select Card (Icon, Title, Subtitle, Radio Marker)
│   └── "Tiếp tục" Continuation Button
├── Step 2 (Information Form):
│   ├── Full Name Input Field
│   ├── Email Address Input Field
│   ├── Phone Number Input Field
│   ├── Password Input Field (Eye-Toggle Icon)
│   ├── Confirm Password Input Field (Eye-Toggle Icon)
│   ├── Business Tax Code Input Field (Vendor mode conditional)
│   ├── "Đăng ký" / "Tiếp theo" Submit Button
│   └── "← Quay lại đổi vai trò" Action Link Button
└── Step 3 (Phone OTP Verification):
    ├── OTP Description Label & Phone Number Text Display
    ├── 6-Digit OTP Code Input Field
    ├── "Xác nhận OTP" Verification Button
    ├── "Gửi lại mã OTP" Resend Action Button (Text Mode)
    └── "← Quay lại chỉnh sửa thông tin" Back Link Button

[SCREEN] Route: /app/auth/forgot-password.tsx
└── Title: Quên mật khẩu
├── Content: Description & Instructions Text Block
├── Inputs: Registered Email Address Input Field
├── Buttons: "Gửi mã xác nhận" Primary Action Button
└── Feedback: Submission Error Message Text Label

[SCREEN] Route: /app/auth/reset-password.tsx
└── Title: Đặt lại mật khẩu
├── Inputs:
│   ├── Registered Email Field (Disabled mode)
│   ├── 6-Digit OTP Code Input Field
│   ├── New Password Input Field (Eye-Toggle Icon)
│   └── Confirm New Password Input Field (Eye-Toggle Icon)
├── Buttons:
│   ├── "Gửi lại mã" Timer Action Button
│   └── "Đặt lại mật khẩu" Submit Button
└── Feedback: Submission Error Message Text Label

─────────────────────────────────────────────────────────────────────────────────
2. MAIN BOTTOM TAB SCREENS
─────────────────────────────────────────────────────────────────────────────────

[SCREEN] Route: /app/(tabs)/home.tsx & MapScreen.tsx
└── Title: Home & Map Canvas
├── Top Header Elements:
│   └── Floating Top Search Bar (Search Icon, Placeholder text, Category Filter Trigger Button, Clear Button Icon)
├── Canvas Area:
│   ├── Map Canvas Container
│   ├── Vector Map Place Markers
│   └── User Geolocation Position Marker Layer
├── Floating Controls:
│   └── GPS Re-center Floating Action Button (Crosshairs Icon)
└── Modals & Overlays:
    ├── Category & Sub-Category Selection Dialog Sheets
    ├── Full Search Overlay View (Search field + Search Result List Cards)
    └── Map Error Loading State Card (with Retry Reload Action Button)

[SCREEN] Route: /app/(tabs)/notifications.tsx
└── Title: Thông báo
├── Header Controls:
│   ├── Page Title Header "Thông báo"
│   ├── Unread Counter Pill Badge ("X chưa đọc")
│   └── "Đánh dấu tất cả là đã đọc" Text Action Button
├── List Components:
│   └── Notification List rendered with Notification Item Cards:
│       ├── Status Category Icon
│       ├── Unread Bullet Dot Marker
│       ├── Subject Title Text
│       ├── Message Preview Description
│       └── Datetime Label Tag ("dd/mm/yyyy hh:mm")
└── Empty & Loading States:
    ├── Center Activity Loading Indicator
    └── Empty Message Label ("Chưa có thông báo nào")

[SCREEN] Route: /app/(tabs)/profile.tsx & PhoneVerificationModal.tsx
└── Title: Hồ sơ cá nhân
├── User Profile Header Card:
│   ├── User Avatar Image Container (with Camera Edit Overlay Button)
│   ├── Full Name Text Display
│   ├── Email Address Text Display
│   └── Account Role Badge Chip ("Khách hàng" / "Chủ quán")
├── Menu Option Lists:
│   ├── Phone Verification Status Row (Verified Status Badge vs. "Xác minh ngay" Button)
│   ├── "Quản lý kinh doanh (Vendor Dashboard)" Menu Row (Vendor accounts)
│   ├── "Đăng ký địa điểm mới" Menu Action Card Row
│   ├── "Kháng cáo của tôi" Menu Action Card Row
│   ├── "Tranh chấp sở hữu" Menu Action Card Row
│   ├── "Yêu cầu nhượng quyền" Menu Action Card Row
│   ├── "Đổi mật khẩu" Password Reset Action Row
│   └── "Đăng xuất" Logout Action Row (Logout Icon & Label)
└── Overlays & Modals:
    ├── Avatar Upload Sheet Options ("Chụp ảnh mới", "Chọn từ thư viện")
    └── Phone Verification Modal Overlay (Phone input, OTP text field, Countdown Timer label, Submit button)

─────────────────────────────────────────────────────────────────────────────────
3. LOCATION MANAGEMENT SCREENS
─────────────────────────────────────────────────────────────────────────────────

[SCREEN] Route: /app/location/[id].tsx & LocationDetailScreen.tsx
└── Title: Chi tiết địa điểm
├── Header Banner Stack:
│   ├── Cover Photo Banner Container
│   ├── Floating Header Controls: Back Button, Share Button, Report Flag Button, Edit Pencil Button
│   └── Header Content: Location Title Headline, Rating Score Pill Badge, Category Chips
├── Navigation Tab Bar:
│   └── 3-Tab Selector Row: [Tổng quan] | [Đánh giá] | [Hình ảnh]
├── Tab 1: Overview Tab (GeneralTab.tsx):
│   ├── Physical Address Row with Map Pin Icon
│   ├── Schedule Accordion (Status Pill "Đang mở cửa", Operational schedule log)
│   ├── Owner Profile Banner & "Xin chuyển quyền quản lý" Access Request Button
│   ├── Contact Channels Section (Phone launcher, Website link, Social buttons)
│   └── Menu Catalog Section (ProductSection.tsx):
│       ├── Section Heading Title & "Thêm món/sản phẩm" Action Button
│       └── Product Cards List (Photo Thumbnail, Item Name, Item Description, Price Text, Edit/Delete Action Icons)
├── Tab 2: Reviews Tab (ReviewTab.tsx):
│   ├── Rating Summary Header Card (Average score numerical box, score distribution progress bars, total review count)
│   ├── Interactive 5-Star Input Rating Selector & Comment Text Box (with Camera attachment button & submit review button)
│   ├── Star Category Filter Chips (All, 5★, 4★, 3★, 2★, 1★)
│   └── Customer Review Cards List (User Avatar, Name, Date Label, Star Rating, Review Body, Photo Grid, Vendor Response Box)
├── Tab 3: Photos Gallery Tab (PictureTab.tsx):
│   └── Location Photo Gallery Grid View Frame
└── Modals:
    ├── Report Location Reason Category Modal Dialog
    └── Edit Location Option Bottom Sheet

[SCREEN] Route: /app/location/edit/[id].tsx & EditLocationScreen.tsx
└── Title: Chỉnh sửa thông tin địa điểm
├── Section Filters: Horizontal Scroll Section Filter Chips
├── Form Cards:
│   ├── Location Name Input Field
│   ├── Category & Sub-Category Selection Input Launchers
│   ├── Street Address Text Input & "Sửa vị trí trên bản đồ" Map Setup Pin Launcher Button
│   ├── Contact Telephone Field with Phone OTP Verification trigger button
│   ├── Opening Time & Closing Time Picker Buttons (TimePickerModal launcher)
│   └── Image Upload Section (Photo preview list, camera launch button, cross deletion overlay icons)
└── Footer Action:
    └── Sticky Bottom "Lưu thay đổi" Save Action Button

─────────────────────────────────────────────────────────────────────────────────
4. CONTRIBUTIONS & OWNERSHIP CLAIMS
─────────────────────────────────────────────────────────────────────────────────

[SCREEN] Route: /app/contribute/index.tsx
└── Title: Đóng góp địa điểm mới
├── Header Navigation: Back Icon Button & Step Indicator Header
├── Form Scroll View Sections:
│   ├── Geolocation Pin Step: Map Preview Canvas, Center Pin Crosshair visual focus, Latitude/Longitude readouts, and "Lấy vị trí hiện tại" GPS Sync Button
│   ├── Basic Info Step: Place Name Field, Address Field, Category Selector Dropdown Button, Sub-Category Chip Group
│   ├── Details & Schedule Step: Phone Input Field, Opening/Closing Schedule Pickers, Business Description Multiline Text Field
│   ├── Storefront Photos Step: "Chụp ảnh địa điểm / Bảng hiệu" Camera Trigger Button, Photo Thumbnails List with Delete Cross Buttons
│   └── Duplicate Detection Card: Duplicate Warning Alert Card ("Địa điểm trùng lặp khả nghi")
└── Sticky Footer:
    └── "Gửi duyệt địa điểm" Primary Action Submit Button

[SCREEN] Route: /app/claim/[locationId].tsx
└── Title: Xác minh chủ sở hữu
├── Location Target Card: Target Location Title & Address Summary Card
├── Step 1 Details: Contact Phone Input Field, Tax Identification Code Input Field, "Gửi mã OTP" Button
├── Step 2 Verification: 6-Digit Phone OTP Code Field, "Xác nhận OTP" Button
├── Step 3 Evidence: Storefront / Business License Camera Launcher Button, Captured Photo Preview Frame, "Gửi yêu cầu sở hữu" Submit Button
└── Feedback: Error Message Banner Card

─────────────────────────────────────────────────────────────────────────────────
5. WORKFLOWS: APPEALS, DISPUTES & ACCESS REQUESTS
─────────────────────────────────────────────────────────────────────────────────

[SCREEN] Route: /app/appeals/index.tsx
└── Title: Danh sách kháng cáo
├── Header Title: Kháng cáo của tôi
├── Appeal List Items: Pressable Appeal Cards (Appeal Category Title, 2-line Text Preview, Status Badge Pill)
└── Layout States: Empty List Card ("Bạn chưa có kháng cáo.") & Center Loading Indicator

[SCREEN] Route: /app/appeals/new.tsx & /app/appeals/[id].tsx
└── Title: Gửi & Chi tiết kháng cáo
├── Form View (/new.tsx):
│   ├── Argument Justification Multiline Text Field
│   ├── Camera Evidence Capture Button ("Chụp bằng chứng")
│   ├── Photo Preview Display Box (Image frame)
│   └── "Gửi kháng cáo" Primary Submit Button
└── Detail View (/[id].tsx):
    ├── Appeal Category Title Header
    ├── Submitted Argument Text Box & Resolution Status Pill Badge
    ├── Original Decision Summary Card (Rejection explanation text, Deadline date tag)
    └── "Mở hồ sơ tranh chấp" Direct Link Button (Visible when Dispute context exists)

[SCREEN] Route: /app/disputes/index.tsx & /app/disputes/[id].tsx
└── Title: Tranh chấp sở hữu
├── List View (/index.tsx): Dispute Item Cards (Location Name, Address label, Status Pill)
└── Detail View (/[id].tsx):
    ├── Disputed Target Location Header Banner
    ├── Vendor A Summary Card (Current Owner Name, Email, Evidence item count badge)
    ├── Vendor B Summary Card (Claimant Name, Email, Evidence item count badge)
    ├── Evidence Form Card (Active OPEN Disputes): Photo Preview frame, Camera trigger button, Submit Evidence button
    └── Decision Verdict Box (Closed Disputes): Admin decision outcome label & reasoning text

[SCREEN] Route: /app/request-access/index.tsx
└── Title: Yêu cầu nhượng quyền
├── Selector Switch Bar: 2-Way Segmented Tabs ("Chủ địa điểm" vs "Người yêu cầu")
└── Access Item Cards: Target Location Title, Requester/Owner Identity Subtitle, Request Timeline Status Pill Badge (PENDING_OPEN, GRANTED, REJECTED, EXPIRED, AUTO_GRANTED), Submission Date Label

[SCREEN] Route: /app/request-access/new/[locationId].tsx & /app/request-access/[id].tsx
└── Title: Tạo & Chi tiết yêu cầu quyền quản lý
├── New Request View (/new/[locationId].tsx):
│   ├── Target Place Title & Owner 3-Day Rule Notification Header
│   ├── Reason Notes Multiline Text Area Box
│   └── "Gửi yêu cầu" Submit Button
└── Detail View (/[id].tsx):
    ├── Request Expiration Timeline Card & Current Status Pill
    ├── Requester & Place Justification Detail Summary Card
    ├── Owner Response Action Card (Owner View): "Đồng ý chuyển quyền" Action Button vs "Từ chối" Action Button
    └── Verification Evidence Card (Requester View): Captured Storefront Photo Box, Camera Launch Button, "Gửi xác minh" Final Submit Button

─────────────────────────────────────────────────────────────────────────────────
6. BUSINESS MANAGEMENT & VENDOR DASHBOARD
─────────────────────────────────────────────────────────────────────────────────

[SCREEN] Route: /app/vendor/dashboard.tsx
└── Title: Dashboard Nhà Cung Cấp
├── Top Analytics Stat Tile Grid (2x2 Grid):
│   ├── Total Locations Stat Tile (Number, Icon, Label "Địa điểm")
│   ├── Total Views Stat Tile (Number, Icon, Label "Lượt xem")
│   ├── Total Reviews Stat Tile (Number, Icon, Label "Đánh giá")
│   └── Average Rating Score Stat Tile (Number, Star Icon, Label "Điểm TB")
├── Time Range Selector Chips:
│   └── 3 Filter Chips ("Tất cả" | "7 ngày" | "30 ngày")
├── Location Analytics Cards List:
│   └── Location Item Metric Cards: Location Title & Address, Performance Metrics (Views count, Reviews count, Rating Badge)
└── Empty State:
    └── Empty State Card & "Đăng ký địa điểm" Navigation Setup Button
```
