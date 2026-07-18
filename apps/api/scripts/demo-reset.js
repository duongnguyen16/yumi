const fs = require('fs');
const path = require('path');
const apiDir = path.join(__dirname, '..');
const seedDir = path.join(apiDir, '..', '..', 'seed_data');

const PHRASES = [
  ['Quan an, nha hang', 'Quán ăn, nhà hàng'], ['Quan an', 'Quán ăn'], ['Ca phe va giai khat', 'Cà phê và giải khát'],
  ['Hoa Lac', 'Hòa Lạc'], ['Ha Noi', 'Hà Nội'], ['Cong nghe cao', 'Công nghệ cao'], ['Com van phong', 'Cơm văn phòng'],
  ['Lau va nuong', 'Lẩu và nướng'], ['tra sua', 'trà sữa'], ['nuoc ep', 'nước ép'], ['do an', 'đồ ăn'],
  ['dia diem', 'địa điểm'], ['Dia diem', 'Địa điểm'], ['Duong', 'Đường'], ['duong', 'đường'], ['Gan', 'Gần'], ['gan', 'gần'],
  ['phuc vu', 'phục vụ'], ['sinh vien', 'sinh viên'], ['nhan vien', 'nhân viên'], ['thu gian', 'thư giãn'], ['khong gian', 'không gian'],
  ['hang ngay', 'hằng ngày'], ['an sang', 'ăn sáng'], ['an trua', 'ăn trưa'], ['Com', 'Cơm'], ['com', 'cơm'], ['Pho', 'Phở'], ['pho', 'phở'],
  ['nuoc dung', 'nước dùng'], ['dam vi', 'đậm vị'], [' tai ', ' tại '], [' va ', ' và '], [' an ', ' ăn '], ['Nha ', 'Nhà '], ['nha ', 'nhà '],
];
function normalizeVietnameseText(value) { return PHRASES.reduce((text, [from, to]) => text.replaceAll(from, to), value); }
function isPlainObject(value) {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function normalizeValue(value) {
  if (typeof value === 'string') return normalizeVietnameseText(value);
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (isPlainObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeValue(item)]));
  return value;
}
function readMongoUri() {
  const line = fs.readFileSync(path.join(apiDir, '.env'), 'utf8').split(/\r?\n/).find((item) => item.startsWith('MONGODB_URL='));
  if (!line) throw new Error('MONGODB_URL not found in apps/api/.env');
  return line.slice('MONGODB_URL='.length).trim();
}
async function main() {
  const mongoose = require(require.resolve('mongoose', { paths: [apiDir] }));
  const bcrypt = require(require.resolve('bcryptjs', { paths: [apiDir] }));
  const { EJSON } = require(require.resolve('bson', { paths: [apiDir] }));
  const uri = readMongoUri();
  const database = new URL(uri).pathname.slice(1);
  if (database !== 'demo') throw new Error(`Refusing to reset database "${database}"; expected "demo".`);
  const id = (value) => new mongoose.Types.ObjectId(value);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;
  await db.dropDatabase();
  for (const [file, collection] of [['categories.seed.json', 'categories'], ['sub_categories.seed.json', 'sub_categories'], ['locations.seed.json', 'locations'], ['products.seed.json', 'products'], ['reviews.seed.json', 'reviews']]) {
    const docs = normalizeValue(EJSON.parse(fs.readFileSync(path.join(seedDir, file), 'utf8'), { relaxed: false }));
    await db.collection(collection).insertMany(docs);
  }
  const now = new Date(); const daysAgo = (days) => new Date(now.getTime() - days * 86400000); const daysFromNow = (days) => new Date(now.getTime() + days * 86400000);
  const IDS = { admin: id('667999999999999999999999'), duong: id('667300000000000000000001'), wdp: id('667300000000000000000002'), customer: id('667300000000000000000003'), reviewer: id('667300000000000000000004'), one: id('667200000000000000000001'), two: id('667200000000000000000002'), three: id('667200000000000000000003'), four: id('667200000000000000000004'), five: id('667200000000000000000005'), pending: id('66b000000000000000000001'), approved: id('66b000000000000000000002'), rejected: id('66b000000000000000000003'), access: id('66b000000000000000000010'), dispute: id('66b000000000000000000050'), appeal: id('66b000000000000000000060') };
  const passwordHash = await bcrypt.hash('Demo@123456', 12);
  const user = (key, email, fullName, role, phone, extra = {}) => ({ _id: IDS[key], email, fullName, role, phone, phoneVerified: true, status: 'ACTIVE', trustScore: role === 'ADMIN' ? 100 : 35, trustLevel: 'TRUSTED', passwordHash, createdAt: daysAgo(20), updatedAt: now, ...extra });
  await db.collection('users').insertMany([user('admin', 'admin@gmail.com', 'Quản trị viên Demo', 'ADMIN', '0901000001'), user('duong', 'duong@gmail.com', 'Dương Nguyễn', 'VENDOR', '0901000002', { trustScore: 62 }), user('wdp', 'wdp@gmail.com', 'WDP Demo', 'VENDOR', '0901000003', { trustScore: 38 }), user('customer', 'customer@gmail.com', 'Minh Anh', 'CUSTOMER', '0901000004', { phoneVerified: false, status: 'WARNED', trustScore: 4, trustLevel: 'NEW' }), user('reviewer', 'reviewer@gmail.com', 'Khánh Linh', 'CUSTOMER', '0901000005')]);
  await db.collection('locations').bulkWrite([{ updateOne: { filter: { _id: IDS.one }, update: { $set: { ownerId: IDS.duong, phone: '0901000002', updatedAt: now } } } }, { updateOne: { filter: { _id: IDS.two }, update: { $set: { ownerId: IDS.wdp, phone: '0901000003', updatedAt: now } } } }, { updateOne: { filter: { _id: IDS.three }, update: { $unset: { ownerId: '' }, $set: { updatedAt: now } } } }, { updateOne: { filter: { _id: IDS.four }, update: { $set: { ownerId: IDS.wdp, updatedAt: now } } } }]);
  const evidence = (url, fileType = 'IMAGE') => ({ url, fileType, capturedAt: daysAgo(1), geo: { type: 'Point', coordinates: [105.5269, 21.0127] }, accuracyMeters: 15, metadata: { siteCode: 'HL-DEMO' } });
  await db.collection('claim_requests').insertMany([{ _id: IDS.pending, vendorId: IDS.duong, locationId: IDS.three, type: 'CLAIM_EXISTING_LOCATION', evidenceFiles: [evidence('https://images.unsplash.com/photo-1515003197210-e0cd71810b5f')], licenseUrl: 'https://example.com/giay-phep-duong.pdf', otpVerified: true, otpVerifiedAt: daysAgo(1), deviceDistanceMeters: 18, status: 'PENDING', createdAt: daysAgo(1), updatedAt: now }, { _id: IDS.approved, vendorId: IDS.wdp, locationId: IDS.four, type: 'CLAIM_EXISTING_LOCATION', evidenceFiles: [evidence('https://images.unsplash.com/photo-1551218808-94e220e084d2')], otpVerified: true, otpVerifiedAt: daysAgo(8), deviceDistanceMeters: 12, status: 'APPROVED', adminDecision: { decidedBy: IDS.admin, reason: 'Đã đối chiếu giấy phép kinh doanh và vị trí.', decidedAt: daysAgo(7) }, createdAt: daysAgo(8), updatedAt: now }, { _id: IDS.rejected, vendorId: IDS.duong, locationId: IDS.five, type: 'CLAIM_EXISTING_LOCATION', evidenceFiles: [], otpVerified: false, status: 'REJECTED', adminDecision: { decidedBy: IDS.admin, reason: 'Chưa có bằng chứng xác minh quyền sở hữu.', decidedAt: daysAgo(4) }, createdAt: daysAgo(5), updatedAt: now }]);
  await db.collection('request_accesses').insertOne({ _id: IDS.access, locationId: IDS.one, requesterId: IDS.wdp, currentOwnerId: IDS.duong, evidenceFiles: [evidence('https://images.unsplash.com/photo-1552566626-52f8b828add9')], otpVerified: true, status: 'REJECTED', timeoutAt: daysAgo(2), responseReason: 'Chủ sở hữu hiện tại không đồng ý chuyển quyền.', respondedAt: daysAgo(2), createdAt: daysAgo(4), updatedAt: now });
  await db.collection('disputes').insertOne({ _id: IDS.dispute, requestAccessId: IDS.access, locationId: IDS.one, vendorAId: IDS.duong, vendorBId: IDS.wdp, evidenceA: [evidence('https://images.unsplash.com/photo-1515003197210-e0cd71810b5f')], evidenceB: [evidence('https://images.unsplash.com/photo-1552566626-52f8b828add9')], status: 'OPEN', createdAt: daysAgo(1), updatedAt: now });
  await db.collection('appeals').insertOne({ _id: IDS.appeal, type: 'REQUEST_ACCESS_REJECTED', targetCollection: 'request_accesses', targetId: IDS.access, appellantId: IDS.wdp, additionalEvidenceFiles: [evidence('https://example.com/hop-dong-wdp.pdf', 'DOCUMENT')], argument: 'Đề nghị xem xét lại vì đã bổ sung hợp đồng chuyển nhượng hợp lệ.', status: 'PENDING', originalDecisionReason: 'Chủ sở hữu hiện tại không đồng ý chuyển quyền.', originalDeciderId: IDS.duong, originalDecidedAt: daysAgo(2), appealDeadline: daysFromNow(5), createdAt: daysAgo(1), updatedAt: now });
  console.log(`Demo database reset: ${database}`); console.log('Accounts: admin@gmail.com, duong@gmail.com, wdp@gmail.com, customer@gmail.com, reviewer@gmail.com'); console.log('Shared password: Demo@123456'); console.log(`Counts: users=${await db.collection('users').countDocuments()}, claims=${await db.collection('claim_requests').countDocuments()}, disputes=${await db.collection('disputes').countDocuments()}, appeals=${await db.collection('appeals').countDocuments()}`);
  await mongoose.disconnect();
}
if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });
module.exports = { normalizeValue, normalizeVietnameseText };
