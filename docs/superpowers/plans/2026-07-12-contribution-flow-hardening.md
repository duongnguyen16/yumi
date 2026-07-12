# Contribution Flow Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the six audited contribution-flow defects while preserving valid customer and vendor submissions.

**Architecture:** The backend becomes the enforcement point for distance, duplicate metadata, and multipart DTO validation. The mobile client keeps presentation responsibilities: it propagates failed vendor responses and exposes duplicate-analysis errors rather than continuing silently.

**Tech Stack:** Expo Router/React Native, Axios/FormData, NestJS, class-validator, Mongoose, Jest.

## Global Constraints

- Preserve the existing 50-metre acceptance rule.
- Never trust duplicate or distance data supplied by the mobile client.
- Do not stage unrelated existing working-tree changes.
- Write and run a failing regression test before each production-code change.

---

### Task 1: Customer contribution integrity

**Files:**
- Create: `apps/api/src/modules/location-contributions/location-contributions.service.spec.ts`
- Modify: `apps/api/src/modules/location-contributions/dto/submit-location-request.dto.ts`
- Modify: `apps/api/src/modules/location-contributions/location-contributions.service.ts`

**Interfaces:**
- Consumes: `SubmitLocationRequestDto.openingHours?: string`.
- Produces: rejected `BadRequestException` for a distance greater than 50 metres; stored `Location.openingHours` and `LocationRequest.newData.openingHours`.

- [ ] **Step 1: Write failing tests**

Create a service fixture with mocked Mongoose models and a real `LocationGeoService`. Add one test where pin and device positions are over 50m apart and expect `submitContribution` to reject with `BadRequestException`. Add a valid submission test with `openingHours: '07:00-21:00'` and assert the first `locationModel.create` payload and `locationRequestModel.create` payload preserve that value.

- [ ] **Step 2: Run the tests to verify red**

Run: `npm test --workspace=apps/api -- location-contributions.service.spec.ts --runInBand`

Expected: the distant-location test resolves instead of rejecting, and the opening-hours persistence assertions fail.

- [ ] **Step 3: Implement the minimum server changes**

Add an optional `@IsString()` `openingHours` property to `SubmitLocationRequestDto`. After `validateContributionPosition`, throw `BadRequestException('Bạn phải đứng trong phạm vi 50m mới được tạo địa điểm')` when `withinRange` is false. Copy `dto.openingHours` to the location creation object and customer request `newData`.

- [ ] **Step 4: Run the focused tests to verify green**

Run: `npm test --workspace=apps/api -- location-contributions.service.spec.ts --runInBand`

Expected: all cases pass.

### Task 2: Vendor registration validation and trusted metadata

**Files:**
- Create: `apps/api/src/modules/vendor-locations/vendor-locations.controller.spec.ts`
- Create: `apps/api/src/modules/vendor-locations/vendor-locations.service.spec.ts`
- Modify: `apps/api/src/modules/vendor-locations/dto/vendor-register-location.dto.ts`
- Modify: `apps/api/src/modules/vendor-locations/vendor-locations.controller.ts`
- Modify: `apps/api/src/modules/vendor-locations/vendor-locations.service.ts`
- Modify: `apps/api/src/modules/vendor-locations/vendor-locations.module.ts`

**Interfaces:**
- Consumes: multipart `request` and `locationData` JSON strings.
- Produces: HTTP 400 for malformed/invalid DTOs and out-of-range pins; request duplicate fields calculated by `DuplicateDetectionService`.

- [ ] **Step 1: Write failing tests**

In the controller spec, pass a request with an invalid `locationData` shape and expect `BadRequestException`, and configure the mocked service to return `{ success: false, statusCode: 400 }` and assert that error remains 400. In the service spec, configure duplicate detection to return one location and geo distance to 51m; assert the service rejects before media upload. Add a valid-distance case and assert the `LocationRequest.create` payload uses duplicate IDs returned by the detector instead of caller-provided IDs.

- [ ] **Step 2: Run the tests to verify red**

Run: `npm test --workspace=apps/api -- vendor-locations.controller.spec.ts vendor-locations.service.spec.ts --runInBand`

