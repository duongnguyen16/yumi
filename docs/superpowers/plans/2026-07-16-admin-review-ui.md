# Admin Review UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin appeal and location-review workflows fully localized, visually scannable, touch-friendly, and safer to operate without changing backend contracts.

**Architecture:** Put display-only translations and decision metadata in one pure TypeScript module, then consume it from the two existing client pages and their drawers. Preserve the existing table + drawer interaction, quick table actions, queue/history contract, and API payload values.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Material UI 9, Node 22 test runner.

## Global Constraints

- Do not change API endpoints, request payloads, backend enums, or business rules.
- Keep `Chờ xử lý / Lịch sử`; history drawers remain read-only.
- Keep quick actions on the location-request table; final decisions still require drawer confirmation.
- Use Vietnamese for all visible types, statuses, field labels, decisions, helper text, and fallback copy.
- Preserve unrelated dirty-worktree changes.
- Read and follow `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` and `node_modules/next/dist/docs/01-app/02-guides/css-in-js.md`.

---

### Task 1: Localized review metadata

**Files:**
- Create: `apps/web/src/components/admin/admin-review-labels.ts`
- Create: `apps/web/test/admin-review-labels.test.mjs`

**Interfaces:**
- Produces: `AppealDecision`, `appealTypeLabel`, `appealStatusLabel`, `locationRequestTypeLabel`, `locationRequestStatusLabel`, `locationFieldLabel`, `appealDecisionOptions`, and `humanizeAdminValue`.
- Consumers: both admin pages and both detail drawers in Tasks 2 and 3.

- [ ] **Step 1: Write the failing metadata tests**

Create a Node test covering all eight appeal types, all four appeal statuses, both request types, all three request statuses, common location keys, unknown-value fallback, and valid decision sets:

```js
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

test('localizes known admin review enums', () => {
  assert.equal(appealTypeLabel('REQUEST_ACCESS_REJECTED'), 'Từ chối yêu cầu quyền truy cập');
  assert.equal(appealTypeLabel('USER_BANNED'), 'Khóa tài khoản');
  assert.equal(appealStatusLabel('OVERTURNED'), 'Đã đảo quyết định');
  assert.equal(locationRequestTypeLabel('CREATE'), 'Tạo địa điểm mới');
  assert.equal(locationRequestStatusLabel('REJECTED'), 'Đã từ chối');
  assert.equal(locationFieldLabel('categoryId'), 'Danh mục');
});

test('uses readable Vietnamese fallbacks', () => {
  assert.equal(humanizeAdminValue('SOME_NEW_VALUE'), 'Some new value');
  assert.equal(appealTypeLabel('SOME_NEW_VALUE'), 'Some new value');
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
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `rtk node --experimental-strip-types --test apps/web/test/admin-review-labels.test.mjs`

Expected: FAIL because `admin-review-labels.ts` does not exist.

- [ ] **Step 3: Implement the pure metadata module**

Define exact maps for:

```ts
export type AppealDecision = 'ACCEPTED_TO_DISPUTE' | 'OVERTURNED' | 'UPHELD';

