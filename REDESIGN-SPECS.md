# Mobile App Redesign Specification

> Đặc tả hợp nhất cho **kiến trúc thông tin, điều hướng, bố cục màn hình và visual design** của ứng dụng bản đồ địa điểm.
>
> Phong cách mục tiêu: tối giản, cao cấp và có nhịp điệu gần với các ứng dụng Apple hiện đại, nhưng dùng **solid surfaces 100%**, không blur và không nền trong suốt.
>
> Nguyên tắc kỹ thuật quan trọng nhất: **universal components first**. Màn hình được tạo bằng cách ghép các component dùng chung, không tạo một bộ UI riêng cho từng route.

---

# 1. Design direction

Tên nội bộ của hệ thống: **Solid Spatial UI**.

Công thức thiết kế:

```text
Spatial canvas
+ solid layered surfaces
+ clear typography
+ large rounded geometry
+ familiar native patterns
+ restrained motion
+ universal components
= minimal, calm and premium mobile UI
```

Thiết kế lấy cảm hứng từ các đặc điểm quan sát được ở Apple Maps:

- Bản đồ hoặc nội dung chính luôn là lớp nền quan trọng nhất.
- Thông tin mở dần bằng bottom sheet thay vì chuyển màn hình liên tục.
- Search, toolbar và actions được đặt gần ngón tay.
- Typography lớn, rõ, ít cấp độ nhưng phân cấp mạnh.
- Nút và card bo tròn rộng, không dùng chi tiết trang trí thừa.
- Một trạng thái chỉ có một hành động chính nổi bật.
- Giao diện có cảm giác vật lý nhờ khoảng cách, border và elevation nhẹ.

Không sao chép asset, logo hoặc bố cục độc quyền của Apple. Mục tiêu là đạt được **sự bình tĩnh, rõ ràng và tự nhiên**, không tạo một bản sao Apple Maps.

---

# 2. Non-negotiable rules

## 2.1 Solid surfaces only

Tất cả surface chứa nội dung phải opaque 100%:

- Bottom sheet.
- Navigation bar.
- Bottom tab bar.
- Search field.
- Card.
- Button.
- Toolbar.
- Modal.
- Toast.

Không sử dụng:

```css
backdrop-filter: blur(...);
filter: blur(...);
background: rgba(..., alpha < 1); /* cho surface */
opacity: ...; /* trên cả container */
```

Alpha chỉ được phép dùng cho:

- Shadow.
- Pressed-state overlay.
- Modal scrim.
- Disabled icon hoặc text token đã định nghĩa.

## 2.2 Universal components first

Không tạo component theo tên màn hình khi một component dùng chung có thể giải quyết được.

Không nên:

```text
AppealStatusCard
VendorRequestCard
DisputeStatusCard
NotificationStatusCard
```

Nên dùng:

```text
ActivityRow
+ leading icon
+ title
+ subtitle
+ status badge
+ metadata
+ optional action
```

Khác biệt giữa màn hình phải được thể hiện bằng:

- Props.
- Variant.
- Data.
- Slot.
- Token.

Không bằng một stylesheet hoặc component hoàn toàn mới.

## 2.3 Customize by tokens, not one-off styles

Mọi màn hình phải dùng chung:

- Color tokens.
- Spacing scale.
- Radius scale.
- Typography scale.
- Elevation scale.
- Motion tokens.

Không cho phép:

- Radius riêng cho một màn hình.
- Màu xanh riêng cho một feature.
- Padding 17 px vì “trông vừa hơn”.
- Button mới chỉ vì label dài hơn.
- Header tự thiết kế lại trên từng route.

## 2.4 Progressive disclosure

Chỉ hiện dữ liệu cần cho quyết định hiện tại.

Ví dụ:

```text
Map marker
→ Place preview
→ Expanded place detail
→ Full reviews or gallery
```

Không đưa toàn bộ dữ liệu địa điểm lên ngay màn hình đầu.

## 2.5 One primary action per state

Mỗi màn hình hoặc mỗi trạng thái sheet chỉ có một CTA primary.

Ví dụ:

- `Chỉ đường`
- `Tiếp tục`
- `Gửi duyệt`
- `Xác nhận`
- `Lưu thay đổi`

Các action còn lại dùng secondary, tertiary hoặc menu.

---

# 3. Product architecture problems to solve

Cấu trúc cũ dùng ba bottom tab:

1. Home / Map.
2. Notifications.
3. Profile.

Các vấn đề chính:

- `Profile` đang trở thành kho chứa mọi nghiệp vụ.
- `Notifications` chiếm một destination cấp cao dù chỉ là một loại activity.
- Địa điểm đã đóng góp và địa điểm đang quản lý không có không gian riêng.
- Appeals, disputes và access requests bị tách khỏi timeline hoạt động.
- Map, search và location detail bị chia thành nhiều màn hình rời rạc.
- Nhiều form dài không thể hiện tiến độ và dễ gây lỗi nhập liệu.
- UI có nguy cơ tạo quá nhiều loại card và modal riêng cho từng feature.

Redesign phải tổ chức ứng dụng theo **nhu cầu người dùng**, không theo module backend.

---

# 4. New bottom navigation

## 4.1 Four destinations

Bottom navigation dùng bốn item ổn định cho mọi role:

| Tab | Icon semantic | Trách nhiệm |
|---|---|---|
| Khám phá | Map / Compass | Map, search, category, location detail |
| Của tôi | Building / Bookmark | Contributions, managed places, drafts, analytics |
| Hoạt động | Bell / Activity | Notifications, moderation, appeals, disputes, requests |
| Tài khoản | Person | Profile, verification, security, settings |

