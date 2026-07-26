const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '..');
const mongoose = require(require.resolve('mongoose', { paths: [apiDir] }));

const DEMO_PASSWORD = 'Demo@123456';

const IMAGE_URLS = Object.freeze([
  'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1564981797816-1043664bf78d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1567521464027-f127ff144326?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1200&q=80',
]);

const COLLECTION_ORDER = Object.freeze([
  'users',
  'categories',
  'sub_categories',
  'locations',
  'products',
  'location_requests',
  'claim_requests',
  'request_accesses',
  'disputes',
  'appeals',
  'reviews',
  'edit_suggestions',
  'reports',
  'bookmarks',
  'notifications',
  'audit_logs',
  'trust_events',
  'location_views',
  'otps',
  'claimverificationsessions',
  'requestaccessverificationsessions',
]);

function objectId(number) {
  return new mongoose.Types.ObjectId(number.toString(16).padStart(24, '0'));
}

function buildIds() {
  const ids = {
    users: {},
    categories: {},
    subCategories: {},
    locations: {},
    products: {},
  };

  [
    'ADMIN_DUONG',
    'ADMIN_TRUNG',
    'VENDOR_DUONG',
    'VENDOR_LONG',
    'VENDOR_TRUNG',
    'CUSTOMER_DUONG',
    'CUSTOMER_LONG',
    'CUSTOMER_TRUNG',
    'CUSTOMER_MINH',
    'VENDOR_MINH',
    'WARNED_DUONG',
    'BANNED_LONG',
  ].forEach((key, index) => {
    ids.users[key] = objectId(index + 1);
  });

  ['FOOD', 'DRINK', 'STUDY', 'HEALTH', 'UTILITY'].forEach((key, index) => {
    ids.categories[key] = objectId(101 + index);
  });

  const subKeys = [
    'RICE',
    'NOODLE',
    'HOT_POT',
    'FAST_FOOD',
    'VEGETARIAN',
    'COFFEE',
    'MILK_TEA',
    'JUICE',
    'BAKERY',
    'TAKEAWAY_DRINK',
    'SCHOOL',
    'LIBRARY',
    'COWORKING',
    'TECH_OFFICE',
    'TRAINING',
    'PHARMACY',
    'CLINIC',
    'GYM',
    'HAIR_SALON',
    'SPA',
    'SUPERMARKET',
    'CONVENIENCE',
    'LAUNDRY',
    'MOTORBIKE_REPAIR',
    'ATM',
  ];
  subKeys.forEach((key, index) => {
    ids.subCategories[key] = objectId(201 + index);
  });

  for (let index = 1; index <= 28; index += 1) {
    ids.locations[`L${index}`] = objectId(1000 + index);
  }
  for (let index = 1; index <= 30; index += 1) {
    ids.products[`P${index}`] = objectId(2000 + index);
  }
  return ids;
}

