# Admin Request History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add paginated, read-only history tabs to the four admin decision queues while preserving current actionable queue behavior.

**Architecture:** Each existing list DTO accepts a validated `view` discriminator and each service owns the mapping from that view to valid statuses and sort order. The web client forwards `view`; the four pages share a tabs component and render decision controls only for queue records.

**Tech Stack:** NestJS, Mongoose, class-validator, Jest, Next.js, React, TypeScript, MUI.

## Global Constraints

- Missing `view` preserves current queue behavior.
- Queue records sort oldest first; history records sort newest first.
- History records are read-only in tables and drawers.
- Existing decision state machines and side effects do not change.
- Preserve unrelated workspace changes and add no source comments.

---

### Task 1: Backend list-view contract

**Files:**
- Create: `apps/api/src/common/dto/admin-list-view.dto.ts`
- Modify: `apps/api/src/modules/admin/dto/list-pending-requests.dto.ts`
- Modify: `apps/api/src/modules/admin-claims/dto/list-claims.dto.ts`
- Modify: `apps/api/src/modules/disputes/dto/list-disputes.dto.ts`
- Modify: `apps/api/src/modules/appeals/dto/list-appeals.dto.ts`
- Test: `apps/api/src/modules/admin/admin-location.service.spec.ts`
- Test: `apps/api/src/modules/admin-claims/admin-claim.service.spec.ts`
- Test: `apps/api/src/modules/disputes/dispute.service.spec.ts`
- Test: `apps/api/src/modules/appeals/appeal.service.spec.ts`

**Interfaces:**
- Produces: `AdminListView = 'queue' | 'history'` and `view` on all four list DTOs.
- Consumes: Existing request status enums.

- [ ] **Step 1: Write failing history tests**

Add one test to each service spec that calls the list method with history view and asserts the completed-status `$in` filter plus descending sort. Example:

```ts
await service.getQueue({
  view: AdminListView.HISTORY,
  page: 1,
  limit: 20,
});
expect(model.find).toHaveBeenCalledWith({
  status: {
    $in: [
      DisputeStatus.RESOLVED_KEEP,
      DisputeStatus.RESOLVED_TRANSFER,
      DisputeStatus.RESOLVED_REVOKE,
    ],
  },
});
expect(sort).toHaveBeenCalledWith({ updatedAt: -1, createdAt: -1 });
```

- [ ] **Step 2: Run focused specs and verify RED**

Run `npm test --workspace=api -- --runInBand src/modules/admin/admin-location.service.spec.ts src/modules/admin-claims/admin-claim.service.spec.ts src/modules/disputes/dispute.service.spec.ts src/modules/appeals/appeal.service.spec.ts`.

Expected: FAIL because `AdminListView` and history behavior do not exist.

- [ ] **Step 3: Add the validated discriminator**

Create:

```ts
export enum AdminListView {
  QUEUE = 'queue',
  HISTORY = 'history',
}
```

Each list DTO defines:

```ts
@IsOptional()
@IsEnum(AdminListView)
view: AdminListView = AdminListView.QUEUE;
```

- [ ] **Step 4: Implement service filters and sort**

Each service selects its status set and sort:

```ts
const isHistory = query.view === AdminListView.HISTORY;
const filter = {
  status: { $in: isHistory ? HISTORY_STATUSES : QUEUE_STATUSES },
};
const sort = isHistory
  ? { updatedAt: -1, createdAt: -1 }
  : { createdAt: 1 };
```

Location queue retains suspected-duplicate priority. Claim queue retains OTP priority.

- [ ] **Step 5: Re-run focused specs and verify GREEN**

Run the Step 2 command. Expected: all four suites pass.

### Task 2: Web API client and shared UI

**Files:**
- Modify: `apps/web/src/lib/admin-api.ts`
- Create: `apps/web/src/components/admin/AdminRequestTabs.tsx`
- Modify: four admin detail drawers under the location-requests, claims, disputes, and appeals routes.

**Interfaces:**
- Produces: `AdminRequestView`, list functions accepting `(page, limit, view)`, `AdminRequestTabs`, and drawer `readOnly` props.
- Consumes: Backend `view`, `page`, and `limit` query values.

- [ ] **Step 1: Forward list parameters**

Define `export type AdminRequestView = 'queue' | 'history'` and update all four list functions. Example:

```ts
export async function getDisputeQueue(
  page = 1,
  limit = 20,
  view: AdminRequestView = 'queue',
): Promise<DisputeQueueResponse> {
  const res = await api.get<DisputeQueueResponse>('/admin/disputes', {
    params: { page, limit, view },
  });
  return res.data;
}
```

- [ ] **Step 2: Create the shared tabs component**

Use MUI `Tabs` and `Tab` with `queue`/`history`, Vietnamese labels, square corners, and the existing orange accent.

- [ ] **Step 3: Add read-only drawer rendering**

Each drawer accepts `readOnly?: boolean`. A read-only drawer has only a close button and hides decision chips, reason fields, rejection forms, and evidence-request forms. It renders stored status and admin-decision metadata when available.

- [ ] **Step 4: Run the web build**

Run `npm run build --workspace=web`. Expected: only page call-site errors remain, or PASS.

### Task 3: Wire all four pages

**Files:**
- Modify: `apps/web/src/app/admin/(protected)/location-requests/page.tsx`
- Modify: `apps/web/src/app/admin/(protected)/claims/page.tsx`
- Modify: `apps/web/src/app/admin/(protected)/disputes/page.tsx`
- Modify: `apps/web/src/app/admin/(protected)/appeals/page.tsx`

**Interfaces:**
- Consumes: `AdminRequestTabs`, paginated client functions, drawer `readOnly`.
- Produces: Reachable queue/history views with pagination.

- [ ] **Step 1: Add view, page, and total state**

Each page uses:

```ts
const [view, setView] = useState<AdminRequestView>('queue');
const [page, setPage] = useState(1);
const [total, setTotal] = useState(0);
```

The memoized load callback accepts page and view, forwards both, and updates response metadata. Switching views closes the drawer, resets page to 1, and loads the selected view.

- [ ] **Step 2: Render contextual copy and pagination**

Place shared tabs below `Topbar`. Queue subtitles say records are waiting; history subtitles say records are stored. Render MUI `TablePagination` using backend totals.

- [ ] **Step 3: Make history rows read-only**

History tables add a status column and render only the detail icon. Queue tables retain decision icons. Pass `readOnly={view === 'history'}` to each drawer.

- [ ] **Step 4: Run web build**

Run `npm run build --workspace=web`. Expected: PASS.

### Task 4: Full verification

**Files:**
- Verify all files modified above.

- [ ] **Step 1: Run focused API tests**

Run the Task 1 command. Expected: zero failed tests.

- [ ] **Step 2: Build both workspaces**

Run `npm run build --workspace=api` and `npm run build --workspace=web`. Expected: both exit 0.

- [ ] **Step 3: Check formatting and scope**

Run `git diff --check`, `git status --short`, and `git diff --stat`. Expected: no whitespace errors and unrelated mobile/design changes remain untouched.