```text
[ Khám phá ] [ Của tôi ] [ Hoạt động ] [ Tài khoản ]
```

## 4.2 Why not three items

Ba item cũ không phản ánh đúng trọng lượng sản phẩm:

- Home là trải nghiệm khám phá.
- Notifications chỉ là tín hiệu.
- Profile bị quá tải.

Tab `Của tôi` tạo một ngôi nhà rõ ràng cho dữ liệu gắn với người dùng, còn `Hoạt động` hợp nhất mọi thay đổi và yêu cầu.

## 4.3 Why contribution is not a tab

`Thêm địa điểm` là action, không phải destination.

Nó xuất hiện tại:

- Floating action trên Khám phá.
- Primary button trong Của tôi.
- Context action khi chọn một vị trí trên map.

## 4.4 Bottom bar visual specification

```text
Height: 64–72 px + safe area
Background: surface-base, opaque 100%
Top border: 1 px border-subtle
Item count: exactly 4
Icon: 23–25 px
Label: 11–12 px, medium
Selected: accent-primary
Unselected: text-secondary
```

Quy tắc:

- Không dùng blur.
- Không biến tab bar thành floating glass capsule.
- Không tạo background pill riêng cho từng selected tab.
- Badge chỉ dùng cho unread hoặc item cần phản hồi.
- Không thay đổi số tab theo account role.

## 4.5 Hide tab bar on focused tasks

Ẩn tab bar trong:

- Authentication.
- Contribution wizard.
- Edit location wizard.
- Ownership claim wizard.
- Full-screen camera.
- Full-screen gallery.
- Deep workflow detail khi người dùng phải hoàn thành một task.

---

# 5. Global information architecture

```text
ROOT
├── Authentication
│   ├── Login
│   ├── Register
│   ├── Recover Account
│   └── Reset Password
│
├── Explore
│   ├── Map Home
│   ├── Search Sheet
│   ├── Category Sheet
│   ├── Place Preview Sheet
│   ├── Place Expanded Sheet
│   ├── Reviews
│   ├── Photo Gallery
│   ├── Report Place
│   └── Directions Handoff
│
├── Mine
│   ├── Overview
│   ├── Managed Places
│   ├── Submitted Places
│   ├── Drafts
│   ├── Moderation Status
│   ├── Vendor Analytics
│   ├── Add Place
│   └── Edit Place
│
├── Activity
│   ├── Unified Feed
│   ├── Notifications
│   ├── Appeals
│   ├── Ownership Disputes
│   ├── Access Requests
│   └── Activity Detail
│
└── Account
    ├── Profile
    ├── Phone Verification
    ├── Business Identity
    ├── Security
    ├── Notification Settings
    ├── Appearance
    ├── Help
    └── Logout
```

Mỗi tab giữ navigation stack riêng. Khi chuyển tab rồi quay lại, map position, selected place và scroll position được giữ nguyên.

---

# 6. Universal component strategy

## 6.1 Component hierarchy

```text
Foundation
├── Color tokens
├── Typography tokens
├── Spacing tokens
├── Radius tokens
├── Elevation tokens
└── Motion tokens

Primitives
├── Box
├── Stack
├── Inline
├── Text
├── Icon
├── Divider
└── Pressable

Controls
├── Button
├── IconButton
├── TextField
├── SearchField
├── TextArea
├── SelectField
├── Checkbox
├── Radio
├── Switch
├── SegmentedControl
├── Chip
└── Badge

Containers
├── Screen
├── NavigationBar
├── BottomTabBar
├── BottomSheet
├── Card
├── Section
├── List
├── ListRow
└── FloatingToolbar

Patterns
├── EmptyState
├── ErrorState
├── LoadingState
├── FormSection
├── Stepper
├── MediaPicker
├── ActivityRow
├── PlaceRow
├── MetricBlock
├── Timeline
└── ConfirmationDialog
```

## 6.2 Component budget

Mục tiêu:

- Khoảng 20–30 public UI components.
- Mỗi component có ít variant rõ ràng.
- Ít nhất 80% UI màn hình được dựng từ component có sẵn.
- Không quá hai custom visual patterns cho một feature lớn.
- Custom map marker và map camera behavior là ngoại lệ hợp lệ.

## 6.3 Variant policy

Ví dụ `Button`:

```ts
variant: "primary" | "secondary" | "tertiary" | "destructive"
size: "small" | "medium" | "large"
width: "content" | "full"
loading?: boolean
icon?: IconName
```

Không tạo:

```text
LoginButton
SubmitAppealButton
SaveLocationButton
VendorApproveButton
```

Ví dụ `ListRow`:

```ts
leading?: Icon | Image | Avatar
label: string
value?: string
supportingText?: string
trailing?: Chevron | Badge | Switch | Action
state?: "default" | "unread" | "disabled" | "danger"
```

Component này phải phục vụ được:

- Account menu.
- Contact information.
- Opening hours.
- Notification preference.
- Security settings.
- Place metadata.

## 6.4 Platform-first rule

Ưu tiên theo thứ tự:

1. Component native hoặc component đã được framework hỗ trợ tốt.
2. Universal design-system component.
3. Feature composition từ universal components.
4. Custom component chỉ khi ba lựa chọn trên không giải quyết được.

Không custom lại hành vi native quen thuộc chỉ để tạo khác biệt thị giác.

Ví dụ:

