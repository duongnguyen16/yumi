# Unify Admin Location Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the WDP-19 admin location-request implementation as the only API flow and remove the unused legacy implementation without breaking web or mobile.

**Architecture:** `AdminModule` remains the single owner of location-request review through `/api/admin/location-requests`. The legacy `LocationAdminModule` and `/api/location/admin/requests` route are removed because no web or mobile consumer uses them.

**Tech Stack:** NestJS 11, Jest 30, Next.js web, Expo mobile, npm workspaces

## Global Constraints

- Keep code concise and business responsibilities clear.
- Add no source comments and preserve existing hand-written comments.
- Preserve unrelated working-tree changes.
- Do not commit or push documentation.

---

### Task 1: Enforce the canonical API module

**Files:**
- Modify: `apps/api/src/app.module.spec.ts`
- Modify: `apps/api/src/app.module.ts`
- Delete: `apps/api/src/modules/location-admin/dto/review-location-request.dto.ts`
- Delete: `apps/api/src/modules/location-admin/location-admin.controller.ts`
- Delete: `apps/api/src/modules/location-admin/location-admin.module.ts`
- Delete: `apps/api/src/modules/location-admin/location-admin.service.ts`

**Interfaces:**
- Consumes: Nest module metadata from `AppModule`
- Produces: `AdminModule` as the only registered location-review module

- [ ] **Step 1: Write the failing test**

Add this expectation to the existing `AppModule` route-registration test:

```ts
expect(imports.map((item: { name?: string }) => item?.name)).not.toContain(
  'LocationAdminModule',
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=api -- --runInBand app.module.spec.ts`

Expected: FAIL because `LocationAdminModule` is still registered.

- [ ] **Step 3: Remove the legacy implementation**

Remove the `LocationAdminModule` import and module entry from `app.module.ts`, then delete the four legacy files listed above. Keep `AdminModule` unchanged.

- [ ] **Step 4: Run focused API tests**

Run: `npm test --workspace=api -- --runInBand app.module.spec.ts modules/admin/admin-location.service.spec.ts`

Expected: both suites PASS.

### Task 2: Verify API, web, and mobile fit

**Files:**
- Verify: `apps/web/src/lib/admin-api.ts`
- Verify: `apps/web/src/app/admin/(protected)/location-requests/page.tsx`
- Verify: `apps/mobile/src`

**Interfaces:**
- Consumes: `/api/admin/location-requests/queue`, `/approve`, and `/reject`
- Produces: build and type-check evidence that active consumers remain compatible

- [ ] **Step 1: Confirm route consumers**

Run:

```bash
rg -n "location/admin/requests|admin/location-requests" apps
```

Expected: no legacy route matches; canonical matches remain in API and web; mobile has no admin-review route consumer.

- [ ] **Step 2: Build the API**

Run: `npm run build --workspace=api`

Expected: PASS.

- [ ] **Step 3: Build the web**

Run: `npm run build --workspace=web`

Expected: PASS.

- [ ] **Step 4: Check the mobile app**

Run the mobile workspace's non-mutating TypeScript verification command from its package scripts.

Expected: PASS.

- [ ] **Step 5: Check the final diff**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only scoped files plus pre-existing user changes are present.
