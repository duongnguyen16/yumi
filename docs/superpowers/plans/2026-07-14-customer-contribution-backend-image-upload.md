# Customer Contribution Backend Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send customer contribution images to the NestJS API in the contribution submit request and let the backend upload and persist them.

**Architecture:** The Expo client sends one multipart request containing a JSON `data` field and one to five `imageFiles`. The NestJS controller parses and validates the JSON, while `LocationContributionsService` uploads the files through `ImagesService` after business validation and persists only backend-produced public URLs.

**Tech Stack:** Expo 56, React Native 0.85, Axios, NestJS 11, Multer, class-validator, Mongoose, Supabase Storage, Jest.

## Global Constraints

- Change only `POST /location/contribution/submit`; preserve vendor registration behavior.
- Accept exactly one to five customer contribution images.
- Keep the endpoint authenticated with `AuthGuard('jwt-at')`.
- Do not accept client-supplied `imageUrls` in `SubmitLocationRequestDto`.
- Preserve existing contribution validation, duplicate detection, persistence, notification, and response shape.
- Do not modify the user's unrelated changes in review files or `apps/mobile/.env`.

---

### Task 1: Persist Backend-Uploaded Contribution Images

**Files:**
- Create: `apps/api/src/modules/location-contributions/location-contributions.service.spec.ts`
- Modify: `apps/api/src/modules/location-contributions/location-contributions.service.ts`
- Modify: `apps/api/src/modules/location-contributions/location-contributions.module.ts`
- Modify: `apps/api/src/modules/location-contributions/dto/submit-location-request.dto.ts`

**Interfaces:**
- Consumes: `ImagesService.uploadMultiMedia(path: string, files: Express.Multer.File[]): Promise<Array<{ url: string; path: string }>>`
- Produces: `LocationContributionsService.submitContribution(userId: string, dto: SubmitLocationRequestDto, imageFiles: Express.Multer.File[])`

- [ ] **Step 1: Write failing service tests**

Create a Jest fixture with valid object IDs and mocked Mongoose models. Add one test that resolves `uploadMultiMedia` to two URLs and asserts both `locationModel.create` and `locationRequestModel.create` receive those URLs. Add another test that rejects the upload and asserts neither location nor request persistence runs.

```ts
await service.submitContribution(userId, validDto, imageFiles);

expect(imagesService.uploadMultiMedia).toHaveBeenCalledWith(
  "customer-contribution",
  imageFiles,
);
expect(locationModel.create).toHaveBeenCalledWith(
  expect.objectContaining({
    imagesUrls: [
      expect.objectContaining({ url: "https://storage/one.jpg", isCover: true }),
      expect.objectContaining({ url: "https://storage/two.jpg", isCover: false }),
    ],
  }),
);
expect(locationRequestModel.create).toHaveBeenCalledWith(
  expect.objectContaining({
    imageUrls: ["https://storage/one.jpg", "https://storage/two.jpg"],
    newData: expect.objectContaining({
      imageUrls: ["https://storage/one.jpg", "https://storage/two.jpg"],
    }),
  }),
);
```

- [ ] **Step 2: Verify the service test fails for the missing upload dependency/signature**

Run: `npm test --workspace=api -- --runInBand src/modules/location-contributions/location-contributions.service.spec.ts`

Expected: FAIL because the service does not accept files, does not inject `ImagesService`, and still reads `dto.imageUrls`.

- [ ] **Step 3: Implement backend upload persistence**

Inject `ImagesService`, accept `imageFiles`, and upload after all current business checks but before creating database records.

```ts
const uploadedImages = await this.imagesService.uploadMultiMedia(
  "customer-contribution",
  imageFiles,
);
const imageUrls = uploadedImages.map(({ url }) => url);
```

Replace all three uses of `dto.imageUrls` with `imageUrls`. Import `ImagesModule` in `LocationContributionsModule`. Remove the `imageUrls` property and its array/URL validator imports from `SubmitLocationRequestDto`.

- [ ] **Step 4: Run the focused service tests**