- Dùng navigation back convention chuẩn.
- Dùng sheet gesture chuẩn.
- Dùng system keyboard, picker và accessibility behavior.
- Dùng icon set nhất quán như SF Symbols trên iOS hoặc một universal icon set tương đương.

---

# 7. Visual foundation

# 7.1 Color system

Dark theme là định hướng mặc định.

```css
:root {
  /* Spatial canvas */
  --canvas-map: #33465C;
  --canvas-map-road: #74859A;
  --canvas-map-road-secondary: #596B80;
  --canvas-map-water: #173A7A;

  /* Solid surfaces */
  --surface-app: #101114;
  --surface-base: #1C1C1E;
  --surface-raised: #242426;
  --surface-elevated: #2C2C2E;
  --surface-control: #182B3A;
  --surface-control-pressed: #21394B;
  --surface-field: #2A2A2D;
  --surface-media: #303033;

  /* Lines */
  --border-subtle: #343438;
  --border-strong: #4A4A50;
  --separator: #35353A;

  /* Text */
  --text-primary: #F5F5F7;
  --text-secondary: #A7A7AE;
  --text-tertiary: #787880;
  --text-inverse: #101114;

  /* Semantic */
  --accent-primary: #0A84FF;
  --accent-primary-pressed: #0071E3;
  --accent-green: #30D158;
  --accent-orange: #FF9F0A;
  --accent-red: #FF453A;
}
```

## 7.2 Surface ladder

| Level | Token | Usage |
|---|---|---|
| 0 | `canvas-map` / `surface-app` | App background hoặc map |
| 1 | `surface-base` | Main sheet, main page |
| 2 | `surface-raised` | Card, grouped list |
| 3 | `surface-elevated` | Floating toolbar, popover |
| 4 | `surface-control` | Secondary action surface |

Không dùng nhiều hơn ba level cùng lúc trong một viewport.

## 7.3 Color rules

- Một màn hình chỉ có một accent chính.
- Xanh dương cho interactive action.
- Xanh lá cho positive state.
- Cam cho map marker hoặc attention nhẹ.
- Đỏ chỉ cho destructive, critical hoặc error.
- Không dùng gradient trừ asset hình ảnh hoặc map data.
- Không tô màu mỗi card theo một feature.

---

# 8. Typography

Ưu tiên font hệ thống:

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "SF Pro Display",
  "SF Pro Text",
  "Inter",
  "Segoe UI",
  sans-serif;
```

## 8.1 Type scale

| Token | Size | Weight | Line height | Usage |
|---|---:|---:|---:|---|
| `large-title` | 32 | 700 | 38 | Main destination title |
| `title-1` | 28 | 700 | 34 | Full place title, major screen |
| `title-2` | 22 | 700 | 28 | Section group title |
| `headline` | 17 | 600 | 22 | Row title, card title, button |
| `body` | 17 | 400 | 23 | Primary readable content |
| `subhead` | 15 | 400 | 20 | Supporting text |
| `caption` | 13 | 400 | 18 | Metadata and timestamps |
| `footnote` | 12 | 500 | 16 | Tab label, compact status |

## 8.2 Typography rules

- Dùng sentence case.
- Không viết hoa toàn bộ section title.
- Không dùng quá sáu text styles trên một screen flow.
- Title có thể lớn nhưng content density vẫn phải thoáng.
- Metadata dùng tabular numerals khi hiển thị giờ, khoảng cách hoặc số liệu.
- Không dùng font weight quá nhiều để thay spacing hierarchy.

---

# 9. Spacing and geometry

## 9.1 Spacing scale

```text
4, 8, 12, 16, 20, 24, 32, 40, 48
```

Quy tắc:

- Screen horizontal padding: 16 px trên mobile nhỏ, 20 px trên mobile lớn.
- Card padding: 16 hoặc 20 px.
- Row vertical padding: 12–16 px.
- Section spacing: 28–36 px.
- Icon-to-label gap: 8–12 px.
- Hai touch target độc lập cách nhau ít nhất 8 px.

## 9.2 Radius scale

```css
--radius-small: 10px;
--radius-medium: 16px;
--radius-large: 22px;
--radius-xlarge: 28px;
--radius-sheet: 32px;
--radius-pill: 999px;
```

Quy tắc:

- Field: 14–16 px.
- Card: 16–22 px.
- CTA lớn: 18–22 px.
- Sheet: 28–32 px ở hai góc trên.
- Icon button tròn: circle.
- Không dùng hơn ba radius levels trong một screen.

## 9.3 Touch targets

- Tối thiểu 44 × 44 px.
- Primary button: 52–58 px cao.
- Icon button: 44–52 px.
- Floating map control: 52–56 px.
- Tab item: toàn bộ chiều cao tab bar.

---

# 10. Elevation without glass

Chiều sâu được tạo bằng:

1. Solid surface contrast.
2. Border mảnh.
3. Shadow nhẹ.
4. Khoảng trống.
5. Scale và position hierarchy.

```css
--shadow-floating:
  0 8px 24px rgba(0, 0, 0, 0.28),
  0 2px 6px rgba(0, 0, 0, 0.18);

--shadow-sheet:
  0 -10px 30px rgba(0, 0, 0, 0.22);

--shadow-marker:
  0 5px 10px rgba(0, 0, 0, 0.30);
