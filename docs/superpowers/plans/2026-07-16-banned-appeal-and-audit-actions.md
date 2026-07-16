# Banned Appeal Access and Audit Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let banned users authenticate only for their own appeals and make the admin audit filter reflect every stored action automatically.

**Architecture:** JWTs may carry `scope: "appeal"`. The normal access strategy rejects that scope, while a dedicated appeal-access strategy accepts both normal and appeal-scoped tokens for user appeal routes and identity lookup. Audit-log responses include sorted distinct actions from MongoDB, and the web page renders those values without a static list.

**Tech Stack:** NestJS, Passport JWT, Mongoose, Jest, Expo Router, Next.js 16, React, TypeScript.

## Global Constraints

- Do not add source comments.
- Keep normal-user authentication and admin authorization unchanged.
- Appeal-scoped tokens must not work on unrelated authenticated endpoints.
- Preserve unrelated mobile changes already present in the worktree.
- Use failing regression tests before production changes.

---

### Task 1: Appeal-scoped authentication

**Files:**
- Create: `apps/api/src/common/guard/appeal-access.strategy.ts`
- Create: `apps/api/src/common/guard/appeal-access.strategy.spec.ts`
- Create: `apps/api/src/modules/auth/auth.service.spec.ts`
- Modify: `apps/api/src/types/jwt.types.ts`
- Modify: `apps/api/src/common/guard/at.strategy.ts`
- Modify: `apps/api/src/modules/auth/auth.service.ts`
- Modify: `apps/api/src/modules/auth/auth.module.ts`
- Modify: `apps/api/src/modules/auth/auth.controller.ts`
- Modify: `apps/api/src/modules/appeals/appeal.controller.ts`

**Interfaces:**
- Produces: `JwtPayLoad.scope?: "appeal"`.
- Produces: `AppealAccessStrategy` registered as `jwt-appeal-access`.
- Produces: login and refresh results with `appealOnly: boolean`.

- [ ] **Step 1: Write failing auth and strategy tests**

Cover banned login returning scoped tokens, banned refresh returning scoped tokens, active login returning unscoped tokens, normal strategy rejecting appeal scope, and appeal strategy accepting both token types.

- [ ] **Step 2: Run tests and verify the expected failures**

Run:

```bash
cd apps/api && node ../../node_modules/jest/bin/jest.js --runInBand src/modules/auth/auth.service.spec.ts src/common/guard/appeal-access.strategy.spec.ts
```

Expected: failures because `scope`, `appealOnly`, and `AppealAccessStrategy` do not exist.

- [ ] **Step 3: Implement scoped tokens and strategy isolation**

Use payloads shaped as:

```ts
type JwtPayLoad = {
  userId: string;
  scope?: 'appeal';
};
```

Generate appeal-scoped access and refresh tokens whenever the database user is banned. Return normal tokens for every other status. Make `AtStrategy.validate` reject `scope === "appeal"`. Make `AppealAccessStrategy.validate` return the user id for normal and appeal-scoped payloads. Apply `jwt-appeal-access` only to `auth/me` and the user-facing appeal controller.

- [ ] **Step 4: Run focused and neighboring API tests**

Run the Task 1 command plus the three appeal suites. Expected: all pass.

- [ ] **Step 5: Commit Task 1**

```bash
git add apps/api/src/common/guard apps/api/src/modules/auth apps/api/src/modules/appeals/appeal.controller.ts apps/api/src/types/jwt.types.ts
git commit -m "WDP-32: giới hạn phiên kháng cáo tài khoản bị cấm"
```

### Task 2: Banned-user mobile destination

**Files:**
- Create: `apps/mobile/src/navigation/authDestination.ts`
- Create: `apps/mobile/src/navigation/authDestination.spec.ts`
- Modify: `apps/mobile/src/service/authService.ts`
- Modify: `apps/mobile/src/components/auth/LoginForm.tsx`
- Modify: `apps/mobile/src/contexts/userContext.tsx`
- Modify: `apps/mobile/src/app/index.tsx`
- Modify: `apps/mobile/src/app/auth/login.tsx`