Run: `npm test --workspace=api -- --runInBand src/modules/location-contributions/location-contributions.service.spec.ts`

Expected: PASS with two tests.

- [ ] **Step 5: Commit the service change**

```powershell
git add -- apps/api/src/modules/location-contributions/location-contributions.service.spec.ts apps/api/src/modules/location-contributions/location-contributions.service.ts apps/api/src/modules/location-contributions/location-contributions.module.ts apps/api/src/modules/location-contributions/dto/submit-location-request.dto.ts
git commit -m "feat(api): upload contribution images on backend"
```

### Task 2: Accept and Validate the Multipart Contribution Request

**Files:**
- Create: `apps/api/src/modules/location-contributions/location-contributions.controller.spec.ts`
- Modify: `apps/api/src/modules/location-contributions/location-contributions.controller.ts`

**Interfaces:**
- Consumes: `LocationContributionsService.submitContribution(userId, dto, imageFiles)` from Task 1.
- Produces: authenticated `POST /location/contribution/submit` accepting `data: string` and `imageFiles: Express.Multer.File[]`.

- [ ] **Step 1: Write failing controller tests**

Instantiate the controller with a mocked service. Test a valid JSON string and one file, malformed JSON, and an empty file list.

```ts
await controller.submitContribution(
  JSON.stringify(validData),
  imageFiles,
  request,
);
expect(service.submitContribution).toHaveBeenCalledWith(
  request.user.userId,
  expect.objectContaining(validData),
  imageFiles,
);

await expect(
  controller.submitContribution("{", imageFiles, request),
).rejects.toBeInstanceOf(BadRequestException);

await expect(
  controller.submitContribution(JSON.stringify(validData), [], request),
).rejects.toBeInstanceOf(BadRequestException);
```

- [ ] **Step 2: Verify the controller tests fail against the JSON-only endpoint**

Run: `npm test --workspace=api -- --runInBand src/modules/location-contributions/location-contributions.controller.spec.ts`

Expected: FAIL because the controller accepts a body DTO and no uploaded files.

- [ ] **Step 3: Implement multipart parsing and DTO validation**

Add `FilesInterceptor("imageFiles", 5)`. Parse `@Body("data")`, reject malformed JSON or an empty file list, transform with `plainToInstance`, and validate with:

```ts
const errors = await validate(dto, {
  whitelist: true,
  forbidNonWhitelisted: true,
});
if (errors.length > 0) {
  throw new BadRequestException(errors);
}
return this.locationContributionsService.submitContribution(
  req.user.userId,
  dto,
  imageFiles,
);
```

- [ ] **Step 4: Run controller and service tests together**

Run: `npm test --workspace=api -- --runInBand src/modules/location-contributions/location-contributions.controller.spec.ts src/modules/location-contributions/location-contributions.service.spec.ts`

Expected: PASS with all focused tests.

- [ ] **Step 5: Commit the controller contract**

```powershell
git add -- apps/api/src/modules/location-contributions/location-contributions.controller.spec.ts apps/api/src/modules/location-contributions/location-contributions.controller.ts
git commit -m "feat(api): accept multipart contributions"
```

### Task 3: Send Customer Contribution Files from the Mobile Service