```

Không đặt shadow lớn lên mọi card. Grouped list trong page thường chỉ cần surface contrast và separator.

---

# 11. Navigation and header patterns

## 11.1 Destination screen

Dùng large title trong content:

```text
Safe area
Large title
Optional trailing action
Content
Bottom tab bar
```

Áp dụng cho:

- Của tôi.
- Hoạt động.
- Tài khoản.

## 11.2 Detail screen

```text
Navigation bar
Back
Compact title
Optional trailing action
Scrollable content
```

Không tạo hero header tùy biến nếu standard navigation bar đủ dùng.

## 11.3 Map destination

Map là ngoại lệ:

- Không có navigation bar cố định.
- Search nằm trong bottom dock.
- Map controls nổi trên canvas.
- Details mở bằng sheet.

## 11.4 Header action limit

- Tối đa hai action ngoài back/close.
- Action ít dùng chuyển vào overflow menu.
- Không đặt Share, Report, Edit, More cùng lúc trên header.

---

# 12. Sheet system

Một universal `BottomSheet` phục vụ toàn ứng dụng.

## 12.1 Variants

```ts
variant: "content" | "form" | "action-list"
snapPoints?: number[]
showHandle?: boolean
stickyHeader?: ReactNode
stickyFooter?: ReactNode
```

Không tạo `SearchSheet`, `CategorySheet`, `ReviewSheet` bằng ba engine khác nhau. Đó chỉ là ba composition của `BottomSheet`.

## 12.2 Standard snap points

```text
Peek: 110–160 px
Compact: 32–40%
Medium: 55–68%
Full: 92–100%
```

Không phải sheet nào cũng cần đủ bốn trạng thái.

## 12.3 Visual rules

```css
.bottom-sheet {
  background: var(--surface-base);
  border-top: 1px solid var(--border-subtle);
  border-radius: var(--radius-sheet) var(--radius-sheet) 0 0;
  box-shadow: var(--shadow-sheet);
}
```

## 12.4 Gesture rules

- Sheet bám trực tiếp theo ngón tay.
- Scroll content chỉ bắt đầu sau khi sheet đạt snap point phù hợp.
- Khi scrollTop bằng 0 và kéo xuống, sheet collapse.
- Back gesture collapse sheet trước khi rời destination.
- Full sheet có compact navigation header khi scroll sâu.

---

# 13. Core universal components

# 13.1 Button

Variants:

- Primary.
- Secondary solid.
- Tertiary text.
- Destructive.

Không dùng outlined button làm style mặc định trong dark theme. Secondary solid thường rõ và gần phong cách mục tiêu hơn.

```text
Height: 52–58 px
Radius: 18–22 px
Horizontal padding: 18–22 px
Icon: 20–22 px
Label: headline
```

# 13.2 IconButton

Dùng cho back, close, share, locate, map style và overflow.

```text
Size: 44–52 px
Background: optional solid surface
Shape: circle
Icon: 22–26 px
```

Chỉ dùng background khi icon nổi trên map hoặc media.

# 13.3 SearchField

```text
Height: 50–54 px
Radius: pill
Background: surface-field
Leading search icon
Optional clear action
Optional trailing filter action
```

Không custom search field riêng cho từng screen.

# 13.4 TextField and SelectField

Dùng cùng một frame:

- Label.
- Input surface.
- Leading icon optional.
- Trailing action optional.
- Supporting or error text.

SelectField khác TextField ở trailing chevron và read-only behavior, không cần một visual language mới.

# 13.5 GroupedList and ListRow

Đây là pattern chính cho Account, metadata, settings và workflow detail.

```text
GroupedList
├── Optional section label
├── ListRow
├── Divider
├── ListRow
└── ListRow
```

ListRow hỗ trợ:

- Leading icon hoặc avatar.
- Label.
- Supporting text.
- Trailing value, badge, switch hoặc chevron.

# 13.6 Card

Card chỉ có ba variants:

- `plain`: content grouping.
- `interactive`: pressable item.
- `media`: image-first card.

Không tạo card visual mới cho từng loại nghiệp vụ.

# 13.7 Badge

Badge chỉ biểu thị status hoặc count.

Variants:

- Neutral.
- Info.
- Success.
- Warning.
- Danger.

Status text phải là ngôn ngữ người dùng hiểu, không hiển thị trực tiếp enum backend như `PENDING_OPEN`.

# 13.8 Chip

Chip chỉ dùng cho:

- Filter.
- Category.
- Compact selection.

Không dùng chip thay button hoặc tab khi hành động cần nổi bật.

# 13.9 SectionHeader

```text
Title
Optional supporting text
Optional trailing link
```

Dùng chung cho mọi screen. Không custom section heading riêng cho Reviews, Menu hoặc Analytics.

# 13.10 ActivityRow

Universal row cho:

- Notification.
- Appeal update.
- Dispute update.
- Access request.
- Moderation status.

Slots:

```text
Leading semantic icon
Title
Related place or actor
Supporting text
Status badge
Timestamp
Optional action
Unread state
```

# 13.11 PlaceRow

Universal row cho:

- Search result.
- Managed place.
- Submitted place.
- Duplicate detection.
- Recently viewed place.

Slots:

```text
Thumbnail or category icon
Place title
Category
Address
Distance or status
Optional trailing action
```

---

# 14. Explore / Map Home

Đây là trải nghiệm trung tâm của sản phẩm.

## 14.1 Default layout

```text
Map Canvas
├── Status or weather chip
├── Map control group
├── Current location marker
├── Place markers
├── Add-place action
└── Bottom search dock
```

Không dùng top header cố định.

## 14.2 Map visual language

- Canvas dark blue-gray, không dùng black tuyệt đối.
- Main roads sáng hơn secondary roads.
- Labels dùng white hoặc cool gray.
- Selected marker có scale, ring và shadow rõ hơn.
- Current location dùng blue dot, solid white ring và direction cone.
- Category markers dùng số màu giới hạn, không biến map thành cầu vồng.

## 14.3 Floating controls

Một `FloatingControlGroup` dùng chung:

```text
Map style
Locate me
Optional compass
```

- Tối đa ba controls.
- Solid background.
- Border nhẹ.
- Không blur.
- Nằm ngoài vùng bottom sheet.

## 14.4 Bottom search dock

Collapsed:

```text
Drag handle
Search field
Optional profile/avatar shortcut
```

Expanded:

```text
Search field
Recent searches
Nearby categories
Suggested places
```

Không mở full-screen search route ngay khi tap.

## 14.5 Add place action

Một circular icon button hoặc compact button nổi:

- Chỉ xuất hiện khi không có place sheet.
- Không cạnh tranh với Locate button.
- Tap mở action-list sheet.

---

# 15. Search and category flow

## 15.1 Search sheet

```text
Sticky SearchField
Recent queries
Suggested categories
Result count
PlaceRow list
```

Map vẫn tồn tại phía sau và cập nhật viewport theo result selection.

## 15.2 Category sheet

Dùng universal components:

```text
BottomSheet
SectionHeader
SearchField
ChipGroup
Button
```

Không dùng centered modal cho danh sách dài.

## 15.3 Search result interaction

Tap `PlaceRow`:

```text
Dismiss keyboard
Center map camera
Select marker
Collapse search sheet
Open place preview
```

---

# 16. Place Preview Sheet

Khi chọn marker, mở compact sheet thay vì push route ngay.

```text
Drag handle
Place title
Category subtitle
Primary action row
Status / rating / distance
Hero media preview
Quick toolbar
```

## 16.1 Primary action row

Tối đa hai actions:

- Primary: `Chỉ đường` hoặc travel time.
- Secondary: `Gọi`, `Đặt`, hoặc action quan trọng thứ hai.

Không hiển thị bốn CTA có trọng lượng bằng nhau.

## 16.2 Metadata

Tối đa ba values trong viewport đầu:

- Open status.
- Rating.
- Distance.

## 16.3 Quick toolbar

Universal `FloatingToolbar`:

```text
Save
Rate
Share
More
```

Không đặt Add, Star, Like và More nếu semantic chưa rõ. Label accessibility là bắt buộc.

## 16.4 Camera coordination

Map camera dịch marker lên vùng nhìn còn trống. Marker không được nằm dưới sheet.

---

# 17. Place Expanded Sheet

Expanded sheet dùng single-scroll page thay vì ba tab mặc định.

```text
Compact header
Primary actions
Status and address
Photo preview
Rating summary
Top reviews
Products or menu
Opening hours
Contact
Owner information
Related actions
```

Mỗi section có link dùng chung:

- `Xem tất cả đánh giá`
- `Xem tất cả hình ảnh`
- `Xem toàn bộ menu`

## 17.1 Why single-scroll first

- Dễ quét.
- Ít thao tác chuyển tab.
- Section hierarchy rõ.
- Giữ trải nghiệm gần location card tự nhiên.
- Dễ deep-link và restore scroll position.

Chỉ dùng segmented tabs khi dữ liệu thực tế chứng minh người dùng thường xuyên chuyển qua lại giữa các nhóm nội dung dài.

## 17.2 Header actions

Header chỉ có:

- Close hoặc back.
- Share.
- More.

Edit và Report nằm trong More nếu không phải hành động thường xuyên.

---

# 18. Reviews

Full review screen:

```text
NavigationBar
Rating summary
Distribution
Write review button
Filter chips
Review list
```

## 18.1 Review composer

Tap `Viết đánh giá` mở form sheet dùng:

- Rating input.
- TextArea.
- MediaPicker.
- Primary button.

Không đặt form dài ở đầu review list.

## 18.2 Review card simplification

Không tạo card nổi cho mọi review. Dùng list row hoặc flat section với separator:

```text
Avatar + name + date
Rating
Review content
Photo grid optional
Vendor response optional
Divider
```

---

# 19. Photo Gallery

- Grid 3 cột.
- Spacing nhỏ, đồng nhất.
- Tap mở full-screen viewer.
- Header dùng standard navigation bar.
- Add photo là trailing action.
- Filter chỉ xuất hiện nếu có giá trị rõ ràng.

---

# 20. Mine / Của tôi

Tab này thay thế việc nhét nghiệp vụ vào Profile.

## 20.1 Customer overview

```text
Large title: Của tôi
Primary action: Thêm địa điểm
Status summary
Recent submissions
Drafts
Ownership requests
```

## 20.2 Vendor overview

```text
Large title: Của tôi
Business summary
Main metric
Pending actions
Managed places
Recent reviews
```

Cùng một destination, nội dung thích ứng theo capability. Không đổi tab bar theo role.

## 20.3 Status summary

Không tạo bốn stat cards lớn bằng nhau.

Dùng `MetricBlock` hoặc compact grouped row:

```text
Đang quản lý     4
Chờ duyệt        2
Cần bổ sung      1
Bản nháp         3
```

Một card lớn chỉ dùng cho KPI thật sự chính.

---

# 21. Vendor analytics

Không dùng dashboard 2 × 2 tile mặc định.

Ưu tiên hierarchy:

```text
Main KPI
Trend
Secondary metrics
Pending actions
Managed place performance
```

Ví dụ:

```text
12.4K lượt xem
+18% trong 30 ngày