Expected: validation is skipped, exceptions are rewrapped as 500, and caller-supplied duplicate values are persisted.

- [ ] **Step 3: Implement the minimum server changes**

Change `CreateLocationDto.openingHours` to `@IsString()`. In `registerLocation`, call `validate` for both instances with `{ whitelist: true, forbidNonWhitelisted: true }`, throw `BadRequestException(errors)` when either set is non-empty, and rethrow any `HttpException` in the controller catch. Register and inject `DuplicateDetectionService` through `VendorLocationsModule`, reject `deviceDistanceMeters > 50` before uploads, and persist duplicate fields computed from its result. Preserve unexpected-error handling only after expected Nest HTTP errors are rethrown.

- [ ] **Step 4: Run focused tests to verify green**

Run: `npm test --workspace=apps/api -- vendor-locations.controller.spec.ts vendor-locations.service.spec.ts --runInBand`

Expected: all cases pass.

### Task 3: Mobile error propagation and duplicate-analysis feedback

**Files:**
- Create: `apps/mobile/jest.config.js`
- Create: `apps/mobile/src/service/contributePlaceService.spec.ts`
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/src/service/contributePlaceService.ts`
- Modify: `apps/mobile/src/app/contribute/index.tsx`

**Interfaces:**
- Consumes: API response `{ success: false, message?: string }` from `/location/register`.
- Produces: a rejected promise on an unsuccessful vendor response; a visible alert and no step advance when duplicate analysis fails.

- [ ] **Step 1: Add a failing mobile regression test**

Add `jest`, `ts-jest`, and `@types/jest` at the versions already used by `apps/api`; add `test: "jest --config jest.config.js"` to the mobile scripts; configure ts-jest with `rootDir: '.'`, `testEnvironment: 'node'`, and an `@/` alias mapping to `src/`. In `contributePlaceService.spec.ts`, mock `./aixos`, make `api.post('/location/register')` resolve `{ data: { success: false, message: 'Rejected' } }`, and assert `submitVendorRegistration(validPayload)` rejects with `Rejected`.

- [ ] **Step 2: Verify the current failure**

Run: `npm test --workspace=apps/mobile -- contributePlaceService.spec.ts --runInBand`.

Expected: the test fails because `submitVendorRegistration` resolves a normal `{ success: false }` result. Also run `npx tsc --noEmit -p apps/mobile/tsconfig.json` and record the current unrelated failures in `profile.tsx` and `authService.ts`.

- [ ] **Step 3: Implement the minimum mobile changes**

Remove the catch-and-normal-result conversion in `submitVendorRegistration`; if a successful HTTP response has `success === false`, throw `Error(message)`. Make `submitVendorRegistrationDataToBackend` return only after success, so `handleContinue` reaches its success alert only on fulfilled success. In the draft-analysis catch, clear stale matches, show `Alert.alert('Không thể kiểm tra trùng lặp', getErrorMessage(...))`, and do not advance the step when the location-step analysis fails.

- [ ] **Step 4: Verify behavior and type safety**

Run: `npm test --workspace=apps/mobile -- contributePlaceService.spec.ts --runInBand` and `npx tsc --noEmit -p apps/mobile/tsconfig.json`. Expected: the service test passes; the contributing files add no type errors; report the known unrelated typecheck failures if still present.

### Task 4: Whole-flow verification

**Files:**
- Modify: only files changed by Tasks 1–3 if verification exposes a regression.

- [ ] **Step 1: Run all API tests**

Run: `npm test --workspace=apps/api -- --runInBand`

Expected: all API tests pass.

- [ ] **Step 2: Build the backend**

Run: `npm run build --workspace=apps/api`

Expected: exit code 0.

- [ ] **Step 3: Inspect the scoped diff**

Run: `git diff --check` and `git diff -- apps/mobile/src/app/contribute/index.tsx apps/mobile/src/service/contributePlaceService.ts apps/api/src/modules/location-contributions apps/api/src/modules/vendor-locations`.

Expected: no whitespace errors and only planned changes.

- [ ] **Step 4: Commit only scoped files**

Run: `git add` with the exact changed implementation/test files, then `git commit -m "fix: harden contribution submission flow"`.
