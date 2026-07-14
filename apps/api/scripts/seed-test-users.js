// Creates deterministic local fixtures for manual testing without clearing DB.
// It only upserts documents with the fixture IDs below, so unrelated data stays intact.
const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '..');

const envContent = fs.readFileSync(path.join(apiDir, '.env'), 'utf8');
const uriLine = envContent
  .split('\n')
  .find((l) => l.startsWith('MONGODB_URL='));
if (!uriLine) {
  console.error('MONGODB_URL not found in apps/api/.env');
  process.exit(1);
}
const uri = uriLine.slice('MONGODB_URL='.length).trim();

const mongoose = require(require.resolve('mongoose', { paths: [apiDir] }));
const bcrypt = require(require.resolve('bcryptjs', { paths: [apiDir] }));
const { ObjectId } = require(require.resolve('bson', { paths: [apiDir] }));

const PASSWORD = 'Test@123456';
const now = new Date();
const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
const daysFromNow = (days) =>
  new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
const id = (value) => new ObjectId(value);

const IDS = {
  admin: id('667999999999999999999999'),
  customer: id('667300000000000000000001'),
  customerTrusted: id('667300000000000000000002'),
  customerWarned: id('667300000000000000000003'),
  customerBanned: id('667300000000000000000004'),
  vendorOwner: id('6a1d849705b8ebc19edea794'),
  vendorClaimant: id('66a000000000000000000001'),
  vendorChallenger: id('66a000000000000000000002'),
  vendorPending: id('66a000000000000000000003'),
  locationOwned: id('667200000000000000000001'),
  locationOwnedSecond: id('667200000000000000000002'),
  locationClaimable: id('667200000000000000000005'),
  locationCommunity: id('667200000000000000000007'),
  review: id('667400000000000000000001'),
  claimPending: id('66b000000000000000000001'),
  claimApproved: id('66b000000000000000000002'),
  requestPending: id('66b000000000000000000010'),
  requestRejected: id('66b000000000000000000011'),
  suggestionAdmin: id('66b000000000000000000020'),
  suggestionVendor: id('66b000000000000000000021'),
  suggestionApplied: id('66b000000000000000000022'),
  reportPending: id('66b000000000000000000030'),
  reportResolved: id('66b000000000000000000031'),
  locationRequest: id('66b000000000000000000040'),
  locationRequestApproved: id('66b000000000000000000041'),
  dispute: id('66b000000000000000000050'),
  appeal: id('66b000000000000000000060'),
  bookmark: id('66b000000000000000000070'),
  notification: id('66b000000000000000000080'),
  auditLog: id('66b000000000000000000090'),
  trustEvent: id('66b0000000000000000000a0'),
};

const evidence = (label, withSiteCode = true) => ({
  url: `https://example.com/test-fixtures/${label}.jpg`,
  fileType: 'IMAGE',
  geo: { type: 'Point', coordinates: [105.5409, 21.0132] },
  accuracyMeters: 12,
  capturedAt: daysAgo(1),
  ...(withSiteCode ? { metadata: { siteCode: 'CLG-TEST1' } } : {}),
});