function buildDataset({ now = new Date(), passwordHash } = {}) {
  if (!passwordHash) {
    throw new Error('passwordHash is required to build the demo dataset');
  }

  const ids = buildIds();
  const daysAgo = (days) => new Date(now.getTime() - days * 86_400_000);
  const image = (index, isCover = false, uploadedAt = daysAgo(30)) => ({
    url: IMAGE_URLS[index % IMAGE_URLS.length],
    isCover,
    uploadedAt,
  });
  const timestamp = (createdDaysAgo) => ({
    createdAt: daysAgo(createdDaysAgo),
    updatedAt: daysAgo(Math.max(0, createdDaysAgo - 1)),
  });

  const user = ({
    key,
    email,
    fullName,
    role,
    phone,
    phoneVerified = true,
    status = 'ACTIVE',
    trustScore = 20,
    trustLevel = 'NEW',
    avatarIndex,
  }) => ({
    _id: ids.users[key],
    email,
    passwordHash,
    role,
    fullName,
    ...(phone ? { phone } : {}),
    phoneVerified,
    avatarUrl: IMAGE_URLS[avatarIndex % IMAGE_URLS.length],
    status,
    trustScore,
    trustLevel,
    lastLoginAt: daysAgo(1 + avatarIndex),
    ...timestamp(180 - avatarIndex * 5),
  });

  const users = [
    user({
      key: 'ADMIN_DUONG',
      email: 'duong.admin@gmail.com',
      fullName: 'Nguyễn Hải Dương',
      role: 'ADMIN',
      phone: '0912847365',
      trustScore: 100,
      trustLevel: 'TRUSTED',
      avatarIndex: 0,
    }),
    user({
      key: 'ADMIN_TRUNG',
      email: 'trung.admin@gmail.com',
      fullName: 'Trần Thành Trung',
      role: 'ADMIN',
      phone: '0985314276',
      trustScore: 100,
      trustLevel: 'TRUSTED',
      avatarIndex: 1,
    }),
    user({
      key: 'VENDOR_DUONG',
      email: 'duong@gmail.com',
      fullName: 'Phạm Minh Dương',
      role: 'VENDOR',
      phone: '0964281753',
      trustScore: 78,
      trustLevel: 'TRUSTED',
      avatarIndex: 2,
    }),
    user({
      key: 'VENDOR_LONG',
      email: 'long@gmail.com',
      fullName: 'Lê Hoàng Long',
      role: 'VENDOR',
      phone: '0937164825',
      trustScore: 72,
      trustLevel: 'TRUSTED',
      avatarIndex: 3,
    }),
    user({
      key: 'VENDOR_TRUNG',
      email: 'trung@gmail.com',
      fullName: 'Đỗ Quang Trung',
      role: 'VENDOR',
      phone: '0972458136',
      trustScore: 66,
      trustLevel: 'TRUSTED',
      avatarIndex: 4,
    }),
    user({
      key: 'CUSTOMER_DUONG',
      email: 'duong.customer@gmail.com',
      fullName: 'Vũ Anh Dương',
      role: 'CUSTOMER',
      phone: '0326814579',
      trustScore: 34,
      trustLevel: 'TRUSTED',
      avatarIndex: 5,
    }),
    user({
      key: 'CUSTOMER_LONG',
      email: 'long.customer@gmail.com',
      fullName: 'Nguyễn Đức Long',
      role: 'CUSTOMER',
      phone: '0385296417',
      trustScore: 27,
      trustLevel: 'NEW',
      avatarIndex: 6,
    }),
    user({
      key: 'CUSTOMER_TRUNG',
      email: 'trung.customer@gmail.com',
      fullName: 'Hoàng Quốc Trung',
      role: 'CUSTOMER',
      phone: '0861739425',
      trustScore: 42,
      trustLevel: 'TRUSTED',
      avatarIndex: 7,
    }),
    user({
      key: 'CUSTOMER_MINH',
      email: 'minh@gmail.com',
      fullName: 'Bùi Gia Minh',
      role: 'CUSTOMER',
      phoneVerified: false,
      trustScore: 18,
      trustLevel: 'NEW',
      avatarIndex: 8,
    }),
    user({
      key: 'VENDOR_MINH',
      email: 'minh.vendor@gmail.com',
      fullName: 'Đặng Nhật Minh',
      role: 'VENDOR',
      phoneVerified: false,
      trustScore: 12,
      trustLevel: 'NEW',
      avatarIndex: 9,
    }),
    user({
      key: 'WARNED_DUONG',
      email: 'duong.warned@gmail.com',
      fullName: 'Tạ Tuấn Dương',
      role: 'CUSTOMER',
      phone: '0394268157',
      status: 'WARNED',
      trustScore: -8,
      trustLevel: 'RESTRICTED',
      avatarIndex: 10,
    }),
    user({
      key: 'BANNED_LONG',
      email: 'long.banned@gmail.com',
      fullName: 'Phan Bảo Long',
      role: 'CUSTOMER',
      phone: '0359182647',
      status: 'BANNED',
      trustScore: -45,
      trustLevel: 'BANNED',
      avatarIndex: 11,
    }),
  ];

  const categoryDefinitions = [
    [
      'FOOD',
      'Ẩm thực',
      'Khám phá các quán ăn hằng ngày, món địa phương và lựa chọn phù hợp cho nhóm bạn quanh Hòa Lạc.',
    ],
    [
      'DRINK',
      'Cà phê và đồ uống',
      'Tổng hợp quán cà phê, trà sữa, nước ép và tiệm bánh phục vụ học tập, gặp gỡ hoặc mang đi.',
    ],
    [
      'STUDY',
      'Học tập và làm việc',
      'Các trường học, thư viện, trung tâm đào tạo và không gian làm việc dành cho sinh viên lẫn nhân viên.',
    ],
    [
      'HEALTH',
      'Sức khỏe và chăm sóc cá nhân',
      'Những địa chỉ hỗ trợ chăm sóc sức khỏe, rèn luyện thể chất và dịch vụ làm đẹp trong khu vực.',
    ],
    [
      'UTILITY',
      'Mua sắm và tiện ích',
      'Các điểm mua sắm và dịch vụ thiết yếu giúp việc học tập, làm việc và sinh hoạt ở Hòa Lạc thuận tiện hơn.',
    ],
  ];
  const categories = categoryDefinitions.map(
    ([key, name, description], index) => ({
      _id: ids.categories[key],
      name,
      description,
      isActive: true,
      ...timestamp(300 - index),
    }),
  );

  const subCategoryDefinitions = [
    ['RICE', 'FOOD', 'Quán cơm'],
    ['NOODLE', 'FOOD', 'Bún, phở và món nước'],
    ['HOT_POT', 'FOOD', 'Lẩu và nướng'],
    ['FAST_FOOD', 'FOOD', 'Đồ ăn nhanh'],
    ['VEGETARIAN', 'FOOD', 'Món chay'],
    ['COFFEE', 'DRINK', 'Cà phê'],
    ['MILK_TEA', 'DRINK', 'Trà sữa'],
    ['JUICE', 'DRINK', 'Nước ép và sinh tố'],
    ['BAKERY', 'DRINK', 'Tiệm bánh'],
    ['TAKEAWAY_DRINK', 'DRINK', 'Đồ uống mang đi'],
    ['SCHOOL', 'STUDY', 'Trường học'],
    ['LIBRARY', 'STUDY', 'Thư viện'],
    ['COWORKING', 'STUDY', 'Không gian làm việc'],
    ['TECH_OFFICE', 'STUDY', 'Văn phòng công nghệ'],
    ['TRAINING', 'STUDY', 'Trung tâm đào tạo'],
    ['PHARMACY', 'HEALTH', 'Nhà thuốc'],
    ['CLINIC', 'HEALTH', 'Phòng khám'],
    ['GYM', 'HEALTH', 'Phòng gym'],
    ['HAIR_SALON', 'HEALTH', 'Salon tóc'],
    ['SPA', 'HEALTH', 'Spa và chăm sóc da'],
    ['SUPERMARKET', 'UTILITY', 'Siêu thị'],
    ['CONVENIENCE', 'UTILITY', 'Cửa hàng tiện lợi'],
    ['LAUNDRY', 'UTILITY', 'Giặt là'],
    ['MOTORBIKE_REPAIR', 'UTILITY', 'Sửa xe'],
    ['ATM', 'UTILITY', 'ATM và ngân hàng'],
  ];
  const subCategories = subCategoryDefinitions.map(
    ([key, categoryKey, name], index) => ({
      _id: ids.subCategories[key],
      categoryId: ids.categories[categoryKey],
      name,
      isActive: key !== 'SPA',
      ...timestamp(280 - index),
    }),
  );

  const locationDefinitions = [
    [
      'Trường Đại học FPT Hà Nội',
      'Khu Giáo dục và Đào tạo, Khu Công nghệ cao Hòa Lạc, Km29 Đại lộ Thăng Long, Hà Nội',
      'STUDY',
      'SCHOOL',
      'PUBLISHED',
      'ADMIN',
      null,
      'Khuôn viên đào tạo rộng, nhiều cây xanh, có giảng đường, khu thể thao và dịch vụ sinh viên; phù hợp tham quan, học tập và tham dự các hoạt động cộng đồng.',
      '08:00–17:30 từ thứ Hai đến thứ Sáu',
      '02473005588',
    ],
    [
      'Trường THPT FPT Hà Nội',
      'Khuôn viên FPT Hòa Lạc, xã Hòa Lạc, Hà Nội',
      'STUDY',
      'SCHOOL',
      'PUBLISHED',
      'ADMIN',
      null,
      'Môi trường phổ thông nội trú nằm trong khuôn viên xanh của FPT Hòa Lạc, chú trọng trải nghiệm, kỹ năng tự lập và các hoạt động ngoại khóa cho học sinh.',
      '08:00–17:00 từ thứ Hai đến thứ Sáu',
      '02473006888',
    ],
    [
      'FPT Software Hòa Lạc',
      'Khu Công nghệ cao Hòa Lạc, Hà Nội',
      'STUDY',
      'TECH_OFFICE',
      'PUBLISHED',
      'ADMIN',
      'VENDOR_TRUNG',
      'Tổ hợp văn phòng công nghệ với không gian làm việc quy mô lớn, cảnh quan thoáng và nhiều khu tiện ích dành cho nhân viên, khách làm việc theo lịch hẹn.',
      '08:00–18:00 từ thứ Hai đến thứ Sáu',
      '02473044888',
    ],
    [
      'F-Ville 2',
      'Khu Công nghệ cao Hòa Lạc, Hà Nội',
      'STUDY',
      'TECH_OFFICE',
      'PUBLISHED',
      'ADMIN',
      'VENDOR_TRUNG',
      'Khu văn phòng hiện đại thuộc tổ hợp FPT Software, có cảnh quan nhiều cây xanh và các khu sinh hoạt chung; khách bên ngoài cần đăng ký trước khi đến.',
      '08:00–18:00 từ thứ Hai đến thứ Sáu',
      null,
    ],
    [
      'Thư viện Đại học FPT Hòa Lạc',
      'Tòa Delta, Trường Đại học FPT Hà Nội',
      'STUDY',
      'LIBRARY',
      'PUBLISHED',
      'ADMIN',
      null,
      'Không gian đọc và tự học yên tĩnh trong campus, có bàn nhóm, nguồn tài liệu học thuật và khu tra cứu; một số dịch vụ yêu cầu thẻ sinh viên hợp lệ.',
      '08:00–21:00 hằng ngày',
      null,
    ],
    [
      'Căng tin Đại học FPT Hòa Lạc',
      'Khu dịch vụ, Trường Đại học FPT Hà Nội',
      'FOOD',
      'RICE',
      'PUBLISHED',
      'ADMIN',
      'VENDOR_DUONG',
      'Khu ăn uống phục vụ sinh viên và cán bộ với nhiều quầy cơm, bún, phở và món ăn nhanh; giờ cao điểm buổi trưa thường đông nhưng bàn ghế được bố trí rộng.',
      '06:30–20:30 hằng ngày',
      null,
    ],
    [
      'Passio Coffee FPT Hòa Lạc',
      'Khu dịch vụ, Trường Đại học FPT Hà Nội',
      'DRINK',
      'COFFEE',
      'PUBLISHED',
      'VENDOR',
      'VENDOR_DUONG',
      'Quán cà phê trong campus với chỗ ngồi phù hợp học nhóm và nghỉ giữa giờ; menu tập trung cà phê, trà và bánh ăn nhẹ, không gian nhộn nhịp vào đầu buổi sáng.',
      '07:00–21:30 hằng ngày',
      '0904123456',
    ],
    [
      'Hola Sun Coffee',
      'Khu vực Hòa Lạc, gần các trường đại học và khu công nghệ cao',
      'DRINK',
      'COFFEE',
      'PUBLISHED',
      'VENDOR',
      'VENDOR_TRUNG',
      'Quán cà phê có không gian xanh và ánh sáng tự nhiên, phù hợp làm việc nhóm hoặc trò chuyện; phục vụ cà phê rang, trà trái cây và một số loại bánh ngọt.',
      '07:00–22:00 hằng ngày',
      '0916372845',
    ],
    [
      'Bếp Nhà Tre Hòa Lạc',
      'Đường nội khu Thạch Hòa, xã Hòa Lạc, Hà Nội',
      'FOOD',
      'RICE',
      'PUBLISHED',
      'VENDOR',
      'VENDOR_DUONG',
      'Quán cơm gia đình phục vụ món Việt thay đổi theo ngày, phần ăn vừa đủ và có lựa chọn giao gần campus; buổi trưa nên đặt trước nếu đi theo nhóm đông.',
      '10:00–21:00 hằng ngày',
      '0963157824',
    ],
    [
      'Bún Bò Mộc Nhiên',
      'Khu dân cư Thạch Hòa, xã Hòa Lạc, Hà Nội',
      'FOOD',
      'NOODLE',
      'PUBLISHED',
      'CUSTOMER',
      'VENDOR_LONG',
      'Quán nhỏ chuyên bún bò với nước dùng ninh trong ngày, có phần thường và đặc biệt; chỗ ngồi không quá rộng nhưng phục vụ nhanh vào khung giờ ăn sáng.',
      '06:00–13:30 hằng ngày',
      '0386147259',
    ],
    [
      'Lẩu Nướng Đồi Thông',
      'Đường ven hồ Tân Xã, xã Hòa Lạc, Hà Nội',
      'FOOD',
      'HOT_POT',
      'PUBLISHED',
      'VENDOR',
      'VENDOR_LONG',
      'Không gian ăn tối thoáng, nhận nhóm từ bốn đến mười người với các set lẩu nướng; quán có khu ngồi ngoài trời và nên đặt bàn trước vào cuối tuần.',
      '16:30–23:00 hằng ngày',
      '0975162384',
    ],
    [
      'Gà Rán Cam Giòn',
      'Khu dịch vụ sinh viên Hòa Lạc, Hà Nội',
      'FOOD',
      'FAST_FOOD',
      'SUBMITTED',
      'CUSTOMER',
      null,
      'Điểm bán đồ ăn nhanh mới được cộng đồng gửi lên, nổi bật với gà rán, khoai và phần combo tiết kiệm; thông tin địa điểm đang chờ quản trị viên xác minh.',
      '09:00–22:00 hằng ngày',
      '0325478169',
    ],
    [
      'Cơm Chay An Nhiên',
      'Ngõ 12 Thạch Hòa, xã Hòa Lạc, Hà Nội',
      'FOOD',
      'VEGETARIAN',
      'REJECTED',
      'CUSTOMER',
      null,
      'Địa điểm món chay được đề xuất với thực đơn rau củ theo mùa và suất cơm văn phòng; hồ sơ hiện bị từ chối do ảnh mặt tiền chưa thể hiện rõ địa chỉ.',
      '10:30–20:30 hằng ngày',
      null,
    ],
    [
      'Trà Sữa Mây Cam',
      'Đường 420, xã Hòa Lạc, Hà Nội',
      'DRINK',
      'MILK_TEA',
      'PENDING_RE_APPROVAL',
      'VENDOR',
      'VENDOR_DUONG',
      'Quán trà sữa hướng đến sinh viên, có mức đường đá tùy chọn và nhiều loại topping; địa điểm đang chờ duyệt lại sau khi chủ quán cập nhật giờ mở cửa.',
      '09:00–23:00 hằng ngày',
      '0862145379',
    ],
    [
      'Nước Ép Vườn Xanh',
      'Khu nhà ở sinh viên Hòa Lạc, Hà Nội',
      'DRINK',
      'JUICE',
      'PUBLISHED',
      'VENDOR',
      'VENDOR_TRUNG',
      'Quầy đồ uống nhỏ sử dụng trái cây theo ngày, có nước ép nguyên chất và sinh tố ít đường; phù hợp mua mang đi sau giờ học hoặc sau khi tập luyện.',
      '07:30–21:30 hằng ngày',
      '0397158264',
    ],
    [
      'Tiệm Bánh Sớm Mai',
      'Phố chợ Hòa Lạc, Hà Nội',
      'DRINK',
      'BAKERY',
      'PUBLISHED',
      'VENDOR',
      'VENDOR_TRUNG',
      'Tiệm bánh làm mẻ mới mỗi sáng, bán bánh mì mềm, bánh ngọt và bánh sinh nhật đặt trước; số lượng một số món có thể hết sớm vào cuối ngày.',
      '06:30–20:00 hằng ngày',
      '0946382175',
    ],
    [
      'Góc Làm Việc Hòa Lạc',
      'Khu dịch vụ công nghệ cao, Hòa Lạc, Hà Nội',
      'STUDY',
      'COWORKING',
      'PUBLISHED',
      'CUSTOMER',
      null,
      'Không gian làm việc chung có bàn đơn, phòng họp nhỏ và wifi ổn định, phù hợp sinh viên làm đồ án hoặc nhóm khởi nghiệp cần chỗ ngồi theo giờ.',
      '08:00–22:00 hằng ngày',
      '0928173645',
    ],
    [
      'Trung tâm Kỹ năng Mở',
      'Đường nội khu Đại học Quốc gia, Hòa Lạc, Hà Nội',
      'STUDY',
      'TRAINING',
      'HIDDEN',
      'CUSTOMER',
      null,
      'Trung tâm từng tổ chức lớp thuyết trình và làm việc nhóm cho sinh viên; hồ sơ đang bị ẩn vì có dấu hiệu trùng với một địa điểm đào tạo đã tồn tại.',
      '18:00–21:30 từ thứ Hai đến thứ Bảy',
      null,
    ],
    [
      'Nhà Thuốc An Tâm Thạch Hòa',
      'Đường 419, xã Hòa Lạc, Hà Nội',
      'HEALTH',
      'PHARMACY',
      'PUBLISHED',
      'VENDOR',
      'VENDOR_DUONG',
      'Nhà thuốc bán thuốc không kê đơn, vật tư y tế cơ bản và sản phẩm chăm sóc cá nhân; khách cần mang đơn hợp lệ đối với thuốc kê toa.',
      '07:00–22:00 hằng ngày',
      '0982461357',
    ],
    [
      'Phòng Khám Bình Minh',
      'Khu dân cư Tân Xã, xã Hòa Lạc, Hà Nội',
      'HEALTH',
      'CLINIC',
      'PUBLISHED',
      'VENDOR',
      'VENDOR_LONG',
      'Phòng khám đa khoa quy mô nhỏ tiếp nhận khám ban đầu và tư vấn sức khỏe; nên gọi trước để xác nhận lịch bác sĩ và dịch vụ trong ngày.',
      '08:00–19:00 từ thứ Hai đến thứ Bảy',
      '02433657890',
    ],
    [
      'Phòng Gym Nhịp Sống',
      'Khu dịch vụ Thạch Hòa, xã Hòa Lạc, Hà Nội',
      'HEALTH',
      'GYM',
      'PUBLISHED',
      'VENDOR',
      'VENDOR_TRUNG',
      'Phòng tập có khu tạ, máy chạy và lớp hướng dẫn cơ bản, phục vụ cả sinh viên lẫn người đi làm; giờ chiều thường đông nên khách mới có thể đăng ký buổi thử.',
      '05:30–22:30 hằng ngày',
      '0934826157',
    ],
    [
      'Salon Tóc Lá',
      'Phố chợ Hòa Lạc, Hà Nội',
      'HEALTH',
      'HAIR_SALON',
      'PUBLISHED',
      'VENDOR',
      'VENDOR_TRUNG',
      'Salon nhận cắt, gội, uốn và nhuộm với mức giá niêm yết theo độ dài tóc; khách làm dịch vụ hóa chất nên đặt lịch để hạn chế chờ đợi.',
      '09:00–21:00 hằng ngày',
      '0375168249',
    ],
    [
      'Spa Dịu Hòa Lạc',
      'Khu dân cư Thạch Hòa, xã Hòa Lạc, Hà Nội',
      'HEALTH',
      'SPA',
      'PUBLISHED',
      'VENDOR',
      'VENDOR_TRUNG',
      'Không gian chăm sóc da và thư giãn quy mô nhỏ, sử dụng liệu trình theo lịch hẹn; khách được tư vấn tình trạng da trước khi chọn gói dịch vụ.',
      '09:30–20:30 hằng ngày',
      '0817364259',
    ],
    [
      'Siêu Thị Campus Mart',
      'Khu dịch vụ sinh viên, Hòa Lạc, Hà Nội',
      'UTILITY',
      'SUPERMARKET',
      'PUBLISHED',
      'VENDOR',
      'VENDOR_DUONG',
      'Siêu thị mini có đồ dùng học tập, thực phẩm đóng gói, nước uống và nhu yếu phẩm; quầy thanh toán đông vào buổi tối sau giờ học.',
      '06:30–23:00 hằng ngày',
      '0853172649',
    ],
    [
      'Cửa Hàng Tiện Lợi 29',
      'Km29 Đại lộ Thăng Long, xã Hòa Lạc, Hà Nội',
      'UTILITY',
      'CONVENIENCE',
      'PUBLISHED',
      'VENDOR',
      'VENDOR_LONG',
      'Cửa hàng phục vụ đồ ăn nhanh, nước lạnh và vật dụng thiết yếu đến khuya, có hâm nóng sản phẩm và khu vực dừng xe ngắn hạn phía trước.',
      '06:00–24:00 hằng ngày',
      '0882467153',
    ],
    [
      'Giặt Là Sạch Nhanh',
      'Khu trọ sinh viên Thạch Hòa, xã Hòa Lạc, Hà Nội',
      'UTILITY',
      'LAUNDRY',
      'PUBLISHED',
      'VENDOR',
      'VENDOR_TRUNG',
      'Dịch vụ giặt sấy tính theo cân, nhận chăn mỏng và có giao trả trong bán kính gần campus; đồ cần xử lý riêng nên báo trước khi cân.',
      '07:30–21:30 hằng ngày',
      '0365172849',
    ],
    [
      'Sửa Xe Minh Phát',
      'Đường vào Khu Công nghệ cao Hòa Lạc, Hà Nội',
      'UTILITY',
      'MOTORBIKE_REPAIR',
      'PUBLISHED',
      'VENDOR',
      'VENDOR_LONG',
      'Tiệm sửa xe máy nhận vá lốp, thay dầu, kiểm tra phanh và xử lý sự cố cơ bản; phụ tùng thay thế được báo giá trước khi thực hiện.',
      '07:00–20:00 hằng ngày',
      '0906382147',
    ],
    [
      'ATM Tiện Lợi Hòa Lạc',
      'Sảnh khu dịch vụ công cộng Hòa Lạc, Hà Nội',
      'UTILITY',
      'ATM',
      'DELETED',
      'ADMIN',
      null,
      'Điểm ATM cũ từng phục vụ rút tiền và tra cứu số dư; máy đã được di dời nên bản ghi được giữ ở trạng thái đã xóa để minh họa lịch sử.',
      'Ngừng hoạt động',
      null,
    ],
  ];

  const locations = locationDefinitions.map((definition, index) => {
    const [
      name,
      address,
      categoryKey,
      subKey,
      status,
      source,
      ownerKey,
      description,
      openingHours,
      phone,
    ] = definition;
    const imagesUrls =
      index === 27
        ? []
        : index === 16
          ? []
          : index % 4 === 0
            ? [image(index, true), image(index + 1)]
            : [image(index, true)];
    return {
      _id: ids.locations[`L${index + 1}`],
      submittedBy:
        source === 'ADMIN'
          ? ids.users.ADMIN_DUONG
          : source === 'VENDOR'
            ? ids.users[ownerKey || 'VENDOR_DUONG']
            : ids.users.CUSTOMER_DUONG,
      ...(ownerKey ? { ownerId: ids.users[ownerKey] } : {}),
      name,
      description,
      address,
      geo: {
        type: 'Point',
        coordinates: [
          105.502 + (index % 7) * 0.009,
          20.986 + Math.floor(index / 7) * 0.014,
        ],
      },
      accuracyMeters: 8 + (index % 6) * 4,
      openingHours,
      ...(phone ? { phone } : {}),
      status,
      isDuplicate: index === 17,
      isSuspectedDuplicate: index === 11,
      viewCount: status === 'PUBLISHED' ? 120 + index * 37 : index * 3,
      source,
      categoryId: ids.categories[categoryKey],
      subCategoryIds: [ids.subCategories[subKey]],
      imagesUrls,
      submittedAt: daysAgo(150 - index * 3),
      ...timestamp(150 - index * 3),
    };
  });

  const productDefinitions = [
    [
      6,
      'Cơm gà nướng',
      'Suất cơm gà nướng kèm rau luộc và canh trong ngày.',
      45000,
    ],
    [
      6,
      'Phở bò tái',
      'Bát phở bò tái phục vụ buổi sáng với rau thơm và quẩy.',
      40000,
    ],
    [
      7,
      'Cà phê sữa đá',
      'Cà phê pha đậm cùng sữa đặc, phục vụ nóng hoặc đá.',
      35000,
    ],
    [
      7,
      'Trà đào cam sả',
      'Trà trái cây vị thanh với đào miếng, cam và sả.',
      45000,
    ],
    [
      8,
      'Cà phê rang tại chỗ',
      'Ly cà phê hạt rang mới, có lựa chọn pha máy hoặc lọc.',
      48000,
    ],
    [
      8,
      'Trà trái cây theo mùa',
      'Trà thanh nhẹ kết hợp trái cây có sẵn trong ngày.',
      52000,
    ],
    [
      9,
      'Cơm sườn rim',
      'Cơm nóng với sườn rim mặn ngọt, rau xào và canh.',
      48000,
    ],
    [9, 'Cơm cá kho', 'Cá kho tiêu ăn cùng cơm, rau luộc và nước canh.', 45000],
    [
      10,
      'Bún bò đặc biệt',
      'Bún bò thêm thịt, chả và móng giò, dùng kèm rau sống.',
      55000,
    ],
    [
      10,
      'Bún bò phần thường',
      'Phần bún bò vừa ăn với thịt bò, chả và rau thơm.',
      40000,
    ],
    [
      11,
      'Set nướng bốn người',
      'Set thịt, hải sản, rau và sốt chấm dành cho nhóm bốn người.',
      429000,
    ],
    [
      11,
      'Lẩu thái hải sản',
      'Nồi lẩu vị chua cay kèm hải sản, rau và mì cho ba người.',
      329000,
    ],
    [
      14,
      'Trà sữa ô long',
      'Trà ô long thơm, sữa vừa vị và trân châu đen.',
      39000,
    ],
    [
      14,
      'Trà sữa khoai môn',
      'Trà sữa khoai môn béo nhẹ, có thể điều chỉnh đường đá.',
      42000,
    ],
    [
      15,
      'Nước ép cam',
      'Cam tươi ép trong ngày, không thêm đường theo yêu cầu.',
      35000,
    ],
    [
      15,
      'Sinh tố bơ',
      'Bơ xay mịn cùng sữa, phù hợp dùng sau khi tập luyện.',
      45000,
    ],
    [
      16,
      'Bánh mì bơ tỏi',
      'Bánh mì nướng thơm bơ tỏi, bán theo phần hai chiếc.',
      28000,
    ],
    [
      16,
      'Bánh mousse chanh dây',
      'Bánh mousse vị chua nhẹ, bảo quản lạnh và bán theo miếng.',
      42000,
    ],
    [
      19,
      'Khẩu trang y tế',
      'Hộp khẩu trang y tế dùng một lần, quy cách năm mươi chiếc.',
      45000,
    ],
    [
      19,
      'Nước muối sinh lý',
      'Chai nước muối sinh lý dùng vệ sinh mũi và ngoài da.',
      12000,
    ],
    [
      21,
      'Vé tập một ngày',
      'Quyền sử dụng khu tập tự do trong một ngày, không gồm huấn luyện viên.',
      70000,
    ],
    [
      21,
      'Gói tập một tháng',
      'Gói vào cửa trong ba mươi ngày theo giờ hoạt động của phòng tập.',
      550000,
    ],
    [
      22,
      'Cắt tóc sinh viên',
      'Dịch vụ cắt và tạo kiểu cơ bản, đã gồm gội đầu.',
      80000,
    ],
    [
      22,
      'Nhuộm tóc ngắn',
      'Dịch vụ nhuộm một màu cho tóc ngắn, giá có thể đổi theo thuốc.',
      450000,
    ],
    [
      24,
      'Bộ bút ghi chú',
      'Bộ bút nhiều màu phù hợp ghi bài và đánh dấu tài liệu.',
      32000,
    ],
    [
      24,
      'Mì ly tiện lợi',
      'Mì ly có kèm nĩa, có thể sử dụng nước nóng tại quầy.',
      15000,
    ],
    [
      25,
      'Cơm nắm cá ngừ',
      'Cơm nắm đóng gói dùng trong ngày, bảo quản tại quầy lạnh.',
      26000,
    ],
    [
      26,
      'Giặt sấy tiêu chuẩn',
      'Giặt và sấy quần áo thông thường, tính giá theo một kilogram.',
      25000,
    ],
    [
      27,
      'Thay dầu xe số',
      'Gói thay dầu máy phổ thông, đã gồm kiểm tra nhanh lốp và phanh.',
      110000,
    ],
    [
      27,
      'Vá lốp không săm',
      'Xử lý lỗ thủng nhỏ trên lốp không săm bằng phương pháp phù hợp.',
      50000,
    ],
  ];
  const products = productDefinitions.map(
    ([locationNumber, name, description, price], index) => ({
      _id: ids.products[`P${index + 1}`],
      locationId: ids.locations[`L${locationNumber}`],
      name,
      imageUrl: IMAGE_URLS[(index + 8) % IMAGE_URLS.length],
      description,
      price,
      ...timestamp(90 - index),
    }),
  );

  const workflowId = (base, index) => objectId(base + index);
  const adminDecision = (reason, days) => ({
    decidedBy: ids.users.ADMIN_DUONG,
    reason,
    decidedAt: daysAgo(days),
  });
  const evidence = ({
    urlIndex,
    fileType = 'IMAGE',
    locationNumber = 1,
    accuracyMeters = 15,
    capturedDaysAgo = 1,
    metadata = {},
  }) => ({
    url: IMAGE_URLS[urlIndex % IMAGE_URLS.length],
    fileType,
    ...(fileType === 'IMAGE'
      ? {
          geo: locations[locationNumber - 1].geo,
          accuracyMeters,
          capturedAt: daysAgo(capturedDaysAgo),
        }
      : {}),
    metadata: {
      source: 'demo-seed',
      ...metadata,
    },
  });

  const requestStatuses = [
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED',
    'PENDING_RE_APPROVAL',
  ];
  const requestConfigs = {
    CREATE: [12, 9, 13, null, 14],
    UPDATE: [7, 8, 10, 11, 15],
    DELETE: [16, 28, 19, 20, 21],
  };
  const locationRequests = [];
  let requestIndex = 0;
  for (const type of ['CREATE', 'UPDATE', 'DELETE']) {
    requestStatuses.forEach((status, statusIndex) => {
      requestIndex += 1;
      const locationNumber = requestConfigs[type][statusIndex];
      const location = locationNumber ? locations[locationNumber - 1] : null;
      const processed = ['APPROVED', 'REJECTED'].includes(status);
      const ownershipRequested =
        type === 'CREATE' &&
        ['APPROVED', 'PENDING_RE_APPROVAL'].includes(status);
      const potentialDuplicate = type === 'CREATE' && status === 'PENDING';
      const farPin = type === 'CREATE' && status === 'REJECTED';
      locationRequests.push({
        _id: workflowId(3000, requestIndex),
        type,
        status,
        submittedBy: ownershipRequested
          ? ids.users.VENDOR_DUONG
          : ids.users.CUSTOMER_DUONG,
        ...(location ? { locationId: location._id } : { locationId: null }),
        oldData:
          type === 'CREATE' || !location
            ? null
            : {
                name: location.name,
                description: location.description,
                address: location.address,
                openingHours: location.openingHours,
              },
        newData:
          type === 'DELETE'
            ? {
                reason:
                  'Địa điểm đã ngừng hoạt động hoặc người gửi đề nghị gỡ khỏi kết quả công khai.',
              }
            : {
                name: location?.name || 'Quán Ăn Sân Vườn Cam',
                description:
                  location?.description ||
                  'Quán ăn sân vườn do cộng đồng đề xuất, có khu ngồi thoáng và phục vụ các món Việt theo ngày cho sinh viên quanh Hòa Lạc.',
                address:
                  location?.address ||
                  'Khu dân cư Thạch Hòa, xã Hòa Lạc, Hà Nội',
                geo: location?.geo || {
                  type: 'Point',
                  coordinates: [105.535, 21.012],
                },
                categoryId: location?.categoryId || ids.categories.FOOD,
                subCategoryIds: location?.subCategoryIds || [
                  ids.subCategories.RICE,
                ],
                openingHours: location?.openingHours || '10:00–22:00 hằng ngày',
              },
        ownershipRequested,
        imageUrls: location?.imagesUrls.map((item) => item.url) || [
          IMAGE_URLS[8],
        ],
        pinLocation: location?.geo || {
          type: 'Point',
          coordinates: [105.535, 21.012],
        },
        deviceLocation: farPin
          ? { type: 'Point', coordinates: [105.56, 21.035] }
          : location?.geo || {
              type: 'Point',
              coordinates: [105.5351, 21.0121],
            },
        deviceDistanceMeters: farPin ? 3820 : 12 + requestIndex,
        isPotentialDuplicate: potentialDuplicate,
        suspectedDuplicateLocationIds: potentialDuplicate
          ? [ids.locations.L9]
          : [],
        ...(processed
          ? {
              reviewerId: ids.users.ADMIN_DUONG,
              reviewedAt: daysAgo(45 - requestIndex),
              reviewNote:
                status === 'APPROVED'
                  ? 'Thông tin, vị trí và hình ảnh đã được đối chiếu; yêu cầu đủ điều kiện phê duyệt.'
                  : farPin
                    ? 'Vị trí thiết bị cách điểm ghim quá xa và ảnh chưa chứng minh được địa chỉ kinh doanh.'
                    : 'Thông tin gửi lên chưa đủ căn cứ hoặc không còn phù hợp với trạng thái thực tế của địa điểm.',
            }
          : {}),
        ...(ownershipRequested
          ? {
              verificationProof: {
                imageUrls: [IMAGE_URLS[9]],
                videoUrls: [
                  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
                ],
                licenseUrls:
                  status === 'PENDING_RE_APPROVAL'
                    ? []
                    : [
                        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                      ],
                systemCode: `YUMI-HL-${String(requestIndex).padStart(3, '0')}`,
              },
            }
          : {}),
        ...timestamp(60 - requestIndex),
      });
    });
  }

  const claimRequests = [
    {
      _id: workflowId(3100, 1),
      vendorId: ids.users.VENDOR_LONG,
      locationId: ids.locations.L17,
      type: 'CLAIM_EXISTING_LOCATION',
      evidenceFiles: [evidence({ urlIndex: 16, locationNumber: 17 })],
      licenseUrl:
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      otpVerified: true,
      otpVerifiedAt: daysAgo(2),
      deviceDistanceMeters: 18,
      status: 'PENDING',
      ...timestamp(2),
    },
    {
      _id: workflowId(3100, 2),
      vendorId: ids.users.VENDOR_DUONG,
      locationId: ids.locations.L7,
      type: 'CLAIM_EXISTING_LOCATION',
      evidenceFiles: [
        evidence({ urlIndex: 6, locationNumber: 7, capturedDaysAgo: 20 }),
      ],
      licenseUrl:
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      otpVerified: true,
      otpVerifiedAt: daysAgo(20),
      deviceDistanceMeters: 11,
      status: 'APPROVED',
      adminDecision: adminDecision(
        'Giấy phép, ảnh biển hiệu và vị trí thiết bị trùng khớp với địa điểm.',
        18,
      ),
      ...timestamp(21),
    },
    {
      _id: workflowId(3100, 3),
      vendorId: ids.users.VENDOR_MINH,
      locationId: ids.locations.L13,
      type: 'CLAIM_EXISTING_LOCATION',
      evidenceFiles: [
        evidence({
          urlIndex: 12,
          locationNumber: 13,
          accuracyMeters: 85,
          capturedDaysAgo: 12,
        }),
      ],
      otpVerified: false,
      deviceDistanceMeters: 1640,
      status: 'REJECTED',
      adminDecision: adminDecision(
        'Người gửi chưa xác minh số điện thoại và bằng chứng được chụp quá xa địa điểm.',
        10,
      ),
      ...timestamp(12),
    },
    {
      _id: workflowId(3100, 4),
      vendorId: ids.users.VENDOR_LONG,
      locationId: ids.locations.L18,
      type: 'CLAIM_EXISTING_LOCATION',
      evidenceFiles: [
        evidence({ urlIndex: 17, locationNumber: 18, capturedDaysAgo: 80 }),
      ],
      otpVerified: true,
      otpVerifiedAt: daysAgo(80),
      deviceDistanceMeters: 20,
      status: 'RELEASED',
      adminDecision: adminDecision(
        'Chủ cũ chủ động trả quyền quản lý để địa điểm quay lại trạng thái cộng đồng.',
        30,
      ),
      ...timestamp(82),
    },
    {
      _id: workflowId(3100, 5),
      vendorId: ids.users.VENDOR_TRUNG,
      locationId: ids.locations.L28,
      type: 'CLAIM_EXISTING_LOCATION',
      evidenceFiles: [
        evidence({ urlIndex: 25, locationNumber: 28, capturedDaysAgo: 95 }),
      ],
      otpVerified: true,
      otpVerifiedAt: daysAgo(95),
      deviceDistanceMeters: 13,
      status: 'REVOKED',
      adminDecision: adminDecision(
        'Quyền sở hữu bị thu hồi sau khi xác minh địa điểm đã ngừng hoạt động.',
        70,
      ),
      ...timestamp(100),
    },
    {
      _id: workflowId(3100, 6),
      vendorId: ids.users.VENDOR_DUONG,
      locationId: ids.locations.L9,
      type: 'VENDOR_NEW_LOCATION',
      evidenceFiles: [
        evidence({ urlIndex: 8, locationNumber: 9, capturedDaysAgo: 65 }),
        evidence({
          urlIndex: 9,
          fileType: 'DOCUMENT',
          metadata: { document: 'Giấy đăng ký hộ kinh doanh' },
        }),
      ],
      licenseUrl:
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      otpVerified: true,
      otpVerifiedAt: daysAgo(65),
      deviceDistanceMeters: 9,
      status: 'APPROVED',
      adminDecision: adminDecision(
        'Hồ sơ đăng ký địa điểm mới có sở hữu đã được xác minh đầy đủ.',
        62,
      ),
      ...timestamp(66),
    },
  ];

  const accessDefinitions = [
    ['PENDING', 19, 'VENDOR_DUONG', 'VENDOR_LONG', 3, null, null],
    [
      'GRANTED',
      20,
      'VENDOR_DUONG',
      'VENDOR_LONG',
      -20,
      'Đồng ý chuyển quyền vì hợp đồng thuê đã kết thúc.',
      18,
    ],
    [
      'REJECTED',
      21,
      'VENDOR_TRUNG',
      'VENDOR_LONG',
      -12,
      'Hợp đồng cung cấp chưa chứng minh quyền quản lý địa điểm.',
      11,
    ],
    ['EXPIRED', 22, 'VENDOR_TRUNG', 'VENDOR_DUONG', -8, null, null],
    [
      'AUTO_GRANTED',
      25,
      'VENDOR_TRUNG',
      'VENDOR_LONG',
      -15,
      'Chủ hiện tại không phản hồi trong thời hạn và requester đã hoàn tất xác minh takeover.',
      10,
    ],
    [
      'ESCALATED',
      26,
      'VENDOR_TRUNG',
      'VENDOR_DUONG',
      -6,
      'Hai bên cung cấp thông tin trái ngược nên yêu cầu được chuyển sang tranh chấp.',
      5,
    ],
  ];
  const requestAccesses = accessDefinitions.map(
    (
      [
        status,
        locationNumber,
        currentOwnerKey,
        requesterKey,
        timeoutOffset,
        responseReason,
        respondedDaysAgo,
      ],
      index,
    ) => ({
      _id: workflowId(3200, index + 1),
      locationId: ids.locations[`L${locationNumber}`],
      requesterId: ids.users[requesterKey],
      currentOwnerId: ids.users[currentOwnerKey],
      evidenceFiles: [
        evidence({
          urlIndex: 18 + index,
          locationNumber,
          capturedDaysAgo: 25 - index * 3,
        }),
      ],
      otpVerified: true,
      status,
      timeoutAt: new Date(now.getTime() + timeoutOffset * 86_400_000),
      requestReason:
        'Tôi đang trực tiếp vận hành địa điểm và đã bổ sung tài liệu chứng minh trách nhiệm quản lý hiện tại.',
      ...(responseReason ? { responseReason } : {}),
      ...(respondedDaysAgo ? { respondedAt: daysAgo(respondedDaysAgo) } : {}),
      ...timestamp(28 - index * 3),
    }),
  );

  const disputes = [
    {
      _id: workflowId(3300, 1),
      requestAccessId: requestAccesses[5]._id,
      locationId: ids.locations.L26,
      vendorAId: ids.users.VENDOR_TRUNG,
      vendorBId: ids.users.VENDOR_DUONG,
      evidenceA: [
        evidence({ urlIndex: 24, locationNumber: 26, capturedDaysAgo: 5 }),
      ],
      evidenceB: [
        evidence({ urlIndex: 25, locationNumber: 26, capturedDaysAgo: 4 }),
      ],
      status: 'OPEN',
      ...timestamp(5),
    },
    {
      _id: workflowId(3300, 2),
      locationId: ids.locations.L27,
      vendorAId: ids.users.VENDOR_LONG,
      vendorBId: ids.users.VENDOR_DUONG,
      evidenceA: [
        evidence({ urlIndex: 25, locationNumber: 27, capturedDaysAgo: 50 }),
      ],
      evidenceB: [],
      status: 'RESOLVED_KEEP',
      adminDecision: adminDecision(
        'Hồ sơ đăng ký và lịch sử vận hành của chủ hiện tại có giá trị rõ ràng hơn.',
        42,
      ),
      ...timestamp(52),
    },
    {
      _id: workflowId(3300, 3),
      locationId: ids.locations.L10,
      vendorAId: ids.users.VENDOR_DUONG,
      vendorBId: ids.users.VENDOR_LONG,
      evidenceA: [
        evidence({ urlIndex: 9, locationNumber: 10, capturedDaysAgo: 75 }),
      ],
      evidenceB: [
        evidence({ urlIndex: 10, locationNumber: 10, capturedDaysAgo: 74 }),
      ],
      status: 'RESOLVED_TRANSFER',
      adminDecision: adminDecision(
        'Hợp đồng chuyển nhượng có chữ ký hai bên và thông tin thuế đã được đối chiếu.',
        68,
      ),
      ...timestamp(77),
    },
    {
      _id: workflowId(3300, 4),
      locationId: ids.locations.L18,
      vendorAId: ids.users.VENDOR_LONG,
      vendorBId: ids.users.VENDOR_TRUNG,
      evidenceA: [
        evidence({ urlIndex: 17, locationNumber: 18, capturedDaysAgo: 35 }),
      ],
      evidenceB: [
        evidence({ urlIndex: 18, locationNumber: 18, capturedDaysAgo: 34 }),
      ],
      status: 'RESOLVED_REVOKE',
      adminDecision: adminDecision(
        'Cả hai bên đều không chứng minh được quyền quản lý hợp lệ tại thời điểm xem xét.',
        30,
      ),
      ...timestamp(37),
    },
  ];

  const appeals = [
    {
      _id: workflowId(3400, 1),
      type: 'REQUEST_ACCESS_REJECTED',
      targetCollection: 'request_accesses',
      targetId: requestAccesses[5]._id,
      appellantId: ids.users.VENDOR_DUONG,
      additionalEvidenceFiles: [
        evidence({
          urlIndex: 24,
          fileType: 'DOCUMENT',
          metadata: { document: 'Phụ lục hợp đồng thuê' },
        }),
      ],
      argument:
        'Đề nghị xem xét lại vì phụ lục hợp đồng mới thể hiện rõ quyền vận hành và nghĩa vụ thanh toán của tôi tại địa điểm.',
      status: 'ACCEPTED_TO_DISPUTE',
      originalDecisionReason:
        'Chủ hiện tại bác bỏ yêu cầu chuyển quyền quản lý.',
      originalDeciderId: ids.users.VENDOR_TRUNG,
      originalDecidedAt: daysAgo(6),
      appealDeadline: daysAgo(1),
      adminDecision: adminDecision(
        'Bằng chứng mới có ảnh hưởng trực tiếp nên chuyển hồ sơ sang tranh chấp hai bên.',
        5,
      ),
      ...timestamp(6),
    },
    {
      _id: workflowId(3400, 2),
      type: 'LOCATION_REJECTED',
      targetCollection: 'location_requests',
      targetId: locationRequests.find(
        (item) => item.type === 'CREATE' && item.status === 'APPROVED',
      )._id,
      appellantId: ids.users.VENDOR_DUONG,
      additionalEvidenceFiles: [
        evidence({ urlIndex: 8, locationNumber: 9, capturedDaysAgo: 40 }),
      ],
      argument:
        'Ảnh bổ sung đã thể hiện rõ biển hiệu, số nhà và khu vực phục vụ; mong quản trị viên khôi phục địa điểm để khách có thể tìm thấy.',
      status: 'OVERTURNED',
      originalDecisionReason: 'Ảnh mặt tiền ban đầu chưa thể hiện rõ địa chỉ.',
      originalDeciderId: ids.users.ADMIN_DUONG,
      originalDecidedAt: daysAgo(44),
      appealDeadline: daysAgo(30),
      adminDecision: adminDecision(
        'Bằng chứng bổ sung đủ rõ và vị trí trùng khớp nên quyết định cũ được đảo ngược.',
        38,
      ),
      ...timestamp(43),
    },
    {
      _id: workflowId(3400, 3),
      type: 'OWNERSHIP_REVOKED',
      targetCollection: 'disputes',
      targetId: disputes[3]._id,
      appellantId: ids.users.VENDOR_LONG,
      additionalEvidenceFiles: [
        evidence({
          urlIndex: 17,
          fileType: 'DOCUMENT',
          metadata: { document: 'Biên bản bàn giao đang chờ xác nhận' },
        }),
      ],
      argument:
        'Tôi đã bổ sung biên bản bàn giao và hóa đơn thuê mặt bằng; đề nghị xem xét lại việc thu hồi toàn bộ quyền sở hữu.',
      status: 'PENDING',
      originalDecisionReason: disputes[3].adminDecision.reason,
      originalDeciderId: ids.users.ADMIN_DUONG,
      originalDecidedAt: disputes[3].adminDecision.decidedAt,
      appealDeadline: new Date(now.getTime() + 5 * 86_400_000),
      ...timestamp(2),
    },
    {
      _id: workflowId(3400, 4),
      type: 'USER_BANNED',
      targetCollection: 'users',
      targetId: ids.users.BANNED_LONG,
      appellantId: ids.users.BANNED_LONG,
      additionalEvidenceFiles: [],
      argument:
        'Tôi cho rằng nhiều lượt báo cáo xuất phát từ hiểu nhầm và đề nghị kiểm tra lại lịch sử hoạt động của tài khoản.',
      status: 'UPHELD',
      originalDecisionReason:
        'Tài khoản lặp lại hành vi spam và tiếp tục vi phạm sau khi đã được cảnh báo.',
      originalDeciderId: ids.users.ADMIN_TRUNG,
      originalDecidedAt: daysAgo(25),
      appealDeadline: daysAgo(11),
      adminDecision: adminDecision(
        'Đối chiếu log cho thấy vi phạm lặp lại; quyết định khóa tài khoản được giữ nguyên.',
        17,
      ),
      ...timestamp(20),
    },
  ];
  disputes[0].appealId = appeals[0]._id;

  const reviewComments = [
    [
      7,
      'CUSTOMER_DUONG',
      5,
      'Cà phê thơm, nhân viên phục vụ nhanh và có nhiều bàn phù hợp làm bài nhóm.',
      'PUBLISHED',
    ],
    [
      7,
      'CUSTOMER_LONG',
      4,
      'Không gian thuận tiện trong campus, giờ cao điểm hơi ồn nhưng đồ uống ổn định.',
      'PUBLISHED',
    ],
    [
      8,
      'CUSTOMER_TRUNG',
      5,
      'Quán nhiều cây xanh, ánh sáng đẹp và trà trái cây có vị thanh, không quá ngọt.',
      'PUBLISHED',
    ],
    [
      9,
      'CUSTOMER_MINH',
      4,
      'Suất cơm vừa miệng, rau và canh thay đổi theo ngày; giao đến khu trọ khá đúng giờ.',
      'PUBLISHED',
    ],
    [
      10,
      'CUSTOMER_DUONG',
      5,
      'Nước dùng đậm vị nhưng không quá mặn, phần đặc biệt đủ no cho bữa trưa.',
      'PUBLISHED',
    ],
    [
      11,
      'CUSTOMER_LONG',
      3,
      'Đồ nướng ướp ổn, cuối tuần đông nên thời gian chờ món lâu hơn dự kiến.',
      'PUBLISHED',
    ],
    [
      14,
      'CUSTOMER_TRUNG',
      4,
      'Trà sữa thơm, có thể giảm đường; quán đang sửa lại biển giờ mở cửa.',
      'PUBLISHED',
    ],
    [
      15,
      'CUSTOMER_MINH',
      5,
      'Nước ép làm ngay khi gọi, vị tươi và cửa hàng chấp nhận yêu cầu không thêm đường.',
      'PUBLISHED',
    ],
    [
      16,
      'CUSTOMER_DUONG',
      4,
      'Bánh mới và mềm vào buổi sáng, mousse chanh dây có vị chua nhẹ dễ ăn.',
      'PUBLISHED',
    ],
    [
      17,
      'CUSTOMER_LONG',
      3,
      'Wifi ổn và bàn rộng, phòng họp nhỏ cần đặt sớm vào tuần chạy đồ án.',
      'PUBLISHED',
    ],
    [
      19,
      'CUSTOMER_TRUNG',
      5,
      'Dược sĩ tư vấn rõ cách dùng và chủ động nhắc trường hợp cần mang đơn thuốc.',
      'PUBLISHED',
    ],
    [
      20,
      'CUSTOMER_MINH',
      2,
      'Thời gian chờ buổi chiều khá lâu; nên gọi trước để hỏi lịch bác sĩ trong ngày.',
      'PUBLISHED',
    ],
    [
      21,
      'CUSTOMER_DUONG',
      4,
      'Thiết bị đủ cho buổi tập cơ bản, phòng thoáng nhưng khung giờ 18 giờ khá đông.',
      'PUBLISHED',
    ],
    [
      22,
      'CUSTOMER_LONG',
      5,
      'Thợ tư vấn kiểu tóc phù hợp và báo giá trước, lịch hẹn được giữ đúng giờ.',
      'PUBLISHED',
    ],
    [
      23,
      'CUSTOMER_TRUNG',
      1,
      'Trải nghiệm cũ không đúng kỳ vọng và nội dung này đã được người dùng chủ động xóa.',
      'DELETED',
    ],
    [
      24,
      'CUSTOMER_MINH',
      4,
      'Có đủ đồ dùng học tập và đồ ăn nhanh, quầy thanh toán tối hơi đông.',
      'PUBLISHED',
    ],
    [
      25,
      'WARNED_DUONG',
      1,
      'Nội dung đánh giá vi phạm quy tắc cộng đồng và đã được quản trị viên gỡ bỏ.',
      'REMOVED_BY_ADMIN',
    ],
    [
      27,
      'CUSTOMER_TRUNG',
      5,
      'Tiệm kiểm tra phanh miễn phí khi thay dầu và báo rõ giá phụ tùng trước khi sửa.',
      'PUBLISHED',
    ],
  ];
  const reviews = reviewComments.map(
    ([locationNumber, userKey, rating, comment, status], index) => ({
      _id: workflowId(3500, index + 1),
      locationId: ids.locations[`L${locationNumber}`],
      userId: ids.users[userKey],
      rating,
      comment,
      images:
        index % 5 === 0 ? [image(index + 8, true, daysAgo(20 - index))] : [],
      status,
      ...(index % 4 === 0 && status === 'PUBLISHED'
        ? {
            reply: {
              vendorId: locations[locationNumber - 1].ownerId,
              content:
                'Cảm ơn bạn đã chia sẻ trải nghiệm. Cửa hàng đã ghi nhận góp ý và sẽ tiếp tục cải thiện dịch vụ.',
              createdAt: daysAgo(10 - Math.min(index, 9)),
              updatedAt: daysAgo(9 - Math.min(index, 8)),
            },
          }
        : {}),
      ...timestamp(35 - index),
    }),
  );

  const editSuggestions = [
    [
      'PENDING',
      'VENDOR',
      7,
      'openingHours',
      '07:00–21:30 hằng ngày',
      '07:00–22:00 hằng ngày',
    ],
    [
      'PENDING',
      'ADMIN',
      17,
      'address',
      locations[16].address,
      'Tầng 2, khu dịch vụ công nghệ cao, Hòa Lạc, Hà Nội',
    ],
    ['APPLIED', 'VENDOR', 9, 'phone', '0963157824', '0963157825'],
    [
      'APPLIED',
      'ADMIN',
      1,
      'description',
      'Mô tả cũ chưa đầy đủ.',
      locations[0].description,
    ],
    [
      'DISCARDED',
      'VENDOR',
      10,
      'openingHours',
      locations[9].openingHours,
      'Mở cửa 24 giờ',
    ],
    [
      'DISCARDED',
      'ADMIN',
      18,
      'name',
      locations[17].name,
      'Trung tâm Kỹ năng FPT chính thức',
    ],
  ].map(
    (
      [status, routingTarget, locationNumber, fieldName, oldValue, newValue],
      index,
    ) => ({
      _id: workflowId(3600, index + 1),
      locationId: ids.locations[`L${locationNumber}`],
      userId: ids.users[index % 2 ? 'CUSTOMER_LONG' : 'CUSTOMER_DUONG'],
      fieldName,
      oldValue,
      newValue,
      routingTarget,
      status,
      ...(status !== 'PENDING'
        ? {
            reviewedBy:
              routingTarget === 'ADMIN'
                ? ids.users.ADMIN_TRUNG
                : locations[locationNumber - 1].ownerId,
            reviewedAt: daysAgo(12 - index),
            reviewReason:
              status === 'APPLIED'
                ? 'Thông tin mới đã được kiểm tra và phù hợp với thực tế.'
                : 'Đề xuất chưa có bằng chứng đủ rõ hoặc tên mới có thể gây hiểu nhầm.',
          }
        : {}),
      ...timestamp(18 - index),
    }),
  );

  const reportDefinitions = [
    ['LOCATION', 12, 'INCORRECT_INFORMATION', 'STANDARD_REVIEW', 'PENDING'],
    ['REVIEW', null, 'SPAM', 'STANDARD_REVIEW', 'UNDER_REVIEW'],
    ['USER', null, 'OTHER', 'STANDARD_REVIEW', 'APPROVED'],
    ['OWNERSHIP', null, 'WRONG_OWNER', 'OWNERSHIP_REVIEW', 'REJECTED'],
    ['LOCATION', 28, 'PERMANENTLY_CLOSED', 'STANDARD_REVIEW', 'DISMISSED'],
    ['LOCATION', 18, 'INCORRECT_INFORMATION', 'STANDARD_REVIEW', 'APPEALED'],
    ['OWNERSHIP', null, 'WRONG_OWNER', 'OWNERSHIP_REVIEW', 'RESOLVED'],
    ['REVIEW', null, 'SPAM', 'STANDARD_REVIEW', 'PENDING'],
  ];
  const reports = reportDefinitions.map(
    ([targetType, locationNumber, reason, route, status], index) => {
      const targetId =
        targetType === 'LOCATION'
          ? ids.locations[`L${locationNumber}`]
          : targetType === 'REVIEW'
            ? reviews[index === 1 ? 16 : 14]._id
            : targetType === 'USER'
              ? ids.users.WARNED_DUONG
              : claimRequests[index === 3 ? 2 : 4]._id;
      return {
        _id: workflowId(3700, index + 1),
        reporterId: ids.users[index % 2 ? 'CUSTOMER_TRUNG' : 'CUSTOMER_LONG'],
        targetType,
        targetId,
        reason,
        evidenceFiles:
          index % 2 === 0
            ? [
                evidence({
                  urlIndex: index + 10,
                  locationNumber: locationNumber || 1,
                  capturedDaysAgo: 10,
                }),
              ]
            : [],
        description:
          'Báo cáo demo có mô tả cụ thể về thông tin cần kiểm tra, thời điểm quan sát và ảnh hưởng đến người dùng khác.',
        route,
        ...(route === 'OWNERSHIP_REVIEW'
          ? { affectedVendorId: ids.users.VENDOR_LONG }
          : {}),
        status,
        ...(status !== 'PENDING'
          ? {
              handledBy: ids.users.ADMIN_TRUNG,
              resultReason:
                'Quản trị viên đã đối chiếu nội dung, bằng chứng và lịch sử thay đổi trước khi đưa ra kết quả.',
              resolvedAt: daysAgo(8 - Math.min(index, 7)),
            }
          : {}),
        ...timestamp(22 - index),
      };
    },
  );

  const bookmarkPairs = [
    ['CUSTOMER_DUONG', 7],
    ['CUSTOMER_DUONG', 9],
    ['CUSTOMER_DUONG', 21],
    ['CUSTOMER_LONG', 8],
    ['CUSTOMER_LONG', 10],
    ['CUSTOMER_LONG', 17],
    ['CUSTOMER_TRUNG', 11],
    ['CUSTOMER_TRUNG', 15],
    ['CUSTOMER_TRUNG', 27],
    ['CUSTOMER_MINH', 5],
    ['CUSTOMER_MINH', 16],
    ['CUSTOMER_MINH', 24],
  ];
  const bookmarks = bookmarkPairs.map(([userKey, locationNumber], index) => ({
    _id: workflowId(3800, index + 1),
    userId: ids.users[userKey],
    locationId: ids.locations[`L${locationNumber}`],
    ...timestamp(30 - index),
  }));

  const notificationDefinitions = [
    [
      'LOCATION_APPROVED',
      'Địa điểm đã được phê duyệt',
      'Địa điểm bạn gửi đã xuất hiện trên bản đồ.',
      'location_requests',
      locationRequests[1]._id,
    ],
    [
      'LOCATION_REJECTED',
      'Địa điểm chưa được chấp nhận',
      'Hãy xem lý do và bổ sung bằng chứng rõ hơn.',
      'location_requests',
      locationRequests[2]._id,
    ],
    [
      'CLAIM_APPROVED',
      'Claim đã được duyệt',
      'Bạn hiện là chủ sở hữu được xác minh của địa điểm.',
      'claim_requests',
      claimRequests[1]._id,
    ],
    [
      'CLAIM_REJECTED',
      'Claim bị từ chối',
      'Bằng chứng hiện tại chưa đáp ứng yêu cầu xác minh.',
      'claim_requests',
      claimRequests[2]._id,
    ],
    [
      'DISPUTE_RESOLVED',
      'Tranh chấp đã có kết quả',
      'Quản trị viên đã công bố quyết định sau khi xem xét hai bên.',
      'disputes',
      disputes[2]._id,
    ],
    [
      'APPEAL_OVERTURNED',
      'Kháng nghị được chấp nhận',
      'Quyết định cũ đã được đảo ngược dựa trên bằng chứng mới.',
      'appeals',
      appeals[1]._id,
    ],
    [
      'APPEAL_UPHELD',
      'Giữ nguyên quyết định',
      'Quản trị viên giữ nguyên quyết định ban đầu.',
      'appeals',
      appeals[3]._id,
    ],
    [
      'REQUEST_ACCESS_GRANTED',
      'Đã cấp quyền truy cập',
      'Bạn đã nhận quyền quản lý địa điểm.',
      'request_accesses',
      requestAccesses[1]._id,
    ],
    [
      'REQUEST_ACCESS_REJECTED',
      'Yêu cầu truy cập bị từ chối',
      'Chủ hiện tại đã phản hồi và không đồng ý chuyển quyền.',
      'request_accesses',
      requestAccesses[2]._id,
    ],
    [
      'ACCOUNT_WARNED',
      'Tài khoản nhận cảnh báo',
      'Một số hoạt động gần đây chưa tuân thủ quy tắc cộng đồng.',
      'users',
      ids.users.WARNED_DUONG,
    ],
    [
      'ACCOUNT_BANNED',
      'Tài khoản bị khóa',
      'Tài khoản bị khóa do vi phạm lặp lại sau cảnh báo.',
      'users',
      ids.users.BANNED_LONG,
    ],
    [
      'EDIT_SUGGESTION_APPLIED',
      'Đề xuất đã được áp dụng',
      'Thông tin mới đã được cập nhật vào địa điểm.',
      'edit_suggestions',
      editSuggestions[2]._id,
    ],
    [
      'EDIT_SUGGESTION_DISCARDED',
      'Đề xuất chưa được áp dụng',
      'Xem lý do phản hồi từ người xử lý.',
      'edit_suggestions',
      editSuggestions[4]._id,
    ],
    [
      'REVIEW_REMOVED',
      'Đánh giá đã bị gỡ',
      'Nội dung đánh giá vi phạm quy tắc cộng đồng.',
      'reviews',
      reviews[16]._id,
    ],
    [
      'SYSTEM',
      'Chào mừng đến bộ dữ liệu demo',
      'Bạn có thể khám phá đầy đủ các trạng thái workflow trong môi trường demo.',
      null,
      null,
    ],
  ];
  const notifications = notificationDefinitions.map(
    ([type, title, body, refCollection, refId], index) => ({
      _id: workflowId(3900, index + 1),
      userId:
        index % 3 === 0
          ? ids.users.VENDOR_DUONG
          : index % 3 === 1
            ? ids.users.VENDOR_LONG
            : ids.users.CUSTOMER_DUONG,
      type,
      ...(refCollection ? { refCollection, refId } : {}),
      title,
      body,
      isRead: index % 2 === 0,
      ...timestamp(18 - index),
    }),
  );

  const auditDefinitions = [
    [
      'LOCATION_REQUEST_APPROVE',
      'location_requests',
      locationRequests[1]._id,
      'Yêu cầu tạo địa điểm đã đủ điều kiện.',
      { requestStatus: { from: 'PENDING', to: 'APPROVED' } },
    ],
    [
      'CLAIM_APPROVE',
      'claim_requests',
      claimRequests[1]._id,
      claimRequests[1].adminDecision.reason,
      { ownerId: { from: null, to: String(ids.users.VENDOR_DUONG) } },
    ],
    [
      'REQUEST_ACCESS_GRANT',
      'request_accesses',
      requestAccesses[1]._id,
      requestAccesses[1].responseReason,
      {
        ownerId: {
          from: String(ids.users.VENDOR_DUONG),
          to: String(ids.users.VENDOR_LONG),
        },
      },
    ],
    [
      'DISPUTE_KEEP',
      'disputes',
      disputes[1]._id,
      disputes[1].adminDecision.reason,
      {
        ownerId: {
          from: String(ids.users.VENDOR_LONG),
          to: String(ids.users.VENDOR_LONG),
        },
      },
    ],
    [
      'DISPUTE_TRANSFER',
      'disputes',
      disputes[2]._id,
      disputes[2].adminDecision.reason,
      {
        ownerId: {
          from: String(ids.users.VENDOR_DUONG),
          to: String(ids.users.VENDOR_LONG),
        },
      },
    ],
    [
      'DISPUTE_REVOKE',
      'disputes',
      disputes[3]._id,
      disputes[3].adminDecision.reason,
      { ownerId: { from: String(ids.users.VENDOR_LONG), to: null } },
    ],
    [
      'APPEAL_OVERTURN',
      'appeals',
      appeals[1]._id,
      appeals[1].adminDecision.reason,
      { appealStatus: { from: 'PENDING', to: 'OVERTURNED' } },
    ],
    [
      'REPORT_RESOLVE',
      'reports',
      reports[6]._id,
      reports[6].resultReason,
      { reportStatus: { from: 'UNDER_REVIEW', to: 'RESOLVED' } },
    ],
    [
      'update_user_status:BANNED',
      'users',
      ids.users.BANNED_LONG,
      appeals[3].originalDecisionReason,
      { status: { from: 'WARNED', to: 'BANNED' } },
    ],
  ];
  const auditLogs = auditDefinitions.map(
    ([action, targetCollection, targetId, reason, diff], index) => ({
      _id: workflowId(4000, index + 1),
      actorId: index === 8 ? ids.users.ADMIN_TRUNG : ids.users.ADMIN_DUONG,
      action,
      targetCollection,
      targetId,
      reason,
      diff,
      createdAt: daysAgo(20 - index),
    }),
  );

  const trustDefinitions = [
    [
      'LOCATION_APPROVED',
      8,
      'Địa điểm được xác minh chính xác.',
      'location_requests',
      locationRequests[1]._id,
    ],
    [
      'CORRECT_REPORT',
      5,
      'Báo cáo giúp cập nhật thông tin đã đóng cửa.',
      'reports',
      reports[4]._id,
    ],
    [
      'LIVE_REVIEW',
      2,
      'Đánh giá có nội dung cụ thể và ảnh thực tế.',
      'reviews',
      reviews[0]._id,
    ],
    [
      'VIOLATING_CONTENT_REMOVED',
      -15,
      'Nội dung vi phạm đã bị quản trị viên gỡ.',
      'reviews',
      reviews[16]._id,
    ],
    [
      'FALSE_REPORT',
      -8,
      'Báo cáo không có bằng chứng và kết quả không đúng.',
      'reports',
      reports[3]._id,
    ],
    [
      'ADMIN_ADJUSTMENT',
      10,
      'Điều chỉnh sau khi kiểm tra lịch sử đóng góp.',
      'users',
      ids.users.CUSTOMER_TRUNG,
    ],
  ];
  const trustEvents = trustDefinitions.map(
    ([type, pointChange, reason, refCollection, refId], index) => ({
      _id: workflowId(4100, index + 1),
      userId: index === 3 ? ids.users.WARNED_DUONG : ids.users.CUSTOMER_TRUNG,
      type,
      pointChange,
      reason,
      refCollection,
      refId,
      createdAt: daysAgo(24 - index),
    }),
  );

  const locationViews = Array.from({ length: 24 }, (_, index) => {
    const locationNumber = 7 + (index % 12);
    const userKeys = [
      'CUSTOMER_DUONG',
      'CUSTOMER_LONG',
      'CUSTOMER_TRUNG',
      'CUSTOMER_MINH',
    ];
    const viewDay = daysAgo(Math.floor(index / 8));
    return {
      _id: workflowId(4200, index + 1),
      locationId: ids.locations[`L${locationNumber}`],
      userId: ids.users[userKeys[index % userKeys.length]],
      viewDate: viewDay.toISOString().slice(0, 10),
      viewedAt: new Date(viewDay.getTime() + (index % 8) * 3_600_000),
      ...timestamp(3 - Math.floor(index / 8)),
    };
  });

  const otps = [
    ['CHANGE_PHONE', 'SMS', '0964281753', 'PENDING', 'VENDOR_DUONG', null],
    [
      'CLAIM_LOCATION',
      'SYSTEM',
      'YUMI-HL-CLAIM',
      'VERIFIED',
      'VENDOR_LONG',
      17,
    ],
    ['REQUEST_ACCESS', 'SMS', '0972458136', 'VERIFIED', 'VENDOR_TRUNG', 19],
    [
      'RESET_PASSWORD',
      'EMAIL',
      'duong.customer@gmail.com',
      'CANCELLED',
      'CUSTOMER_DUONG',
      null,
    ],
    [
      'VERIFY_EMAIL',
      'EMAIL',
      'long.customer@gmail.com',
      'LOCKED',
      'CUSTOMER_LONG',
      null,
    ],
  ].map(
    (
      [purpose, channel, recipient, status, userKey, locationNumber],
      index,
    ) => ({
      _id: workflowId(4300, index + 1),
      userId: ids.users[userKey],
      ...(locationNumber
        ? { locationId: ids.locations[`L${locationNumber}`] }
        : {}),
      purpose,
      channel,
      recipient,
      otpHash: `sha256:demo-only-hash-${String(index + 1).padStart(2, '0')}-not-plaintext`,
      status,
      expiresAt: new Date(now.getTime() + (index + 1) * 86_400_000),
      ...(status === 'VERIFIED' ? { verifiedAt: daysAgo(1) } : {}),
      metadata: { deviceId: `demo-device-${index + 1}`, source: 'demo-seed' },
      ...timestamp(2),
    }),
  );

  const claimVerificationSessions = [
    {
      _id: workflowId(4400, 1),
      vendorId: ids.users.VENDOR_LONG,
      locationId: ids.locations.L17,
      siteCode: 'YUMI-HL-017',
      otpHash: 'sha256:claim-session-demo-hash-01',
      otpRequired: true,
      otpVerified: true,
      attempts: 1,
      expiresAt: new Date(now.getTime() + 2 * 86_400_000),
      createdAt: daysAgo(1),
    },
    {
      _id: workflowId(4400, 2),
      vendorId: ids.users.VENDOR_MINH,
      locationId: ids.locations.L13,
      siteCode: 'YUMI-HL-013',
      otpHash: null,
      otpRequired: false,
      otpVerified: false,
      attempts: 0,
      expiresAt: new Date(now.getTime() + 1 * 86_400_000),
      createdAt: daysAgo(1),
    },
  ];

  const requestAccessVerificationSessions = [
    {
      _id: workflowId(4500, 1),
      userId: ids.users.VENDOR_LONG,
      locationId: ids.locations.L19,
      requestAccessId: requestAccesses[0]._id,
      purpose: 'CREATE',
      otpRequired: true,
      otpHash: 'sha256:access-session-demo-hash-01',
      otpVerified: true,
      attempts: 1,
      expiresAt: new Date(now.getTime() + 2 * 86_400_000),
      createdAt: daysAgo(1),
    },
    {
      _id: workflowId(4500, 2),
      userId: ids.users.VENDOR_DUONG,
      locationId: ids.locations.L22,
      requestAccessId: requestAccesses[3]._id,
      purpose: 'TAKEOVER',
      otpRequired: true,
      otpHash: 'sha256:access-session-demo-hash-02',
      otpVerified: false,
      attempts: 2,
      expiresAt: new Date(now.getTime() + 1 * 86_400_000),
      createdAt: daysAgo(1),
    },
  ];

  const dataset = Object.fromEntries(
    COLLECTION_ORDER.map((name) => [name, []]),
  );
  return {
    ...dataset,
    users,
    categories,
    sub_categories: subCategories,
    locations,
    products,
    location_requests: locationRequests,
    claim_requests: claimRequests,
    request_accesses: requestAccesses,
    disputes,
    appeals,
    reviews,
    edit_suggestions: editSuggestions,
    reports,
    bookmarks,
    notifications,
    audit_logs: auditLogs,
    trust_events: trustEvents,
    location_views: locationViews,
    otps,
    claimverificationsessions: claimVerificationSessions,
    requestaccessverificationsessions: requestAccessVerificationSessions,
  };
}

