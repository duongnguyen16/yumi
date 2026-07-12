# Contribution Flow Hardening Design

## Goal

Correct the six confirmed reliability and data-integrity defects in the mobile contribution and vendor-registration flows without changing their user-visible happy path.

## Scope

The change covers the mobile `contribute` screen and its API service, the customer contribution endpoint, and the multipart vendor-registration endpoint.

## Data Flow and Validation

The mobile client will only show a completion alert after a successful API response. A vendor submission with `success: false` will become a thrown error so the caller remains on the confirmation step.

Both backend submission paths will calculate pin-to-device distance and reject requests outside the existing 50 metre rule. The server remains the authority for duplicate detection: customer submissions already recalculate it, and vendor submissions will do the same before persisting request metadata.

The vendor controller will validate both JSON strings after deserializing them, with whitelist and forbidden-extra-property protection. `openingHours` will be a string in the vendor DTO. The customer DTO and persistence code will include `openingHours`, so the value selected in the mobile form reaches both the submitted location and the approval request snapshot.

## Error Handling

Vendor client submission will preserve the API error instead of converting it to a normal `{ success: false }` result. The vendor controller will rethrow Nest `HttpException` values and only wrap unexpected errors. The service will likewise allow expected validation failures to propagate and give a non-generic error only for unexpected failures.

Draft duplicate-analysis failure will be visible to the user and will block progression from the location step, because the user cannot make an informed duplicate decision without the result.

## Tests

Regression tests will cover: rejected out-of-range customer and vendor submissions; vendor duplicate metadata sourced from backend detection; customer opening-hours persistence; vendor multipart DTO validation; and the client’s rejection of an unsuccessful vendor response. Tests will be added before production changes.

## Non-goals

This change does not introduce image/video forensic validation, transactional media cleanup, or a new vendor-review workflow. It preserves the current manual system-code review model.