const USERS = [
  {
    _id: IDS.admin,
    email: 'admin@wdp301.dev',
    fullName: 'Admin Test',
    role: 'ADMIN',
    phone: '0900000001',
    phoneVerified: true,
    trustScore: 100,
    trustLevel: 'TRUSTED',
  },
  {
    _id: IDS.customer,
    email: 'customer@wdp301.dev',
    fullName: 'Nguyen Van A',
    role: 'CUSTOMER',
    phone: '0900000002',
    phoneVerified: true,
    trustScore: 10,
    trustLevel: 'NEW',
  },
  {
    _id: IDS.customerTrusted,
    email: 'trusted@wdp301.dev',
    fullName: 'Tran Thi B',
    role: 'CUSTOMER',
    phone: '0900000003',
    phoneVerified: true,
    trustScore: 45,
    trustLevel: 'TRUSTED',
  },
  {
    _id: IDS.customerWarned,
    email: 'warned@wdp301.dev',
    fullName: 'Le Van C',
    role: 'CUSTOMER',
    phone: '0900000004',
    phoneVerified: false,
    trustScore: 0,
    trustLevel: 'NEW',
    status: 'WARNED',
  },
  {
    _id: IDS.customerBanned,
    email: 'banned@wdp301.dev',
    fullName: 'Tai khoan bi cam',
    role: 'CUSTOMER',
    phone: '0900000005',
    phoneVerified: false,
    trustScore: -10,
    trustLevel: 'BANNED',
    status: 'BANNED',
  },
  {
    _id: IDS.vendorOwner,
    email: 'owner@wdp301.dev',
    fullName: 'Chu quan da xac minh',
    role: 'VENDOR',
    phone: '0900000011',
    phoneVerified: true,
    trustScore: 60,
    trustLevel: 'TRUSTED',
  },
  {
    _id: IDS.vendorClaimant,
    email: 'claimant@wdp301.dev',
    fullName: 'Vendor dang claim',
    role: 'VENDOR',
    phone: '0900000012',
    phoneVerified: true,
    trustScore: 30,
    trustLevel: 'TRUSTED',
  },
  {
    _id: IDS.vendorChallenger,
    email: 'challenger@wdp301.dev',
    fullName: 'Vendor yeu cau quyen',
    role: 'VENDOR',
    phone: '0900000013',
    phoneVerified: true,
    trustScore: 30,
    trustLevel: 'TRUSTED',
  },
  {
    _id: IDS.vendorPending,
    email: 'pending-vendor@wdp301.dev',
    fullName: 'Vendor cho duyet',
    role: 'VENDOR',
    phone: '0900000014',
    phoneVerified: true,
    trustScore: 0,
    trustLevel: 'NEW',
  },
];

