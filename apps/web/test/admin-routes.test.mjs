import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const adminPages = [
  'appeals',
  'audit-logs',
  'categories',
  'claims',
  'dashboard',
  'disputes',
  'edit-suggestions',
  'location-requests',
  'reports',
  'users',
];

test('root routes into the admin default page', async () => {
  const source = await readFile(
    new URL('../src/app/page.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /redirect\('\/dashboard'\)/);
});

test('admin screens and login use flat routes', async () => {
  await Promise.all([
    access(new URL('../src/app/login/page.tsx', import.meta.url)),
    ...adminPages.map((page) =>
      access(new URL(`../src/app/(protected)/${page}/page.tsx`, import.meta.url)),
    ),
  ]);
});

test('client navigation does not retain the admin path prefix', async () => {
  const [sidebar, login, protectedLayout] = await Promise.all([
    readFile(new URL('../src/components/admin/Sidebar.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/login/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/(protected)/layout.tsx', import.meta.url), 'utf8'),
  ]);

  assert.doesNotMatch(sidebar, /href: '\/admin\//);
  assert.doesNotMatch(login, /router\.push\("\/admin\//);
  assert.doesNotMatch(protectedLayout, /router\.replace\('\/admin\//);
});

test('admin UI uses the standard sans-serif font', async () => {
  const [tokens, layout] = await Promise.all([
    readFile(new URL('../src/theme/admin-tokens.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/app/layout.tsx', import.meta.url), 'utf8'),
  ]);

  assert.doesNotMatch(tokens, /JetBrains Mono|ui-monospace|monospace/);
  assert.doesNotMatch(layout, /JetBrains_Mono|font-mono/);
});
