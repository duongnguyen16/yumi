const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEMO_PASSWORD,
  assertDemoDatabase,
  buildDataset,
  validateDataset,
} = require('./demo-seed');

const NOW = new Date('2026-07-26T04:00:00.000Z');
const HASH = '$2b$12$012345678901234567890uYl4LkH6y1cBaYw7HyZ0P4FqkQ8Xb2vK';
const dataset = () => buildDataset({ now: NOW, passwordHash: HASH });

test('builds the approved identity and catalog counts', () => {
  const data = dataset();
  assert.equal(DEMO_PASSWORD, 'Demo@123456');
  assert.equal(data.users.length, 12);
  assert.equal(data.categories.length, 5);
  assert.equal(data.sub_categories.length, 25);
  assert.equal(data.locations.length, 28);
  assert.ok(data.products.length >= 24);
});

test('keeps every account in the approved Gmail persona family', () => {
  for (const user of dataset().users) {
    assert.match(
      user.email,
      /^(duong|minh|long|trung)([.+][a-z0-9]+)?@gmail\.com$/,
    );
    assert.equal(user.passwordHash, HASH);
  }
});

test('keeps every Minh persona without a phone', () => {
  const minhUsers = dataset().users.filter((user) =>
    user.email.startsWith('minh'),
  );
  assert.ok(minhUsers.length >= 2);
  for (const user of minhUsers) {
    assert.equal(Object.hasOwn(user, 'phone'), false);
    assert.equal(user.phoneVerified, false);
  }
});

test('includes locations with and without owners, products, and images', () => {
  const data = dataset();
  const productLocationIds = new Set(
    data.products.map((item) => String(item.locationId)),
  );
  assert.ok(data.locations.some((item) => item.ownerId));
  assert.ok(data.locations.some((item) => !item.ownerId));
  assert.ok(
    data.locations.some((item) => productLocationIds.has(String(item._id))),
  );
  assert.ok(
    data.locations.some((item) => !productLocationIds.has(String(item._id))),
  );
  assert.ok(data.locations.some((item) => item.imagesUrls.length === 0));
  assert.ok(data.locations.some((item) => item.imagesUrls.length >= 2));
});

function values(items, key) {
  return [...new Set(items.map((item) => item[key]))].sort();
}

test('covers every core workflow status', () => {
  const data = dataset();
  assert.deepEqual(values(data.locations, 'status'), [
    'DELETED',
    'HIDDEN',
    'PENDING_RE_APPROVAL',
    'PUBLISHED',
    'REJECTED',
    'SUBMITTED',
  ]);
  assert.deepEqual(values(data.location_requests, 'status'), [
    'APPROVED',
    'CANCELLED',
    'PENDING',
    'PENDING_RE_APPROVAL',
    'REJECTED',
  ]);
  assert.deepEqual(values(data.location_requests, 'type'), [
    'CREATE',
    'DELETE',
    'UPDATE',
  ]);
  assert.deepEqual(values(data.claim_requests, 'status'), [
    'APPROVED',
    'PENDING',
    'REJECTED',
    'RELEASED',
    'REVOKED',
  ]);
  assert.deepEqual(values(data.request_accesses, 'status'), [
    'AUTO_GRANTED',
    'ESCALATED',
    'EXPIRED',
    'GRANTED',
    'PENDING',
    'REJECTED',
  ]);
  assert.deepEqual(values(data.disputes, 'status'), [
    'OPEN',
    'RESOLVED_KEEP',
    'RESOLVED_REVOKE',
    'RESOLVED_TRANSFER',
  ]);
  assert.deepEqual(values(data.appeals, 'type'), [
    'LOCATION_REJECTED',
    'OWNERSHIP_REVOKED',
    'REQUEST_ACCESS_REJECTED',
    'USER_BANNED',
  ]);
  assert.deepEqual(values(data.appeals, 'status'), [
    'ACCEPTED_TO_DISPUTE',
    'OVERTURNED',
    'PENDING',
    'UPHELD',
  ]);
});

test('creates exactly one access scenario per supported status', () => {
  assert.equal(dataset().request_accesses.length, 6);
});

test('rejects the unsupported claim appeal type', () => {
  assert.equal(
    dataset().appeals.some((item) => item.type === 'CLAIM_REJECTED'),
    false,
  );
});

test('builds diverse supporting demo content', () => {
  const data = dataset();
  assert.equal(data.location_requests.length, 15);
  assert.equal(data.claim_requests.length, 6);
  assert.equal(data.disputes.length, 4);
  assert.equal(data.appeals.length, 4);
  assert.equal(data.reviews.length, 18);
  assert.equal(data.edit_suggestions.length, 6);
  assert.equal(data.reports.length, 8);
  assert.equal(data.bookmarks.length, 12);
  assert.ok(data.notifications.length >= 15);
  assert.ok(data.location_views.length >= 24);
  assert.deepEqual(values(data.reviews, 'rating'), [1, 2, 3, 4, 5]);
  assert.deepEqual(values(data.reviews, 'status'), [
    'DELETED',
    'PUBLISHED',
    'REMOVED_BY_ADMIN',
  ]);
  assert.deepEqual(values(data.reports, 'status'), [
    'APPEALED',
    'APPROVED',
    'DISMISSED',
    'PENDING',
    'REJECTED',
    'RESOLVED',
    'UNDER_REVIEW',
  ]);
});

test('validates the complete graph', () => {
  assert.doesNotThrow(() => validateDataset(dataset(), { now: NOW }));
});

test('rejects a dangling product location', () => {
  const data = dataset();
  data.products[0].locationId = 'ffffffffffffffffffffffff';
  assert.throws(
    () => validateDataset(data, { now: NOW }),
    /products.*locationId/i,
  );
});

test('rejects two pending claims for one location', () => {
  const data = dataset();
  const pending = data.claim_requests.find((item) => item.status === 'PENDING');
  data.claim_requests.push({
    ...pending,
    _id: 'eeeeeeeeeeeeeeeeeeeeeeee',
  });
  assert.throws(() => validateDataset(data, { now: NOW }), /pending claim/i);
});

test('rejects conflicting access ownership', () => {
  const data = dataset();
  const granted = data.request_accesses.find(
    (item) => item.status === 'GRANTED',
  );
  const location = data.locations.find(
    (item) => String(item._id) === String(granted.locationId),
  );
  location.ownerId = granted.currentOwnerId;
  assert.throws(() => validateDataset(data, { now: NOW }), /GRANTED.*owner/i);
});

test('accepts only the exact demo database', () => {
  assert.equal(assertDemoDatabase('mongodb://127.0.0.1:27017/demo'), 'demo');
  assert.equal(
    assertDemoDatabase(
      'mongodb+srv://user:pass@example.test/demo?retryWrites=true',
    ),
    'demo',
  );
});

test('rejects missing or non-demo database names', () => {
  for (const uri of [
    'mongodb://127.0.0.1:27017/',
    'mongodb://127.0.0.1:27017/wdp301',
    'mongodb://127.0.0.1:27017/demo-test',
  ]) {
    assert.throws(() => assertDemoDatabase(uri), /Refusing to reset/i);
  }
});