const fixtureCollections = () => ({
  vendorprofiles: [
    {
      _id: id('66b000000000000000000101'),
      user_id: IDS.vendorOwner,
      business_name: 'Com Nha Hoa Lac',
      business_phone: '0900000011',
      business_address: 'Hoa Lac',
      verification_status: 'approved',
    },
    {
      _id: id('66b000000000000000000102'),
      user_id: IDS.vendorClaimant,
      business_name: 'Quan an Dang Claim',
      business_phone: '0900000012',
      business_address: 'Hoa Lac',
      verification_status: 'approved',
    },
    {
      _id: id('66b000000000000000000103'),
      user_id: IDS.vendorPending,
      business_name: 'Quan moi cho duyet',
      business_phone: '0900000014',
      business_address: 'Hoa Lac',
      verification_status: 'pending',
    },
  ],
  claim_requests: [
    {
      _id: IDS.claimPending,
      vendorId: IDS.vendorClaimant,
      locationId: IDS.locationClaimable,
      type: 'CLAIM_EXISTING_LOCATION',
      evidenceFiles: [evidence('claim-pending')],
      licenseUrl: 'https://example.com/test-fixtures/claim-license.pdf',
      otpVerified: true,
      otpVerifiedAt: daysAgo(1),
      status: 'PENDING',
    },
    {
      _id: IDS.claimApproved,
      vendorId: IDS.vendorOwner,
      locationId: IDS.locationOwned,
      type: 'CLAIM_EXISTING_LOCATION',
      evidenceFiles: [evidence('claim-approved')],
      otpVerified: true,
      otpVerifiedAt: daysAgo(10),
      status: 'APPROVED',
      adminDecision: {
        decidedBy: IDS.admin,
        reason: 'Fixture claim da duoc duyet',
        decidedAt: daysAgo(9),
      },
    },
  ],
  request_accesses: [
    {
      _id: IDS.requestPending,
      locationId: IDS.locationOwned,
      requesterId: IDS.vendorChallenger,
      currentOwnerId: IDS.vendorOwner,
      evidenceFiles: [evidence('access-pending')],
      otpVerified: true,
      status: 'PENDING',
      timeoutAt: daysFromNow(3),
    },
    {
      _id: IDS.requestRejected,
      locationId: IDS.locationOwnedSecond,
      requesterId: IDS.vendorChallenger,
      currentOwnerId: IDS.vendorOwner,
      evidenceFiles: [evidence('access-rejected')],
      otpVerified: true,
      status: 'REJECTED',
      timeoutAt: daysAgo(4),
      responseReason: 'Chu hien tai khong dong y chuyen quyen',
      respondedAt: daysAgo(2),
    },
  ],
  edit_suggestions: [
    {
      _id: IDS.suggestionAdmin,
      locationId: IDS.locationCommunity,
      userId: IDS.customer,
      fieldName: 'openingHours',
      oldValue: '08:00 - 22:00',
      newValue: { value: '07:00 - 23:00', note: 'Da kiem tra tai dia diem' },
      routingTarget: 'ADMIN',
      status: 'PENDING',
    },
    {
      _id: IDS.suggestionVendor,
      locationId: IDS.locationOwned,
      userId: IDS.customerTrusted,
      fieldName: 'phone',
      oldValue: null,
      newValue: { value: '0900000011', note: 'So lien he moi' },
      routingTarget: 'VENDOR',
      status: 'PENDING',
    },
    {
      _id: IDS.suggestionApplied,
      locationId: IDS.locationCommunity,
      userId: IDS.customerTrusted,
      fieldName: 'description',
      oldValue: 'Mo ta cu',
      newValue: { value: 'Mo ta da duoc cap nhat', note: 'Fixture lich su' },
      routingTarget: 'ADMIN',
      status: 'APPLIED',
      reviewedBy: IDS.admin,
      reviewedAt: daysAgo(3),
      reviewReason: 'Thong tin da duoc doi chieu',
    },
  ],
  reports: [
    {
      _id: IDS.reportPending,
      reporterId: IDS.customer,
      targetType: 'LOCATION',
      targetId: IDS.locationOwned,
      reason: 'WRONG_OWNER',
      evidenceFiles: [evidence('report-pending')],
      description: 'Can kiem tra lai chu so huu cua dia diem.',
      route: 'OWNERSHIP_REVIEW',
      affectedVendorId: IDS.vendorOwner,
      status: 'PENDING',
    },
    {
      _id: IDS.reportResolved,
      reporterId: IDS.customerTrusted,
      targetType: 'REVIEW',
      targetId: IDS.review,
      reason: 'SPAM',
      evidenceFiles: [],
      description: 'Review mau da duoc xu ly.',
      route: 'STANDARD_REVIEW',
      status: 'RESOLVED',
      handledBy: IDS.admin,
      resultReason: 'Fixture report da xu ly',
      resolvedAt: daysAgo(2),
    },
  ],
  location_requests: [
    {
      _id: IDS.locationRequest,
      type: 'CREATE',
      status: 'PENDING',
      submittedBy: IDS.vendorPending,
      newData: {
        name: 'Dia diem vendor cho duyet',
        description: 'Fixture cho hang doi admin.',
        address: 'Hoa Lac',
        categoryId: id('667000000000000000000001'),
      },
      changedFields: ['name', 'description', 'address'],
      imageUrls: [],
      pinLocation: { type: 'Point', coordinates: [105.541, 21.013] },
      deviceLocation: { type: 'Point', coordinates: [105.5409, 21.0132] },
      deviceDistanceMeters: 18,
      verificationProof: {
        proofUrls: [
          'https://example.com/test-fixtures/vendor-new-location.jpg',
        ],
        systemCode: 'LOC-TEST1',
        capturedAt: daysAgo(1),
      },
    },
    {
      _id: IDS.locationRequestApproved,
      type: 'UPDATE',
      status: 'APPROVED',
      submittedBy: IDS.vendorOwner,
      locationId: IDS.locationOwned,
      oldData: { openingHours: '08:00 - 22:00' },
      newData: { openingHours: '07:00 - 22:30' },
      changedFields: ['openingHours'],
      reviewerId: IDS.admin,
      reviewedAt: daysAgo(4),
      reviewNote: 'Fixture update da duyet',
    },
  ],
  disputes: [
    {
      _id: IDS.dispute,
      requestAccessId: IDS.requestRejected,
      locationId: IDS.locationOwnedSecond,
      vendorAId: IDS.vendorOwner,
      vendorBId: IDS.vendorChallenger,
      evidenceA: [evidence('dispute-owner')],
      evidenceB: [evidence('dispute-challenger')],
      status: 'OPEN',
    },
  ],
  appeals: [
    {
      _id: IDS.appeal,
      type: 'REQUEST_ACCESS_REJECTED',
      targetCollection: 'request_accesses',
      targetId: IDS.requestRejected,
      appellantId: IDS.vendorChallenger,
      additionalEvidenceFiles: [evidence('appeal')],
      argument:
        'Toi de nghi xem xet lai yeu cau chuyen quyen voi bang chung bo sung.',
      status: 'PENDING',
      originalDecisionReason: 'Chu hien tai khong dong y chuyen quyen',
      originalDeciderId: IDS.vendorOwner,
      originalDecidedAt: daysAgo(2),
      appealDeadline: daysFromNow(5),
    },
  ],
  bookmarks: [
    { _id: IDS.bookmark, userId: IDS.customer, locationId: IDS.locationOwned },
  ],
  notifications: [
    {
      _id: IDS.notification,
      userId: IDS.vendorClaimant,
      type: 'CLAIM_SUBMITTED',
      refCollection: 'claim_requests',
      refId: IDS.claimPending,
      title: 'Da nhan yeu cau claim',
      body: 'Fixture claim dang cho admin duyet.',
      isRead: false,
    },
  ],
  audit_logs: [
    {
      _id: IDS.auditLog,
      actorId: IDS.admin,
      action: 'FIXTURE_SEED',
      targetCollection: 'claim_requests',
      targetId: IDS.claimPending,
      reason: 'Du lieu mau cho manual testing',
      diff: { fixture: true },
    },
  ],
  trust_events: [
    {
      _id: IDS.trustEvent,
      userId: IDS.customerTrusted,
      type: 'LOCATION_APPROVED',
      pointChange: 15,
      reason: 'Du lieu mau trust',
      refCollection: 'locations',
      refId: IDS.locationCommunity,
    },
  ],
});

