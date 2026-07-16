import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appealDecisionOptions,
  appealStatusLabel,
  appealTypeLabel,
  humanizeAdminValue,
  locationFieldLabel,
  locationRequestStatusLabel,
  locationRequestTypeLabel,
} from '../src/components/admin/admin-review-labels.ts';

const appealTypes = [
  ['REQUEST_ACCESS_REJECTED', 'Từ chối yêu cầu quyền truy cập'],
  ['LOCATION_REJECTED', 'Từ chối địa điểm'],
  ['CLAIM_REJECTED', 'Từ chối yêu cầu sở hữu'],
  ['DUPLICATE_HIDDEN', 'Ẩn địa điểm trùng lặp'],
  ['OWNERSHIP_REVOKED', 'Thu hồi quyền sở hữu'],
  ['REVIEW_REMOVED', 'Gỡ đánh giá'],
  ['USER_BANNED', 'Khóa tài khoản'],
  ['USER_WARNED', 'Cảnh cáo tài khoản'],
];

test('localizes known admin review enums and fields', () => {
  for (const [value, label] of appealTypes) {
    assert.equal(appealTypeLabel(value), label);
  }

  assert.equal(appealStatusLabel('PENDING'), 'Chờ xử lý');
  assert.equal(appealStatusLabel('ACCEPTED_TO_DISPUTE'), 'Đã chuyển sang tranh chấp');
  assert.equal(appealStatusLabel('OVERTURNED'), 'Đã đảo quyết định');
  assert.equal(appealStatusLabel('UPHELD'), 'Giữ nguyên quyết định');
  assert.equal(locationRequestTypeLabel('CREATE'), 'Tạo địa điểm mới');
  assert.equal(locationRequestTypeLabel('UPDATE'), 'Cập nhật địa điểm');
  assert.equal(locationRequestTypeLabel('DELETE'), 'Xóa địa điểm');
  assert.equal(locationRequestStatusLabel('PENDING'), 'Chờ xử lý');
  assert.equal(locationRequestStatusLabel('APPROVED'), 'Đã duyệt');
  assert.equal(locationRequestStatusLabel('REJECTED'), 'Đã từ chối');
  assert.equal(locationRequestStatusLabel('CANCELLED'), 'Đã hủy');
  assert.equal(locationRequestStatusLabel('PENDING_RE_APPROVAL'), 'Chờ duyệt lại');
  assert.equal(locationFieldLabel('name'), 'Tên địa điểm');
  assert.equal(locationFieldLabel('address'), 'Địa chỉ');
  assert.equal(locationFieldLabel('categoryId'), 'Danh mục');
  assert.equal(locationFieldLabel('location'), 'Tọa độ');
  assert.equal(locationFieldLabel('phone'), 'Số điện thoại');
  assert.equal(locationFieldLabel('website'), 'Trang web');
  assert.equal(locationFieldLabel('description'), 'Mô tả');
});

test('uses readable fallbacks instead of leaking uppercase enum values', () => {
  assert.equal(humanizeAdminValue('SOME_NEW_VALUE'), 'Some new value');
  assert.equal(appealTypeLabel('SOME_NEW_VALUE'), 'Some new value');
  assert.equal(locationFieldLabel('wheelchairAccess'), 'Wheelchair access');
});

test('returns only decisions allowed by the appeal type', () => {
  assert.deepEqual(
    appealDecisionOptions('REQUEST_ACCESS_REJECTED').map(({ value }) => value),
    ['ACCEPTED_TO_DISPUTE', 'UPHELD'],
  );
  assert.deepEqual(
    appealDecisionOptions('LOCATION_REJECTED').map(({ value }) => value),
    ['OVERTURNED', 'UPHELD'],
  );

  for (const option of appealDecisionOptions('LOCATION_REJECTED')) {
    assert.ok(option.label.length > 0);
    assert.ok(option.description.length > 0);
  }
});
