import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const usersPage = readFileSync(
  new URL('../src/app/(protected)/users/page.tsx', import.meta.url),
  'utf8',
);
const appealsPage = readFileSync(
  new URL('../src/app/(protected)/appeals/page.tsx', import.meta.url),
  'utf8',
);

test('admin snackbars are anchored at the top of the viewport', () => {
  const bottomAnchors = [
    ...usersPage.matchAll(/anchorOrigin=\{\{\s*vertical:\s*'bottom'/g),
    ...appealsPage.matchAll(/anchorOrigin=\{\{\s*vertical:\s*'bottom'/g),
  ];
  const topAnchors = [
    ...usersPage.matchAll(/anchorOrigin=\{\{\s*vertical:\s*'top'/g),
    ...appealsPage.matchAll(/anchorOrigin=\{\{\s*vertical:\s*'top'/g),
  ];

  assert.equal(bottomAnchors.length, 0);
  assert.equal(topAnchors.length, 3);
});