async function upsert(collection, docs) {
  const result = await mongoose.connection.db.collection(collection).bulkWrite(
    docs.map((doc) => ({
      replaceOne: {
        filter: { _id: doc._id },
        replacement: {
          ...doc,
          createdAt: doc.createdAt ?? daysAgo(7),
          updatedAt: now,
        },
        upsert: true,
      },
    })),
  );
  console.log(
    `${collection}: ${docs.length} fixture(s), ${result.upsertedCount} inserted, ${result.modifiedCount} updated`,
  );
}

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log('Connected to db:', mongoose.connection.db.databaseName);

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  await upsert(
    'users',
    USERS.map((user) => ({
      ...user,
      passwordHash,
      status: user.status ?? 'ACTIVE',
      createdAt: daysAgo(14),
    })),
  );

  await mongoose.connection.db.collection('locations').bulkWrite([
    {
      updateOne: {
        filter: { _id: IDS.locationOwned },
        update: {
          $set: {
            ownerId: IDS.vendorOwner,
            phone: '0900000011',
            updatedAt: now,
          },
        },
      },
    },
    {
      updateOne: {
        filter: { _id: IDS.locationOwnedSecond },
        update: {
          $set: {
            ownerId: IDS.vendorOwner,
            phone: '0900000011',
            updatedAt: now,
          },
        },
      },
    },
    {
      updateOne: {
        filter: { _id: IDS.locationClaimable },
        update: {
          $unset: { ownerId: '' },
          $set: { phone: '0900000099', updatedAt: now },
        },
      },
    },
  ]);
  console.log('locations: refreshed ownership fixtures for manual testing');

  for (const [collection, docs] of Object.entries(fixtureCollections())) {
    await upsert(collection, docs);
  }

  console.log(`All accounts share the password: ${PASSWORD}`);
  for (const user of USERS)
    console.log(
      `  - ${user.role.padEnd(8)} ${user.email} (${user.status ?? 'ACTIVE'})`,
    );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err.name, err.code || '');
  process.exit(1);
});