export interface AppealDecisionOption {
  value: AppealDecision;
  label: string;
  description: string;
  tone: 'positive' | 'warning' | 'neutral';
}
```

Use `REQUEST_ACCESS_REJECTED` to return `ACCEPTED_TO_DISPUTE` and `UPHELD`; all other appeal types return `OVERTURNED` and `UPHELD`. Unknown uppercase values must become readable title-like text rather than leak raw underscore enums.

- [ ] **Step 4: Run the metadata tests and verify GREEN**

Run: `rtk node --experimental-strip-types --test apps/web/test/admin-review-labels.test.mjs`

Expected: 3 passing tests and 0 failures.

- [ ] **Step 5: Commit the metadata foundation**

Run: `rtk git add apps/web/src/components/admin/admin-review-labels.ts apps/web/test/admin-review-labels.test.mjs && rtk git commit -m "WDP-32: Việt hóa dữ liệu xét duyệt admin"`

### Task 2: Appeal table and drawer

**Files:**
- Modify: `apps/web/src/app/admin/(protected)/appeals/page.tsx`
- Modify: `apps/web/src/app/admin/(protected)/appeals/components/AppealDetailDrawer.tsx`

**Interfaces:**
- Consumes: metadata helpers and `AppealDecision` from Task 1.
- Preserves: `resolveAppeal(id, decision, reason)` payload and queue/history behavior.

- [ ] **Step 1: Add failing source assertions for visible enum removal and accessible decision controls**

Extend `apps/web/test/admin-review-labels.test.mjs` to read both appeal source files and assert that table/drawer rendering calls localized helpers, decision controls use `aria-pressed`, and raw values are not used as visible `label={value}` or `{item.type}` content.

- [ ] **Step 2: Run the test and verify RED**

Run: `rtk node --experimental-strip-types --test apps/web/test/admin-review-labels.test.mjs`

Expected: FAIL because the current page renders raw `item.type`, `item.status`, and small decision chips.

- [ ] **Step 3: Localize and clarify the appeal table**

Use localized type/status badges, a two-line argument preview, Vietnamese deadline context, and a labeled `Xem hồ sơ` action with a minimum 44 px hit area. Keep pagination and empty states unchanged.

- [ ] **Step 4: Replace decision chips with large decision cards**

Render each `AppealDecisionOption` as a full-width `ButtonBase` with at least 64 px height, icon, Vietnamese title, consequence description, selected border/check mark, and `aria-pressed`. Widen the drawer to 620 px, group source decision/argument/evidence in labeled sections, localize history outcome, and make the submit button label reflect the chosen decision.

- [ ] **Step 5: Run the source and metadata tests**

Run: `rtk node --experimental-strip-types --test apps/web/test/admin-review-labels.test.mjs`

Expected: all tests pass.

- [ ] **Step 6: Commit the appeal UI**

Run: `rtk git add 'apps/web/src/app/admin/(protected)/appeals/page.tsx' 'apps/web/src/app/admin/(protected)/appeals/components/AppealDetailDrawer.tsx' apps/web/test/admin-review-labels.test.mjs && rtk git commit -m "WDP-32: làm rõ giao diện kháng cáo"`

### Task 3: Location request table and drawer

**Files:**
- Modify: `apps/web/src/app/admin/(protected)/location-requests/page.tsx`
- Modify: `apps/web/src/app/admin/(protected)/location-requests/components/LocationRequestDetailDrawer.tsx`

**Interfaces:**
- Consumes: request type/status/field helpers from Task 1.
- Preserves: approve/reject payloads, quick table actions, and history read-only behavior.

- [ ] **Step 1: Add failing source assertions for localized request UI**

Extend the Node test to assert that both location source files call the shared localization helpers, icon buttons carry `aria-label`, visible `Optional` is absent, and proposed-data keys are passed through `locationFieldLabel`.

- [ ] **Step 2: Run the test and verify RED**

Run: `rtk node --experimental-strip-types --test apps/web/test/admin-review-labels.test.mjs`

Expected: FAIL because request status/raw keys are currently visible and `Optional` remains in a placeholder.

- [ ] **Step 3: Improve the request table while retaining quick actions**

Localize type/status badges, keep warning badges, and replace desktop icon-only actions with compact `Xem`, `Duyệt`, and `Từ chối` controls. On narrow screens, retain icon presentation with tooltip and `aria-label`. Preserve `openDetail(req, true)` for quick reject.

- [ ] **Step 4: Improve the request drawer**

Widen it to 620 px, turn duplicate/far-pin flags into visible alert panels, localize metadata/statuses, render proposal keys through `locationFieldLabel`, allow long values to wrap, and replace the mixed-language duplicate placeholder with Vietnamese copy. Add a clear reject-mode heading and character-count helper.

- [ ] **Step 5: Run the focused test**

Run: `rtk node --experimental-strip-types --test apps/web/test/admin-review-labels.test.mjs`

Expected: all tests pass.

- [ ] **Step 6: Commit the location review UI**

Run: `rtk git add 'apps/web/src/app/admin/(protected)/location-requests/page.tsx' 'apps/web/src/app/admin/(protected)/location-requests/components/LocationRequestDetailDrawer.tsx' apps/web/test/admin-review-labels.test.mjs && rtk git commit -m "WDP-19: làm rõ giao diện duyệt địa điểm"`

### Task 4: Static and rendered verification

**Files:**
- Verify only; repair Task 1-3 files if a check exposes a defect.

**Interfaces:**
- Verifies the complete accepted design against the real routes.

- [ ] **Step 1: Run static checks**

Run: `rtk npm run lint --workspace=web`

Expected: exit 0 with no new warnings in changed files.

Run: `rtk npm run build --workspace=web`

Expected: exit 0 and routes `/admin/appeals` and `/admin/location-requests` are generated.

Run: `rtk git diff --check`

Expected: no whitespace errors.

- [ ] **Step 2: Run the web app and browser QA**

Start the existing web development server, sign in with the seeded admin account if required, and verify both routes at desktop and mobile widths. Check queue/history, localized badges, quick table actions, decision-card selection, reject validation, read-only history, overflow, and console errors.

- [ ] **Step 3: Capture and inspect screenshots**

Capture the appeal drawer and location drawer at desktop width plus one mobile view. Inspect the latest images for clipping, raw enums, small targets, mixed-language strings, weak selected state, and table overflow. Repair any material mismatch and repeat the checks.

- [ ] **Step 4: Commit verification repairs if any**

Stage only files changed by this plan and commit them with a focused `WDP-19` or `WDP-32` subject. If verification required no repairs, do not create an empty commit.

## Plan self-review

- Spec coverage: localization, table quick actions, large appeal decisions, clearer location warnings/data, accessibility, history read-only, static checks, and browser QA each have an owning task.
- Placeholder scan: no incomplete implementation placeholders are present.
- Type consistency: the shared `AppealDecision` union matches the existing API payload exactly; metadata helpers accept backend strings without changing them.
