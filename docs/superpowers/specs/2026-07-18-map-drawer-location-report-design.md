# Map drawer location report restoration

## Context

The mobile detail route at `/location/[id]` was replaced by a redirect to the Explore map. Its report UI did not move with the rest of the location experience into `MapLocationDrawer`, although the authenticated `POST /locations/:locationId/reports` endpoint and `locationReportService` remain available.

## Decision

Restore the existing report capability inside the attached location-detail drawer. Use a dedicated, focused report composer component mounted by the drawer rather than putting report state into the map screen or reviving the obsolete route.

The drawer action strip will expose a destructive-toned `Báo cáo` action for every non-owner. It remains visible to guests; tapping it routes to sign-in because reporting is an authenticated write action. The location owner never sees the action.

## Report composer

The composer will preserve the previous contract:

- reasons: incorrect information, spam, permanently closed, wrong owner, and other;
- a required 10–1000 character description;
- up to five image-evidence uploads;
- at least one image when reporting a wrong owner;
- disabled dismissal and submission controls while uploads or submission are in progress;
- reset-and-dismiss on success, otherwise an in-context Vietnamese notice.

It will reuse `reportLocation`, `uploadContributionImage`, the shared field/button/feedback primitives, and the existing image-picker pattern. The client should submit the API-supported image evidence exactly as the service expects. The backend remains authoritative for authentication, ownership, duplicate pending reports, and all report-routing rules; a wrong-owner report therefore enters ownership review and never starts a dispute directly.

## Alternatives considered

1. Put a single report button in the drawer and send users to `/location/[id]`. Rejected because that route intentionally redirects back to the map and would not restore the workflow.
2. Restore the old route-level dialog unchanged. Rejected because the report entry point needs to live with the current map-sheet detail experience.
3. Add the report state directly to `MapScreen`. Rejected because map selection and report composition would become coupled, making the drawer harder to reuse and test.

## Validation

Add focused tests for the report-form model/validation and for the drawer eligibility helper. Verify the red-green test cycle, run the targeted mobile Jest tests, TypeScript checking, and inspect the final diff so unrelated Explore changes remain intact.