function validateDataset(dataset, { now = new Date() } = {}) {
  const errors = [];
  const keyOf = (value) => String(value ?? '');
  const add = (condition, message) => {
    if (!condition) errors.push(message);
  };
  const collectionSets = {};

  for (const collection of COLLECTION_ORDER) {
    const docs = dataset[collection];
    add(Array.isArray(docs), `${collection} must be an array`);
    if (!Array.isArray(docs)) continue;
    const ids = docs.map((doc) => keyOf(doc._id));
    add(ids.every(Boolean), `${collection} contains a document without _id`);
    add(
      new Set(ids).size === ids.length,
      `${collection} contains duplicate _id values`,
    );
    collectionSets[collection] = new Set(ids);
  }

  const has = (collection, value) =>
    Boolean(value) && collectionSets[collection]?.has(keyOf(value));
  const ref = (collection, docCollection, doc, field, optional = false) => {
    const value = doc[field];
    if (optional && !value) return;
    add(
      has(collection, value),
      `${docCollection}.${field} references a missing ${collection} document`,
    );
  };
  const unique = (items, label, keyBuilder) => {
    const keys = items.map(keyBuilder);
    add(new Set(keys).size === keys.length, `${label} must be unique`);
  };
  const covers = (items, field, expected, label) => {
    const actual = [...new Set(items.map((item) => item[field]))].sort();
    add(
      JSON.stringify(actual) === JSON.stringify([...expected].sort()),
      `${label} coverage is incomplete: ${actual.join(', ')}`,
    );
  };
  const oneCover = (assets, label) => {
    add(
      (assets || []).filter((asset) => asset.isCover).length <= 1,
      `${label} contains more than one cover image`,
    );
  };

  unique(dataset.users, 'users.email', (item) => item.email.toLowerCase());
  unique(dataset.categories, 'categories.name', (item) =>
    item.name.toLowerCase(),
  );
  unique(
    dataset.sub_categories,
    'sub_categories category/name pair',
    (item) => `${keyOf(item.categoryId)}:${item.name.toLowerCase()}`,
  );
  unique(
    dataset.reviews,
    'reviews location/user pair',
    (item) => `${keyOf(item.locationId)}:${keyOf(item.userId)}`,
  );
  unique(
    dataset.bookmarks,
    'bookmarks user/location pair',
    (item) => `${keyOf(item.userId)}:${keyOf(item.locationId)}`,
  );
  unique(
    dataset.location_views,
    'location_views location/user/date triple',
    (item) =>
      `${keyOf(item.locationId)}:${keyOf(item.userId)}:${item.viewDate}`,
  );
  unique(
    dataset.appeals,
    'appeals target collection/id pair',
    (item) => `${item.targetCollection}:${keyOf(item.targetId)}`,
  );
  unique(
    dataset.claimverificationsessions,
    'claim verification vendor/location pair',
    (item) => `${keyOf(item.vendorId)}:${keyOf(item.locationId)}`,
  );

  for (const item of dataset.sub_categories) {
    ref('categories', 'sub_categories', item, 'categoryId');
  }
  const subCategoryById = new Map(
    dataset.sub_categories.map((item) => [keyOf(item._id), item]),
  );
  for (const item of dataset.locations) {
    ref('users', 'locations', item, 'submittedBy');
    ref('users', 'locations', item, 'ownerId', true);
    ref('categories', 'locations', item, 'categoryId');
    for (const subCategoryId of item.subCategoryIds || []) {
      add(
        has('sub_categories', subCategoryId),
        'locations.subCategoryIds references a missing sub_categories document',
      );
      const subCategory = subCategoryById.get(keyOf(subCategoryId));
      add(
        !subCategory ||
          keyOf(subCategory.categoryId) === keyOf(item.categoryId),
        `locations ${item.name} uses a subcategory from another category`,
      );
    }
    oneCover(item.imagesUrls, `locations ${item.name}`);
    add(
      item.description.length >= 80 && /[À-ỹĐđ]/u.test(item.description),
      `locations ${item.name} needs a realistic Vietnamese description`,
    );
    const [longitude, latitude] = item.geo?.coordinates || [];
    add(
      longitude >= 105.49 &&
        longitude <= 105.57 &&
        latitude >= 20.98 &&
        latitude <= 21.04,
      `locations ${item.name} is outside the Hòa Lạc demo bounding box`,
    );
  }
  for (const item of dataset.products) {
    ref('locations', 'products', item, 'locationId');
  }
  for (const item of dataset.location_requests) {
    ref('users', 'location_requests', item, 'submittedBy');
    ref('locations', 'location_requests', item, 'locationId', true);
    ref('users', 'location_requests', item, 'reviewerId', true);
    if (['APPROVED', 'REJECTED'].includes(item.status)) {
      add(
        item.reviewerId && item.reviewedAt && item.reviewNote,
        `processed location request ${item._id} needs reviewer decision fields`,
      );
    }
  }
  for (const item of dataset.claim_requests) {
    ref('users', 'claim_requests', item, 'vendorId');
    ref('locations', 'claim_requests', item, 'locationId');
    if (item.adminDecision?.decidedBy) {
      add(
        has('users', item.adminDecision.decidedBy),
        'claim_requests.adminDecision.decidedBy references a missing user',
      );
    }
  }
  for (const item of dataset.request_accesses) {
    ref('locations', 'request_accesses', item, 'locationId');
    ref('users', 'request_accesses', item, 'requesterId');
    ref('users', 'request_accesses', item, 'currentOwnerId');
  }
  for (const item of dataset.disputes) {
    ref('request_accesses', 'disputes', item, 'requestAccessId', true);
    ref('appeals', 'disputes', item, 'appealId', true);
    ref('locations', 'disputes', item, 'locationId');
    ref('users', 'disputes', item, 'vendorAId');
    ref('users', 'disputes', item, 'vendorBId');
    if (item.status !== 'OPEN') {
      add(
        item.adminDecision?.decidedBy && item.adminDecision?.decidedAt,
        `resolved dispute ${item._id} needs an admin decision`,
      );
    }
  }
  for (const item of dataset.appeals) {
    ref('users', 'appeals', item, 'appellantId');
    ref('users', 'appeals', item, 'originalDeciderId', true);
    add(
      has(item.targetCollection, item.targetId),
      `appeals.targetId references a missing ${item.targetCollection} document`,
    );
    if (item.status === 'PENDING') {
      add(
        new Date(item.appealDeadline) > now,
        `pending appeal ${item._id} needs a future deadline`,
      );
      add(
        !item.adminDecision,
        `pending appeal ${item._id} cannot have an admin decision`,
      );
    } else {
      add(
        item.adminDecision?.decidedBy && item.adminDecision?.decidedAt,
        `processed appeal ${item._id} needs an admin decision`,
      );
    }
  }
  for (const item of dataset.reviews) {
    ref('locations', 'reviews', item, 'locationId');
    ref('users', 'reviews', item, 'userId');
    if (item.reply) ref('users', 'reviews.reply', item.reply, 'vendorId');
    oneCover(item.images, `reviews ${item._id}`);
  }
  for (const item of dataset.edit_suggestions) {
    ref('locations', 'edit_suggestions', item, 'locationId');
    ref('users', 'edit_suggestions', item, 'userId');
    ref('users', 'edit_suggestions', item, 'reviewedBy', true);
  }
  const reportTargets = {
    LOCATION: 'locations',
    REVIEW: 'reviews',
    USER: 'users',
    OWNERSHIP: 'claim_requests',
  };
  for (const item of dataset.reports) {
    ref('users', 'reports', item, 'reporterId');
    ref('users', 'reports', item, 'affectedVendorId', true);
    ref('users', 'reports', item, 'handledBy', true);
    add(
      has(reportTargets[item.targetType], item.targetId),
      `reports.targetId references a missing ${reportTargets[item.targetType]} document`,
    );
  }
  for (const item of dataset.bookmarks) {
    ref('users', 'bookmarks', item, 'userId');
    ref('locations', 'bookmarks', item, 'locationId');
  }
  for (const item of dataset.notifications) {
    ref('users', 'notifications', item, 'userId');
    if (item.refCollection) {
      add(
        has(item.refCollection, item.refId),
        `notifications.refId references a missing ${item.refCollection} document`,
      );
    }
  }
  for (const item of dataset.audit_logs) {
    ref('users', 'audit_logs', item, 'actorId');
    add(
      has(item.targetCollection, item.targetId),
      `audit_logs.targetId references a missing ${item.targetCollection} document`,
    );
  }
  for (const item of dataset.trust_events) {
    ref('users', 'trust_events', item, 'userId');
    if (item.refCollection) {
      add(
        has(item.refCollection, item.refId),
        `trust_events.refId references a missing ${item.refCollection} document`,
      );
    }
  }
  for (const item of dataset.location_views) {
    ref('locations', 'location_views', item, 'locationId');
    ref('users', 'location_views', item, 'userId');
  }
  for (const item of dataset.otps) {
    ref('users', 'otps', item, 'userId', true);
    ref('locations', 'otps', item, 'locationId', true);
    add(
      !/\b\d{6}\b/.test(item.otpHash),
      `otps ${item._id} appears to contain a plaintext OTP`,
    );
    add(
      new Date(item.expiresAt) > now,
      `otps ${item._id} would be removed by the TTL index`,
    );
  }
  for (const item of dataset.claimverificationsessions) {
    ref('users', 'claimverificationsessions', item, 'vendorId');
    ref('locations', 'claimverificationsessions', item, 'locationId');
    add(
      new Date(item.expiresAt) > now,
      `claim verification session ${item._id} is expired`,
    );
  }
  for (const item of dataset.requestaccessverificationsessions) {
    ref('users', 'requestaccessverificationsessions', item, 'userId');
    ref('locations', 'requestaccessverificationsessions', item, 'locationId');
    ref(
      'request_accesses',
      'requestaccessverificationsessions',
      item,
      'requestAccessId',
      true,
    );
    add(
      new Date(item.expiresAt) > now,
      `access verification session ${item._id} is expired`,
    );
  }

  const pendingClaims = dataset.claim_requests.filter(
    (item) => item.status === 'PENDING',
  );
  unique(pendingClaims, 'pending claim location', (item) =>
    keyOf(item.locationId),
  );
  const pendingAccesses = dataset.request_accesses.filter(
    (item) => item.status === 'PENDING',
  );
  unique(pendingAccesses, 'pending access location', (item) =>
    keyOf(item.locationId),
  );
  const pendingUpdates = dataset.location_requests.filter(
    (item) =>
      item.type === 'UPDATE' &&
      ['PENDING', 'PENDING_RE_APPROVAL'].includes(item.status),
  );
  unique(pendingUpdates, 'pending update request location', (item) =>
    keyOf(item.locationId),
  );

  const locationById = new Map(
    dataset.locations.map((item) => [keyOf(item._id), item]),
  );
  for (const claim of dataset.claim_requests) {
    const location = locationById.get(keyOf(claim.locationId));
    if (!location) continue;
    if (claim.status === 'APPROVED') {
      add(
        keyOf(location.ownerId) === keyOf(claim.vendorId),
        `APPROVED claim ${claim._id} does not match the location owner`,
      );
    }
    if (['RELEASED', 'REVOKED'].includes(claim.status)) {
      add(
        !location.ownerId,
        `${claim.status} claim ${claim._id} must leave the location ownerless`,
      );
    }
  }
  for (const access of dataset.request_accesses) {
    const location = locationById.get(keyOf(access.locationId));
    if (!location) continue;
    const expectedOwner = ['GRANTED', 'AUTO_GRANTED'].includes(access.status)
      ? access.requesterId
      : access.currentOwnerId;
    add(
      keyOf(location.ownerId) === keyOf(expectedOwner),
      `${access.status} access owner does not match the final location owner`,
    );
    if (access.status === 'PENDING') {
      add(
        new Date(access.timeoutAt) > now,
        'PENDING access timeout must be in the future',
      );
    }
    if (['EXPIRED', 'AUTO_GRANTED'].includes(access.status)) {
      add(
        new Date(access.timeoutAt) < now,
        `${access.status} access timeout must be in the past`,
      );
    }
  }
  for (const dispute of dataset.disputes) {
    const location = locationById.get(keyOf(dispute.locationId));
    if (!location) continue;
    const expectedOwner =
      dispute.status === 'RESOLVED_TRANSFER'
        ? dispute.vendorBId
        : dispute.status === 'RESOLVED_REVOKE'
          ? null
          : dispute.vendorAId;
    add(
      keyOf(location.ownerId) === keyOf(expectedOwner),
      `${dispute.status} dispute owner does not match the final location owner`,
    );
  }

  for (const user of dataset.users) {
    add(
      /^(duong|minh|long|trung)([.+][a-z0-9]+)?@gmail\.com$/.test(user.email),
      `users.email ${user.email} is outside the approved persona family`,
    );
    if (user.email.startsWith('minh')) {
      add(!Object.hasOwn(user, 'phone'), `${user.email} must not have a phone`);
      add(
        user.phoneVerified === false,
        `${user.email} must not be phone verified`,
      );
    }
  }

  covers(
    dataset.locations,
    'status',
    [
      'SUBMITTED',
      'PUBLISHED',
      'HIDDEN',
      'REJECTED',
      'PENDING_RE_APPROVAL',
      'DELETED',
    ],
    'location status',
  );
  covers(
    dataset.location_requests,
    'type',
    ['CREATE', 'UPDATE', 'DELETE'],
    'location request type',
  );
  covers(
    dataset.location_requests,
    'status',
    ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'PENDING_RE_APPROVAL'],
    'location request status',
  );
  covers(
    dataset.claim_requests,
    'status',
    ['PENDING', 'APPROVED', 'REJECTED', 'RELEASED', 'REVOKED'],
    'claim status',
  );
  covers(
    dataset.claim_requests,
    'type',
    ['CLAIM_EXISTING_LOCATION', 'VENDOR_NEW_LOCATION'],
    'claim type',
  );
  covers(
    dataset.request_accesses,
    'status',
    ['PENDING', 'GRANTED', 'REJECTED', 'EXPIRED', 'AUTO_GRANTED', 'ESCALATED'],
    'request access status',
  );
  covers(
    dataset.disputes,
    'status',
    ['OPEN', 'RESOLVED_KEEP', 'RESOLVED_TRANSFER', 'RESOLVED_REVOKE'],
    'dispute status',
  );
  covers(
    dataset.appeals,
    'type',
    [
      'REQUEST_ACCESS_REJECTED',
      'LOCATION_REJECTED',
      'OWNERSHIP_REVOKED',
      'USER_BANNED',
    ],
    'appeal type',
  );
  covers(
    dataset.appeals,
    'status',
    ['PENDING', 'ACCEPTED_TO_DISPUTE', 'OVERTURNED', 'UPHELD'],
    'appeal status',
  );
  add(
    !dataset.appeals.some((item) => item.type === 'CLAIM_REJECTED'),
    'CLAIM_REJECTED appeal is not supported by the current contract',
  );

  if (errors.length) {
    throw new Error(
      `Demo dataset validation failed:\n- ${errors.join('\n- ')}`,
    );
  }
  return true;
}