4.6 điểm trung bình
28 đánh giá mới
3 yêu cầu cần xử lý
```

Components:

- `MetricBlock`.
- `SectionHeader`.
- `PlaceRow`.
- `ActivityRow`.
- `SegmentedControl` cho time range nếu thật sự cần.

Không tạo bộ analytics card riêng cho từng số liệu.

---

# 22. Activity / Hoạt động

Hợp nhất:

- Notifications.
- Moderation updates.
- Appeals.
- Disputes.
- Access requests.
- Ownership changes.

## 22.1 Layout

```text
Large title: Hoạt động
Filter chips or compact segmented control
Grouped activity feed
Bottom tab bar
```

Groups:

- Hôm nay.
- Hôm qua.
- Tuần này.
- Trước đó.

## 22.2 Feed

Toàn bộ dùng `ActivityRow`.

Item cần hành động có:

- Semantic icon.
- Status badge.
- Supporting action label.
- Không chỉ dựa vào border màu.

## 22.3 Unread

- Badge nằm trên bottom tab icon.
- Unread row dùng dot nhỏ và text emphasis.
- `Đánh dấu tất cả đã đọc` nằm trong overflow menu.

---

# 23. Appeals, disputes and access requests

## 23.1 Shared detail template

Ba workflow dùng cùng một `WorkflowDetailScreen` composition:

```text
NavigationBar
Current status
Timeline
Related place
Participants
Submitted information
Evidence
Decision or response
Available primary action
```

Không tạo ba visual systems riêng.

## 23.2 Appeals

- List nằm trong Activity filter.
- Detail nhấn mạnh current decision.
- Timeline hiển thị tiến trình.
- New appeal dùng FormSection, TextArea và MediaPicker.

## 23.3 Ownership disputes

- Parties được xếp dọc.
- Không dùng hai card cạnh tranh ngang nhau.
- Evidence dùng cùng `MediaGrid`.
- Decision dùng semantic callout.

## 23.4 Access requests

Filter:

```text
Tất cả | Tôi gửi | Tôi nhận
```

Dùng chip hoặc compact segmented control, không tạo hai màn hình hoặc hai tab riêng.

---

# 24. Account / Tài khoản

Account chỉ quản lý identity và settings.

```text
Profile header

