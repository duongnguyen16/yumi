# Customer Contribution Backend Image Upload Design

## Goal

Move customer contribution image uploads out of the Expo client and into the NestJS API, following the existing vendor registration flow. A customer submits the location data and one to five local image files in one authenticated multipart request. The API uploads the files to Supabase and stores the resulting public URLs.

## Scope

- Change only the customer contribution path at `POST /location/contribution/submit`.
- Preserve the vendor registration flow and its request contract.
- Preserve the current customer contribution validation, duplicate detection, location creation, request creation, and notification behavior.
- Remove the customer contribution screen's direct Supabase upload dependency and signed-upload step.
- Do not change unrelated review, profile, product, or location-edit upload flows.

## Request Contract

The mobile app sends `multipart/form-data` to `POST /location/contribution/submit` with:

- `data`: a JSON string containing the existing contribution fields except `imageUrls`.
- `imageFiles`: one to five image files selected on the device.

The accepted contribution data remains:

- name, description, optional opening hours;
- category and tag IDs;
- address, pin coordinates, device coordinates, and optional accuracy;
- optional suspected duplicate IDs retained by the current DTO.

The endpoint remains protected by the existing access-token guard.

## Mobile Design

`apps/mobile/src/app/contribute/index.tsx` keeps selected images as local file metadata through the confirmation step. Advancing from the image step no longer uploads files or requires a client-side Supabase configuration. On final customer submission, the screen passes the location payload and selected files to the contribution service.

`apps/mobile/src/service/contributePlaceService.ts` builds a `FormData` request using the same React Native file shape already used by vendor registration. It appends the serialized contribution data as `data`, appends each selected image as `imageFiles`, and posts the form to the existing submit endpoint. The direct Supabase client, signed-upload URL request, file-buffer conversion, and `uploadContributionImage` function are removed when no other code depends on them.

The UI continues to require at least one image and allow at most five. The loading state covers the final multipart submission rather than a separate upload step. Preview rendering continues to use the local URI.

## Backend Design

`LocationContributionsController` accepts up to five `imageFiles` with Nest's multipart interceptor. It parses the `data` field, transforms it into `SubmitLocationRequestDto`, and runs class-validator with whitelist and non-whitelisted-field rejection, matching the vendor controller's JSON-in-multipart pattern. Invalid JSON, invalid DTO data, or a missing/invalid file count returns a bad-request response.

`SubmitLocationRequestDto` no longer accepts `imageUrls`, because URLs are produced by trusted backend code rather than supplied by the client.

`LocationContributionsService` receives the validated DTO and uploaded files. After the existing user, daily-limit, category, position, and duplicate checks pass, it delegates upload to `ImagesService.uploadMultiMedia("customer-contribution", files)`. It then uses the returned public URLs everywhere the current implementation uses `dto.imageUrls`: location image records, request `newData`, and request `imageUrls`.

`LocationContributionsModule` imports `ImagesModule` so it can inject the exported `ImagesService`.

## Validation and Error Handling

- Require between one and five files for every customer contribution.
- Reuse `ImagesService` validation for supported image MIME types and size limits.
- Reject malformed JSON and DTO validation failures before creating location records.
- If upload fails, propagate a client-facing request failure and do not create location or request records.
- Preserve the current mobile error extraction so backend messages appear in the failure alert.
- Uploaded files can become orphaned if a later database operation fails; this matches the current vendor flow and is outside this focused change.

## Testing

Implementation follows test-first development:

- Controller tests cover valid multipart parsing, malformed `data`, and missing files.
- Service tests cover using backend-uploaded URLs in both the location and location-request records and stopping before persistence when upload fails.
- A mobile service test verifies the multipart field names and request endpoint with the existing Jest setup.
- Run focused tests first, then API and mobile type/lint/build checks appropriate to the affected packages.

## Success Criteria

- Customer contribution no longer reads Supabase URL or publishable-key environment variables for image upload.
- The mobile client sends local image files only to the API.
- The API uploads one to five images and persists the returned public URLs.
- Existing contribution rules and response shape remain unchanged.
- Vendor registration behavior remains unchanged.
