import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  editSuggestionFieldLabel,
  editSuggestionOutcomeLabel,
  editSuggestionValue,
} from '../src/components/admin/edit-suggestion-labels.ts';

test('localizes edit suggestion fields', () => {
  assert.equal(editSuggestionFieldLabel('name'), 'Tên địa điểm');
  assert.equal(editSuggestionFieldLabel('address'), 'Địa chỉ');
  assert.equal(editSuggestionFieldLabel('openingHours'), 'Giờ mở cửa');
  assert.equal(editSuggestionFieldLabel('phone'), 'Số điện thoại');
  assert.equal(editSuggestionFieldLabel('geo'), 'Tọa độ');
  assert.equal(editSuggestionFieldLabel('flag'), 'Cờ trạng thái');
  assert.equal(editSuggestionFieldLabel('newField'), 'New field');
});

test('formats edit suggestion values safely', () => {
  assert.equal(editSuggestionValue(null), '—');
  assert.equal(editSuggestionValue({ value: '09:00-18:00' }), '09:00-18:00');
  assert.equal(editSuggestionValue({ latitude: 21, longitude: 105 }), '21, 105');
  assert.equal(
    editSuggestionValue({ type: 'Point', coordinates: [105, 21] }),
    '21, 105',
  );
});

test('localizes edit suggestion flags and outcomes', () => {
  assert.equal(editSuggestionValue({ value: 'DUPLICATE' }), 'Địa điểm trùng lặp');
  assert.equal(
    editSuggestionValue({ value: 'PERMANENTLY_CLOSED' }),
    'Đã đóng cửa vĩnh viễn',
  );
  assert.equal(editSuggestionValue({ value: 'NON_EXISTENT' }), 'Địa điểm không tồn tại');
  assert.equal(
    editSuggestionOutcomeLabel('PENDING_RE_APPROVAL'),
    'Chuyển sang duyệt lại',
  );
});

test('exposes the Admin edit suggestion API contract', async () => {
  const source = await readFile(
    new URL('../src/lib/admin-api.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /export async function getAdminEditSuggestions/);
  assert.match(source, /"\/edit-suggestions\/admin\/queue"/);
  assert.match(source, /`\/edit-suggestions\/\$\{id\}\/apply`/);
  assert.match(source, /`\/edit-suggestions\/\$\{id\}\/discard`/);
});

test('wires the Admin edit suggestion queue and review drawer', async () => {
  const [page, drawer, sidebar] = await Promise.all([
    readFile(
      new URL(
        '../src/app/admin/(protected)/edit-suggestions/page.tsx',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../src/app/admin/(protected)/edit-suggestions/components/EditSuggestionDetailDrawer.tsx',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL('../src/components/admin/Sidebar.tsx', import.meta.url),
      'utf8',
    ),
  ]);

  assert.match(page, /getAdminEditSuggestions/);
  assert.match(page, /EditSuggestionDetailDrawer/);
  assert.match(page, /editSuggestionFieldLabel\(item\.fieldName\)/);
  assert.match(drawer, /editSuggestionValue\(suggestion\?\.oldValue\)/);
  assert.match(drawer, /editSuggestionValue\(suggestion\?\.newValue\)/);
  assert.match(sidebar, /\/admin\/edit-suggestions/);
  assert.match(sidebar, /Duyệt chỉnh sửa/);
});