**Interfaces:**
- Consumes: auth response field `appealOnly` and user status `BANNED`.
- Produces: `getAuthenticatedDestination(user): "/appeals" | "/home"`.

- [ ] **Step 1: Write a failing navigation test**

Assert that a banned user maps to `/appeals`, while active and missing-status users map to `/home`.

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
cd apps/mobile && node ../../node_modules/jest/bin/jest.js --config jest.config.js --runInBand src/navigation/authDestination.spec.ts
```

Expected: failure because the destination helper does not exist.

- [ ] **Step 3: Implement and reuse the destination helper**

Use the helper after login, during restored-session user setup, on the root redirect, and on the login-page redirect. Preserve the current mobile component structure and formatting outside the touched expressions.

- [ ] **Step 4: Run navigation tests**

Run the new test and `src/navigation/mainTabs.spec.ts`. Expected: all pass.

- [ ] **Step 5: Commit Task 2**

```bash
git add apps/mobile/src/navigation/authDestination.ts apps/mobile/src/navigation/authDestination.spec.ts apps/mobile/src/service/authService.ts apps/mobile/src/components/auth/LoginForm.tsx apps/mobile/src/contexts/userContext.tsx apps/mobile/src/app/index.tsx apps/mobile/src/app/auth/login.tsx
git commit -m "WDP-32: mở lối kháng cáo cho tài khoản bị cấm"
```

### Task 3: Dynamic audit action options

**Files:**
- Create: `apps/api/src/modules/admin-dashboard/admin-dashboard.service.spec.ts`
- Modify: `apps/api/src/modules/admin-dashboard/admin-dashboard.service.ts`
- Modify: `apps/web/src/lib/admin-api.ts`
- Modify: `apps/web/src/app/admin/(protected)/audit-logs/page.tsx`

**Interfaces:**
- Produces: `PaginatedAuditLogs.actions: string[]`.
- Consumes: `actions` as the audit filter option source.

- [ ] **Step 1: Write a failing dashboard service test**

Mock `auditLogModel.distinct("action")` to return unsorted claim, dispute, and appeal actions. Assert that `listAuditLogs` returns those actions sorted while preserving pagination data.

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
cd apps/api && node ../../node_modules/jest/bin/jest.js --runInBand src/modules/admin-dashboard/admin-dashboard.service.spec.ts
```

Expected: failure because the response has no `actions` field.

- [ ] **Step 3: Return and render distinct actions**

Add `auditLogModel.distinct("action").exec()` to the existing parallel query, sort the result, include it in the response, add the field to `PaginatedAuditLogs`, and replace the hardcoded web constant with response state.

- [ ] **Step 4: Run the service test and web build**

Expected: service test passes and Next.js build exits zero.

- [ ] **Step 5: Commit Task 3**

```bash
git add apps/api/src/modules/admin-dashboard apps/web/src/lib/admin-api.ts 'apps/web/src/app/admin/(protected)/audit-logs/page.tsx'
git commit -m "WDP-32: đồng bộ bộ lọc audit theo dữ liệu"
```

### Task 4: End-to-end verification

**Files:**
- No production files.

**Interfaces:**
- Consumes all earlier task outputs.

- [ ] **Step 1: Run focused API and mobile tests**

Run every test command from Tasks 1 through 3. Expected: zero failures.

- [ ] **Step 2: Build API, web, and type-check mobile**

Run the API build, web build, and the mobile TypeScript check. Expected: zero errors attributable to this change.

- [ ] **Step 3: Verify live authorization boundaries**

Confirm banned login and refresh return appeal-scoped sessions, `/appeals/mine` and `/auth/me` return 200, and an unrelated protected endpoint returns 401.

- [ ] **Step 4: Verify Chrome UI**

Open `/admin/audit-logs`, confirm the dropdown includes current `APPEAL_*`, `CLAIM_*`, and `DISPUTE_*` values, exercise one filter, inspect console warnings/errors, and capture a screenshot outside the repo.

- [ ] **Step 5: Restore fixtures and report**

Remove disposable records, rerun `seed:test`, preserve unrelated worktree changes, and report exact verification evidence.
