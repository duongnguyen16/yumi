# Mobile Location Status and Dispute UX Design

## Goal

Complete the vendor-facing location-management and ownership-dispute flows while preserving the current three-tab mobile navigation and the new shared UI system.

## Navigation

Vendor tabs remain Explore, Manage, and Account. Account gains a "Management workflows" group with Request management access, Appeals, and Ownership disputes. Notifications with a supported `refCollection` and `refId` open the corresponding request-access, appeal, dispute, or location screen after being marked read.

## Location management

The Manage tab keeps published-location metrics and the 7/30-day performance filter. It separately loads every owned location from `/location/owned` and renders a complete list with Vietnamese status badges. Pending, re-approval, rejected, and hidden locations remain visible even though they are excluded from published performance metrics.

## Dispute presentation

Dispute statuses have explicit Vietnamese labels and tones for `OPEN`, `RESOLVED_KEEP`, `RESOLVED_TRANSFER`, and `RESOLVED_REVOKE`. The detail screen identifies the signed-in vendor's side, uses historically accurate party labels, explains where new evidence will be attached, shows both evidence collections, and presents the final ownership outcome, decision reason, opened date, and decided date.

The dispute list supports pull-to-refresh and uses separate loading, empty, and retryable error states. The detail screen also uses a retryable error state and confirms successful evidence submission.

## Data boundaries

Published performance data continues to come from `/vendor/dashboard/*`. The complete owned-location list comes from `/location/owned`. Presentation mapping remains in pure helper modules so status, outcome, side, and notification destinations can be regression-tested without rendering React Native components.

## Verification

Use test-first coverage for location status presentation, complete dispute outcome mapping, dispute-side identification, and notification destinations. Finish with the complete mobile Jest suite, TypeScript no-emit check, and lint. Do not change branches or create commits.