function assertDemoDatabase(uri) {
  let databaseName = '';
  try {
    const parsed = new URL(uri);
    databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  } catch {
    throw new Error(
      'Refusing to reset: MONGODB_URL is not a valid MongoDB URI',
    );
  }
  if (databaseName !== 'demo') {
    throw new Error(
      `Refusing to reset database "${databaseName || '(missing)'}"; expected exactly "demo".`,
    );
  }
  return databaseName;
}

function readMongoUri() {
  const envPath = path.join(apiDir, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^MONGODB_URL=(.+)$/m);
  if (!match) {
    throw new Error('MONGODB_URL not found in apps/api/.env');
  }
  const uri = match[1].trim().replace(/^(['"])(.*)\1$/, '$2');
  assertDemoDatabase(uri);
  return uri;
}

function printDemoGuide(dataset) {
  console.log('\nTài khoản demo (mật khẩu chung: Demo@123456)');
  console.table(
    dataset.users.map((user) => ({
      email: user.email,
      vaiTro: user.role,
      trangThai: user.status,
      xacMinhSo: user.phoneVerified ? 'Đã xác minh' : 'Chưa xác minh',
    })),
  );
  console.log('\nKịch bản cốt lõi');
  console.table([
    {
      tinhNang: 'Claim',
      case: 'PENDING / APPROVED / REJECTED / RELEASED / REVOKED',
      taiKhoan: 'duong@gmail.com, long@gmail.com, minh.vendor@gmail.com',
    },
    {
      tinhNang: 'Access Request',
      case: 'PENDING / GRANTED / REJECTED / EXPIRED / AUTO_GRANTED / ESCALATED',
      taiKhoan: 'duong@gmail.com, long@gmail.com, trung@gmail.com',
    },
    {
      tinhNang: 'Dispute',
      case: 'OPEN / KEEP / TRANSFER / REVOKE',
      taiKhoan: 'Admin: duong.admin@gmail.com',
    },
    {
      tinhNang: 'Appeal',
      case: 'PENDING / ACCEPTED_TO_DISPUTE / OVERTURNED / UPHELD',
      taiKhoan: 'Admin: trung.admin@gmail.com',
    },
    {
      tinhNang: 'Location Request',
      case: '15 tổ hợp CREATE / UPDATE / DELETE và 5 trạng thái',
      taiKhoan: 'duong.customer@gmail.com, duong@gmail.com',
    },
  ]);
}

async function resetDemoDatabase({
  uri = readMongoUri(),
  now = new Date(),
} = {}) {
  assertDemoDatabase(uri);
  const bcrypt = require(require.resolve('bcryptjs', { paths: [apiDir] }));
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const dataset = buildDataset({ now, passwordHash });
  validateDataset(dataset, { now });

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    const db = mongoose.connection.db;
    if (!db || db.databaseName !== 'demo') {
      throw new Error(
        `Refusing to reset connected database "${db?.databaseName || '(missing)'}"; expected exactly "demo".`,
      );
    }

    const existingCollections = await db
      .listCollections({}, { nameOnly: true })
      .toArray();
    for (const { name } of existingCollections) {
      if (!name.startsWith('system.')) {
        await db.collection(name).deleteMany({});
      }
    }

    const counts = [];
    for (const collection of COLLECTION_ORDER) {
      const documents = dataset[collection];
      if (documents.length > 0) {
        await db
          .collection(collection)
          .insertMany(documents, { ordered: true });
      }
      const actual = await db.collection(collection).countDocuments();
      if (actual !== documents.length) {
        throw new Error(
          `${collection} count mismatch: expected ${documents.length}, received ${actual}`,
        );
      }
      counts.push({ collection, documents: actual });
    }

    console.log(`Demo database reset completed: ${db.databaseName}`);
    console.table(counts);
    printDemoGuide(dataset);
    return { databaseName: db.databaseName, counts, dataset };
  } finally {
    await mongoose.disconnect();
  }
}

function safeErrorMessage(error) {
  return String(error?.message || error).replace(
    /(mongodb(?:\+srv)?:\/\/)[^@/]+@/gi,
    '$1***@',
  );
}

async function main() {
  await resetDemoDatabase();
}

module.exports = {
  COLLECTION_ORDER,
  DEMO_PASSWORD,
  IMAGE_URLS,
  assertDemoDatabase,
  buildDataset,
  resetDemoDatabase,
  validateDataset,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(`Seed failed: ${safeErrorMessage(error)}`);
    process.exitCode = 1;
  });
}
