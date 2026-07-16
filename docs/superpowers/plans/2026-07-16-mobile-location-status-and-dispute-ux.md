# Mobile Location Status and Dispute UX Implementation Plan

> **For agentic workers:** Execute inline in the current working tree. Do not create a branch, commit, stage, or delegate.

**Goal:** Complete vendor location-status visibility and make ownership disputes discoverable, accurate, and visually clear in the updated mobile UI.

**Architecture:** Keep the current three-tab navigation. Separate published dashboard statistics from the complete owned-location list, and move workflow-specific presentation decisions into pure tested helpers consumed by the existing Expo Router screens.

**Tech Stack:** Expo Router, React Native, TypeScript, React Native Paper, Jest with ts-jest.

## Global Constraints

- Preserve the updated shared UI components and tokens.
- Keep Explore, Manage, and Account as the vendor tabs.
- Do not change branches, stage files, or create commits.
- Follow test-driven development for new presentation and routing behavior.

---

### Task 1: Presentation contracts

**Files:**
- Modify: `apps/mobile/src/components/workflow/status.ts`
- Modify: `apps/mobile/src/components/workflow/status.spec.ts`
- Create: `apps/mobile/src/components/location/location-status.ts`
- Create: `apps/mobile/src/components/location/location-status.spec.ts`
- Create: `apps/mobile/src/components/workflow/dispute-presentation.ts`
- Create: `apps/mobile/src/components/workflow/dispute-presentation.spec.ts`

**Interfaces:**
- Produce `getLocationStatus(status)` for owned-location badges.
- Produce `getDisputeOutcome(status)` and `getDisputeSide(currentUserId, vendorAId, vendorBId)` for detail copy.
- Extend `getWorkflowStatus` with all dispute resolution statuses.

- [ ] Write assertions for every supported location and dispute status, final outcome copy, and both participant sides.
- [ ] Run the focused Jest files and confirm failures are caused by missing mappings/helpers.
- [ ] Add the minimal pure helper implementations.
- [ ] Re-run the focused Jest files until green.

### Task 2: Notification destinations

**Files:**
- Create: `apps/mobile/src/navigation/notification-destination.ts`
- Create: `apps/mobile/src/navigation/notification-destination.spec.ts`
- Modify: `apps/mobile/src/components/activity/activity-feed.tsx`

**Interfaces:**
- Produce `getNotificationDestination({ refCollection, refId }): string | null`.
- Map `request_accesses`, `appeals`, `disputes`, and `locations`; return `null` for incomplete or unsupported references.

- [ ] Write destination tests and run them to verify RED.
- [ ] Implement the pure destination mapper and verify GREEN.
- [ ] Update notification rows to mark unread items and then navigate when a destination exists; already-read rows remain navigable.

### Task 3: Complete owned-location list

**Files:**
- Modify: `apps/mobile/src/service/vendorService.ts`
- Modify: `apps/mobile/src/app/vendor/dashboard.tsx`
- Reuse: `apps/mobile/src/components/location/location-status.ts`

**Interfaces:**
- Add `OwnedLocation` with `_id`, `name`, `address`, and `status`.
- Keep `VendorLocation` for published statistics.

- [ ] Update the service types without changing API behavior.
- [ ] Load overview, published stats, and all owned locations together while preserving partial error messages.
- [ ] Keep the performance section for published statistics and add a separate "All locations" grouped list with status badges.
- [ ] Ensure the registration empty state depends on the owned list rather than published statistics.

### Task 4: Restore workflow entrypoints

**Files:**
- Modify: `apps/mobile/src/app/(tabs)/profile.tsx`

- [ ] Keep location management in the Business group.
- [ ] Add a Management workflows group for Request management access, Appeals, and Ownership disputes.
- [ ] Use existing `ListRow` styling, icons, and supporting text.

### Task 5: Dispute list states

**Files:**
- Modify: `apps/mobile/src/app/disputes/index.tsx`

- [ ] Extract a reusable load callback with initial-loading and refreshing state.
- [ ] Add pull-to-refresh.
- [ ] Render a retryable error state instead of combining an empty state with an error message.
- [ ] Keep status badges and current `ActivityRow` styling.

### Task 6: Dispute detail clarity and evidence

**Files:**
- Create: `apps/mobile/src/components/workflow/evidence-gallery.tsx`
- Modify: `apps/mobile/src/app/disputes/[id].tsx`
- Reuse: `apps/mobile/src/components/workflow/dispute-presentation.ts`

- [ ] Identify the signed-in vendor using the user context and dispute participants.
- [ ] Replace "Current owner" with historically accurate participant labels.
- [ ] Add participant-side guidance and evidence destination copy while the dispute is open.
- [ ] Render image evidence for both sides and accessible fallbacks for video/document evidence.
- [ ] Add an outcome card, Admin reason, opened date, and decided date.
- [ ] Add a retryable detail error state and a successful evidence-submission snackbar.

### Task 7: Verification

**Files:**
- Inspect all modified mobile files and the current git diff.

- [ ] Run `npm test --workspace=mobile -- --runInBand`.
- [ ] Run `npx tsc --noEmit -p apps/mobile/tsconfig.json`.
- [ ] Run `npm run lint --workspace=mobile`.
- [ ] Run `git diff --check` and confirm the branch has not changed and no commit was created.