Tài khoản
├── Thông tin cá nhân
├── Xác minh số điện thoại
├── Thông tin doanh nghiệp
└── Vai trò và quyền

Bảo mật
├── Đổi mật khẩu
├── Thiết bị đăng nhập
└── Đăng xuất khỏi thiết bị khác

Ứng dụng
├── Ngôn ngữ
├── Giao diện
├── Thông báo
└── Quyền vị trí

Hỗ trợ
├── Trợ giúp
├── Báo cáo sự cố
├── Điều khoản
└── Chính sách quyền riêng tư

Đăng xuất
```

Dùng `GroupedList` và `ListRow`, không tạo menu card riêng cho từng mục.

Các mục phải rời khỏi Account:

- Quản lý kinh doanh.
- Thêm địa điểm.
- Kháng cáo.
- Tranh chấp.
- Yêu cầu chuyển quyền.

---

# 25. Authentication screens

## 25.1 Login

```text
Brand mark
Title
Supporting text
Email or phone field
Password field
Forgot password link
Primary login button
Register link
```

- Không dùng decorative card không cần thiết.
- CTA không sticky nếu form ngắn.
- Error hiển thị gần field.
- Keyboard không che action.

## 25.2 Register

Ưu tiên flow:

```text
Tạo tài khoản
→ Xác minh thông tin
→ Hoàn tất
```

Không yêu cầu chọn role cố định ở bước đầu nếu backend không bắt buộc. Business capability được kích hoạt khi người dùng claim hoặc thêm thông tin doanh nghiệp.

## 25.3 Password recovery

Một flow liên tục:

```text
Nhập email
→ Nhập OTP
→ Tạo mật khẩu mới
```

Dùng cùng `FormScreen`, `TextField`, `OTPField` và `Button`.

---

# 26. Contribution wizard

Flow bốn bước dùng universal `Stepper` và `FormSection`.

## Step 1: Vị trí

```text
Map selector
Center pin
Resolved address
Use current location
Continue
```

Duplicate detection dùng `PlaceRow` trong semantic callout, không tạo duplicate card riêng.

## Step 2: Thông tin cơ bản

```text
Tên địa điểm
Danh mục
Danh mục phụ
Địa chỉ hiển thị
Mô tả ngắn
```

## Step 3: Liên hệ và thời gian

```text
Điện thoại
Website
Schedule editor
```

Schedule hỗ trợ:

- Mỗi ngày giống nhau.
- Ngày thường và cuối tuần.
- Tùy chỉnh từng ngày.

## Step 4: Ảnh và xác nhận

```text
Ảnh mặt tiền
Ảnh bảng hiệu
Ảnh bổ sung
Review summary
Submit
```

## Wizard footer

Universal `FormFooter`:

```text
Back
Step progress
Continue / Submit
```

---

# 27. Edit location

Dùng lại cùng field components và data sections của Contribution.

Không tạo form edit hoàn toàn khác.

Có thể dùng:

- Stepper nếu thay đổi nhiều nhóm dữ liệu.
- Grouped form sections nếu chỉnh sửa nhỏ.

Save behavior:

- Autosave draft.
- Sticky save footer.
- Summary trước khi submit nếu cần kiểm duyệt.
- Chỉ ra field nào đã thay đổi.
- Không mất input khi request lỗi.

---

# 28. Ownership claim wizard

Ba bước:

```text
1. Thông tin liên hệ
2. Xác minh OTP
3. Bằng chứng sở hữu
```

Không mở OTP modal chồng lên claim screen. OTP là một step.

Components:

- `Stepper`.
- `PlaceRow`.
- `TextField`.
- `OTPField`.
- `MediaPicker`.
- `FormFooter`.

---

# 29. Modal and overlay policy

## Bottom sheet dùng cho

- Search.
- Category selection.
- Place preview.
- Action list.
- Review composer.
- Report reason.
- Media source selection.

## Full-screen route dùng cho

- Contribution.
- Edit location.
- Ownership claim.
- Full reviews.
- Full gallery.
- Long workflow detail.
- Account settings detail.

## Center dialog chỉ dùng cho

- Destructive confirmation.
- Irreversible action.
- Session expired.
- Critical permission explanation.

Không dùng centered modal cho selector dài hoặc content scrollable.

---

# 30. Motion

Motion phải nhẹ, trực tiếp và có mục đích.

| Interaction | Duration |
|---|---:|
| Button press | 100–140 ms |
| Small state change | 160–220 ms |
| Sheet snap | 280–420 ms |
| Full sheet transition | 320–480 ms |
| Map recenter | 350–550 ms |

```css
--ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);
--ease-enter: cubic-bezier(0.16, 1, 0.3, 1);
--ease-exit: cubic-bezier(0.4, 0, 1, 1);
```

Rules:

- Pressed scale: 0.97–0.98.
- Sheet bám ngón tay.
- Marker selected scale nhẹ.
- Không dùng bounce mạnh.
- Tôn trọng reduced motion.

---

# 31. Accessibility

- Touch target tối thiểu 44 × 44 px.
- Text contrast tối thiểu 4.5:1 cho body text.
- Không dùng màu làm tín hiệu duy nhất.
- Dynamic type tối thiểu 130% không phá layout.
- Tab label không bị cắt.
- Button giữ đầy đủ label khi font lớn.
- Icon-only action luôn có accessibility label.
- Sheet handle có semantic expand/collapse.
- Marker đọc: tên, loại và khoảng cách.

---

# 32. Responsive adaptation

## Mobile portrait

- Bottom tab bar.
- Bottom sheets.
- Horizontal category carousel.
- One-column content.

## Mobile landscape

- Bottom sheet có thể chuyển thành side sheet.
- Media và metadata có thể thành hai cột.

## Tablet

- Side panel 360–440 px.
- Map vẫn là canvas chính.
- Bottom navigation có thể chuyển thành sidebar nếu framework hỗ trợ adaptive navigation.

## Desktop web

- Side panel 380–460 px.
- Hover và keyboard navigation.
- Floating toolbar chuyển thành inline action row khi đủ rộng.

Component vẫn giữ cùng API. Chỉ layout container thay đổi.

---

# 33. Route architecture

```text
/app
├── auth
│   ├── login.tsx
│   ├── register.tsx
│   ├── recover.tsx
│   └── reset.tsx
│
├── (tabs)
│   ├── explore
│   │   └── index.tsx
│   ├── mine
│   │   └── index.tsx
│   ├── activity
│   │   └── index.tsx
│   └── account
│       └── index.tsx
│
├── location
│   ├── [id].tsx
│   ├── [id]/reviews.tsx
│   ├── [id]/photos.tsx
│   ├── [id]/report.tsx
│   └── edit/[id].tsx
│
├── contribute
│   └── new.tsx
│
├── claim
│   └── [locationId].tsx
│
├── activity
│   ├── appeal/[id].tsx
│   ├── dispute/[id].tsx
│   └── access-request/[id].tsx
│
└── account
    ├── profile.tsx
    ├── verification.tsx
    ├── security.tsx
    ├── business.tsx
    └── settings.tsx
