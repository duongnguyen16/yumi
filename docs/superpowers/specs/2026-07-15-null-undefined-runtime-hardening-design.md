# Null/Undefined Runtime Hardening Design

## Goal

Prevent the confirmed mobile and API flows from dereferencing `null` or `undefined` while preserving existing successful behavior and API contracts.

## Scope

- Vendor contribution video selection must never store `null` entries.
- Mobile location helpers and API wrappers must return explicit, typed outcomes instead of falling through with `undefined`.
- UI handlers must guard location and API results before reading nested properties.
- OTP verification must handle missing expiry data deterministically.
- Missing password-reset configuration must produce a controlled service error; secrets will not be generated or committed automatically.

Broadly enabling TypeScript `strict` across the mobile app and unrelated refactoring are out of scope.

## Design

### Mobile boundary normalization

Network helpers return a discriminated success/failure object on every path. Device-location lookup returns the location on success and `null` on failure. Callers keep explicit guards before reading `coords`, `success`, or response data so future service regressions cannot crash a screen.

### Video validation

Image-picker assets are converted through a small pure normalization function. Invalid assets are rejected before state update, so rendering and multipart conversion receive only valid evidence objects.

### API OTP expiry

New OTP documents require `expiresAt`. Verification also treats a missing expiry on legacy or malformed records as invalid/expired instead of comparing `undefined` with a date.

### Configuration

Password-reset configuration remains mandatory and returns an explicit controlled error when unavailable. No fallback secret is derived from another key, and no secret value is written to source control.

## Error handling

- Invalid picked media: show the existing alert and omit the invalid item.
- Location unavailable: stop the action, reset loading state, and show a user-facing message where the flow is interactive.
- Unexpected 2xx API payload: return a failure object with a fallback message.
- Missing OTP expiry: reject verification as expired/invalid.
- Missing password-reset secret: return the existing configuration error through the API boundary.

## Testing

Tests will be written before implementation and must first fail for the confirmed behavior:

1. Invalid video assets are omitted and valid assets remain.
2. Location/API helpers never resolve to `undefined`.
3. OTP verification rejects records whose `expiresAt` is missing.

After each focused test passes, run the complete API and mobile test suites, production API type-check, mobile type-check, and scoped lint checks. Existing user changes outside these fixes must remain untouched.