**Files:**
- Create: `apps/mobile/src/service/contributePlaceService.spec.ts`
- Modify: `apps/mobile/src/service/contributePlaceService.ts`
- Modify: `apps/mobile/package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: backend fields `data` and `imageFiles` from Task 2.
- Produces: `submitCustomerContribution(payload: CustomerContributionPayload, imageFiles: PendingContributionImage[])`.

- [ ] **Step 1: Write a failing mobile service test**

Mock the Axios client and replace `global.FormData` with a recording test implementation. Call `submitCustomerContribution` with one image, then assert the request path, serialized payload, file field, and multipart header.

```ts
expect(api.post).toHaveBeenCalledWith(
  "/location/contribution/submit",
  expect.any(RecordingFormData),
  { headers: { "Content-Type": "multipart/form-data" } },
);
expect(form.entries).toEqual([
  ["data", JSON.stringify(payload)],
  ["imageFiles", { uri: "file:///place.jpg", name: "place.jpg", type: "image/jpeg" }],
]);
```

- [ ] **Step 2: Verify the mobile test fails against the JSON submission**

Run: `npm test --workspace=mobile -- --runInBand src/service/contributePlaceService.spec.ts`

Expected: FAIL because the service posts JSON and accepts no image-file argument.

- [ ] **Step 3: Implement multipart submission and remove direct Supabase upload code**

Use the existing `appendEvidenceFile` helper for `imageFiles`. Remove `createClient`, `SupabaseClient`, `getSupabaseClient`, `fileUriToArrayBuffer`, and `uploadContributionImage`. Remove `imageUrls` from `CustomerContributionPayload`, add the image-file argument, and post `FormData` with the multipart header.

Because no other mobile source imports `@supabase/supabase-js`, run:

`npm uninstall @supabase/supabase-js --workspace=mobile`

- [ ] **Step 4: Run the focused mobile test**

Run: `npm test --workspace=mobile -- --runInBand src/service/contributePlaceService.spec.ts`

Expected: PASS with the multipart request assertion.

- [ ] **Step 5: Commit the mobile service change**

```powershell
git add -- apps/mobile/src/service/contributePlaceService.spec.ts apps/mobile/src/service/contributePlaceService.ts apps/mobile/package.json package-lock.json
git commit -m "feat(mobile): submit contribution images to api"
```

### Task 4: Remove the Pre-Upload Step from the Contribution Screen

**Files:**
- Modify: `apps/mobile/src/app/contribute/index.tsx`

**Interfaces:**
- Consumes: `submitCustomerContribution(payload, imageFiles)` from Task 3.
- Produces: customer UI flow that retains local files until final submission.

- [ ] **Step 1: Make the focused mobile service test the regression guard**

Run: `npm test --workspace=mobile -- --runInBand src/service/contributePlaceService.spec.ts`

Expected: PASS before the screen refactor.

- [ ] **Step 2: Remove upload-only screen state and behavior**

Remove the `uploadContributionImage` import, `uploadedUrl` field, `uploading` state, and `handleUploadImages`. Remove `imageUrls` construction from `buildCustomerContributionPayload`. In step 2, require at least one customer image and move directly to step 3. Submit with:

```ts
await submitCustomerContribution(
  buildCustomerContributionPayload(),
  toPendingEvidenceFiles(images),
);
```

Preview `images[0]?.uri`, and disable/show the footer spinner using `saving` only.

- [ ] **Step 3: Run TypeScript and lint checks for affected packages**

Run: `npx tsc --noEmit -p apps/mobile/tsconfig.json`

Expected: exit code 0.

Run: `npm run lint --workspace=mobile -- --no-fix`

Expected: exit code 0, or report only pre-existing lint failures with affected-file lint clean.

- [ ] **Step 4: Run API tests and build**

Run: `npm test --workspace=api -- --runInBand src/modules/location-contributions/location-contributions.controller.spec.ts src/modules/location-contributions/location-contributions.service.spec.ts`

Expected: PASS.

Run: `npm run build --workspace=api`

Expected: exit code 0.

- [ ] **Step 5: Run mobile tests and inspect the final diff**

Run: `npm test --workspace=mobile -- --runInBand src/service/contributePlaceService.spec.ts`

Expected: PASS.

Run: `git diff --check HEAD -- apps/api/src/modules/location-contributions apps/mobile/src/app/contribute/index.tsx apps/mobile/src/service/contributePlaceService.ts apps/mobile/src/service/contributePlaceService.spec.ts apps/mobile/package.json package-lock.json`

Expected: no whitespace errors.

- [ ] **Step 6: Commit the screen flow**

```powershell
git add -- apps/mobile/src/app/contribute/index.tsx
git commit -m "refactor(mobile): defer contribution upload to submit"
```