```

Route không quyết định visual component. Nhiều route phải dùng cùng `Screen`, `NavigationBar`, `GroupedList`, `WorkflowDetail` và form patterns.

---

# 34. Mapping from old structure

| Cấu trúc cũ | Cấu trúc mới |
|---|---|
| Home / Map | Khám phá |
| Notifications tab | Hoạt động |
| Profile tab | Tài khoản |
| Vendor Dashboard trong Profile | Của tôi |
| Đăng ký địa điểm trong Profile | CTA tại Khám phá và Của tôi |
| Appeals trong Profile | Hoạt động |
| Disputes trong Profile | Hoạt động |
| Access requests trong Profile | Hoạt động |
| Location detail có 3 tabs | Expanded single-scroll sheet |
| Review form ở đầu Reviews tab | Review composer sheet |
| Search full-screen overlay | Expandable search sheet |
| Category centered modal | Category bottom sheet |
| OTP modal trong claim | OTP wizard step |
| Contribution long form | Four-step wizard |
| Vendor stat grid 2 × 2 | Hierarchical analytics layout |
| Feature-specific cards | Universal Card, ListRow, ActivityRow, PlaceRow |

---

# 35. Anti-customization checklist

Trước khi tạo một component mới, trả lời lần lượt:

1. Có thể dùng `ListRow` không?
2. Có thể dùng `Card` với variant hiện có không?
3. Có thể composition từ `SectionHeader`, `Text`, `Badge` và `Button` không?
4. Có thể thêm một prop hoặc slot hợp lý vào universal component không?
5. Component này có khả năng được dùng ở ít nhất hai feature không?

Nếu bốn câu đầu là “không” và câu cuối cũng là “không”, cần xem lại thiết kế trước khi custom.

Không chấp nhận:

- Screen-specific colors.
- Screen-specific spacing scale.
- Unique button shapes.
- Unique header per feature.
- Custom modal engine.
- Custom sheet engine.
- Multiple icon libraries.
- Emoji làm functional icon.
- Feature-specific skeleton nếu generic skeleton đủ dùng.

---

# 36. Screen template mapping

| Screen type | Universal template | Core components |
|---|---|---|
| Login / Register | `FormScreen` | TextField, Button, FormSection |
| Explore | `MapScreen` | SearchDock, BottomSheet, FloatingControlGroup |
| Place detail | `SheetDetail` | SectionHeader, Button, ListRow, MediaGrid |
| Mine | `DestinationListScreen` | MetricBlock, PlaceRow, SectionHeader |
| Activity | `DestinationListScreen` | ActivityRow, Badge, Chip |
| Account | `SettingsScreen` | GroupedList, ListRow |
| Appeal detail | `WorkflowDetailScreen` | Timeline, Callout, MediaGrid, Button |
| Dispute detail | `WorkflowDetailScreen` | Timeline, Participants, MediaGrid |
| Access request detail | `WorkflowDetailScreen` | Timeline, ListRow, Button |
| Contribution | `WizardScreen` | Stepper, FormSection, FormFooter |
| Edit location | `WizardScreen` hoặc `FormScreen` | Shared location fields |
| Claim ownership | `WizardScreen` | Stepper, OTPField, MediaPicker |

---

# 37. Implementation priorities

## Phase 1: Design-system foundation

- Tokens.
- Typography.
- Button.
- IconButton.
- TextField.
- SearchField.
- ListRow.
- Card.
- Badge.
- BottomSheet.
- NavigationBar.
- BottomTabBar.

Không redesign từng screen trước khi foundation ổn định.

## Phase 2: Navigation architecture

- Bốn bottom tabs.
- Separate tab stacks.
- Di chuyển workflows khỏi Profile.
- Mine và Activity shells.

## Phase 3: Explore experience

- Solid search dock.
- Search sheet.
- Place preview.
- Expanded place detail.
- Camera and sheet coordination.

## Phase 4: Workflow consolidation

- Unified Activity feed.
- Shared WorkflowDetail template.
- Appeals, disputes và access requests.

## Phase 5: Shared form architecture

- WizardScreen.
- FormSection.
- MediaPicker.
- Shared location fields.
- Contribution, edit và claim.

## Phase 6: Vendor experience

- Mine vendor mode.
- Analytics hierarchy.
- Managed places.
- Pending actions.

---

# 38. Acceptance criteria

## Visual system

- [ ] Tất cả content surfaces opaque 100%.
- [ ] Không có backdrop blur.
- [ ] Không có transparent card.
- [ ] Một accent chính trên mỗi screen.
- [ ] Typography, radius và spacing lấy từ tokens.
- [ ] UI có hierarchy rõ dù không dùng glass effect.

## Universal components

- [ ] Ít nhất 80% UI được dựng từ public components dùng chung.
- [ ] Không có feature-specific button.
- [ ] Không có feature-specific navigation bar.
- [ ] Search, category, review và actions dùng cùng sheet engine.
- [ ] Account và metadata dùng cùng ListRow.
- [ ] Workflow updates dùng cùng ActivityRow.
- [ ] Appeals, disputes và access requests dùng cùng detail template.

## Navigation

- [ ] Bottom navigation có đúng bốn destinations.
- [ ] Notifications không còn là tab riêng.
- [ ] Profile không chứa business workflows.
- [ ] Customer và vendor dùng cùng navigation structure.
- [ ] Mỗi tab giữ state riêng.

## Explore

- [ ] Search mở bằng expandable solid sheet.
- [ ] Chọn marker không push route ngay.
- [ ] Place preview có compact, medium và full states.
- [ ] Marker không bị sheet che.
- [ ] Header actions được giới hạn.

## Forms

- [ ] Contribution dùng wizard tối đa bốn bước.
- [ ] Claim dùng wizard ba bước.
- [ ] Edit dùng lại location form components.
- [ ] Input không mất khi request lỗi.
- [ ] Keyboard không che CTA.

## Accessibility

- [ ] Touch targets tối thiểu 44 × 44 px.
- [ ] Dynamic type không phá layout.
- [ ] Icon-only controls có label.
- [ ] Status không chỉ thể hiện bằng màu.

---

# 39. Final design summary

```text
KHÁM PHÁ
Map, search, category, place detail

CỦA TÔI
Contributions, managed places, drafts, vendor analytics

HOẠT ĐỘNG
Notifications, moderation, appeals, disputes, access requests

TÀI KHOẢN
Profile, verification, security, settings
```

Phong cách cuối cùng phải tạo cảm giác:

- Ít thành phần nhưng mỗi thành phần có trọng lượng rõ.
- Solid, sạch và cao cấp.
- Gần với sự mạch lạc của Apple nhưng không phụ thuộc vào blur.
- Map và content liên kết thành một không gian liên tục.
- Component được tái sử dụng nhất quán, không sinh ra một khu rừng UI riêng cho từng feature.

Khi có lựa chọn giữa “custom để độc đáo hơn” và “dùng component phổ quát nhưng rõ ràng hơn”, mặc định chọn phương án thứ hai.
