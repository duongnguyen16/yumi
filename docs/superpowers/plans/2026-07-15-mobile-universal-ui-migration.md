# Mobile Universal UI Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the complete Expo mobile application to the shared Solid Spatial UI system while reducing route-level styling and preserving existing product behavior.

**Architecture:** The public `src/ui` layer owns all reusable visual behavior and stays primarily composed from React Native Paper. Routes own navigation, data loading, and feature composition only; large workflows move their state and domain sections into focused feature modules while consuming universal screen, row, field, feedback, and form patterns.

**Tech Stack:** Expo Router, React Native, React Native Paper, TypeScript, Jest, Inter.

## Global Constraints

- Light mode is the only supported appearance.
- Inter is the application font.
- Orange `#FF6B00` is the primary React Native Paper color.
- All content surfaces are opaque.
- Tokens own color, spacing, radius, typography, elevation, and motion values.
- Prefer React Native Paper behavior before custom primitives.
- Keep source files focused and free of code comments.
- Preserve current API calls, authentication behavior, and feature routes during visual migration.
- Keep each route below 300 lines where practical; split domain logic and repeated composition instead of creating screen-specific UI components.

---

### Task 1: Complete the shared destination component contract

**Files:**
- Create: `apps/mobile/src/ui/components/layout.tsx`
- Create: `apps/mobile/src/ui/components/patterns.tsx`
- Modify: `apps/mobile/src/ui/components/containers.tsx`
- Modify: `apps/mobile/src/ui/components/fields.tsx`
- Modify: `apps/mobile/src/ui/components/index.ts`
- Test: `apps/mobile/src/ui/components/components.spec.tsx`

**Interfaces:**
- Produces: `Page`, `PageContent`, `Stack`, `Inline`, `AppText`, `GroupedList`, `FormSection`, `EmptyState`, `LoadingState`, `ActivityRow`, `PlaceRow`, and `MetricBlock`.
- Extends: `ListRow` with `value`, `state`, and optional trailing-chevron control.
- Extends: `TextField` with shared error/supporting text and secure-entry compatibility through Paper props.

- [ ] Write contract tests that render the public destination components and assert user-visible labels, status text, and accessibility labels.
- [ ] Run `rtk npm test --workspace=mobile -- components.spec.tsx` and confirm the missing exports fail.
- [ ] Implement the universal patterns as small React Native Paper compositions using only shared tokens.
- [ ] Export the public API from `apps/mobile/src/ui/components/index.ts`.
- [ ] Run the focused test and `rtk npx tsc --noEmit -p apps/mobile/tsconfig.json`.

### Task 2: Replace the legacy three-tab shell with four stable destinations

**Files:**
- Modify: `apps/mobile/src/navigation/mainTabs.spec.ts`
- Modify: `apps/mobile/src/navigation/mainTabs.ts`
- Modify: `apps/mobile/src/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/src/app/(tabs)/mine.tsx`
- Create: `apps/mobile/src/app/(tabs)/activity.tsx`
- Modify: `apps/mobile/src/app/(tabs)/home.tsx`
- Modify: `apps/mobile/src/app/(tabs)/profile.tsx`
- Remove: `apps/mobile/src/app/(tabs)/notifications.tsx`

**Interfaces:**
- Produces: tab names `home`, `mine`, `activity`, and `profile` with labels `Khám phá`, `Của tôi`, `Hoạt động`, and `Tài khoản`.
- Uses: React Native Paper `BottomNavigation.Bar` through Expo Router `tabBar` integration.
- Routes notification unread count to the `activity` badge.

- [ ] Change the navigation test to expect four stable destinations and the activity badge.
- [ ] Run `rtk npm test --workspace=mobile -- mainTabs.spec.ts` and confirm it fails against the legacy three-tab contract.
- [ ] Update the navigation model and implement a Paper-backed router tab bar without additional icon libraries.
- [ ] Add the Mine shell using `Page`, `MetricBlock`, `PlaceRow`, and one primary contribution action.
- [ ] Move the notification feed to Activity and render entries with `ActivityRow`.
- [ ] Convert Profile into Account groups using `GroupedList` and `ListRow`, moving business workflows to Mine and Activity.
- [ ] Run the focused navigation test and TypeScript check.

### Task 3: Migrate authentication to shared form patterns

**Files:**
- Modify: `apps/mobile/src/app/auth/login.tsx`
- Modify: `apps/mobile/src/components/auth/LoginForm.tsx`
- Modify: `apps/mobile/src/app/auth/register.tsx`
- Modify: `apps/mobile/src/app/auth/forgot-password.tsx`
- Modify: `apps/mobile/src/app/auth/reset-password.tsx`
- Create: `apps/mobile/src/components/auth/AuthScreen.tsx`

**Interfaces:**
- Produces: `AuthScreen` for keyboard-safe page structure and brand/title/supporting content.
- Uses: universal `TextField`, `Button`, `FormSection`, `AppText`, and feedback components.

- [ ] Add rendering tests for login validation, password recovery success, and disabled loading actions.
- [ ] Run focused auth tests and confirm legacy output fails the new shared-component expectations.
- [ ] Move shared authentication layout into `AuthScreen` and preserve existing service calls.
- [ ] Replace Paper controls and one-off colors in all authentication routes with universal controls and tokens.
- [ ] Run auth tests and TypeScript.

### Task 4: Consolidate activity workflows

**Files:**
- Create: `apps/mobile/src/components/workflow/WorkflowDetailScreen.tsx`
- Create: `apps/mobile/src/components/workflow/Timeline.tsx`
- Modify: `apps/mobile/src/app/appeals/index.tsx`
- Modify: `apps/mobile/src/app/appeals/[id].tsx`
- Modify: `apps/mobile/src/app/appeals/new.tsx`
- Modify: `apps/mobile/src/app/disputes/index.tsx`
- Modify: `apps/mobile/src/app/disputes/[id].tsx`
- Modify: `apps/mobile/src/app/request-access/index.tsx`
- Modify: `apps/mobile/src/app/request-access/[id].tsx`
- Modify: `apps/mobile/src/app/request-access/new/[locationId].tsx`

**Interfaces:**
- Produces: one workflow detail composition for appeals, disputes, and access requests.
- Uses: `ActivityRow`, `Badge`, `Timeline`, `PlaceRow`, `FormSection`, and universal actions.

- [ ] Add workflow mapping tests for localized statuses, semantic badge tones, and available actions.
- [ ] Implement the shared detail structure and timeline.
- [ ] Convert each workflow route to data mapping plus shared composition.
- [ ] Run workflow tests and TypeScript.

### Task 5: Split and migrate shared location forms

**Files:**
- Create: `apps/mobile/src/components/location-form/LocationBasicFields.tsx`
- Create: `apps/mobile/src/components/location-form/LocationContactFields.tsx`
- Create: `apps/mobile/src/components/location-form/LocationScheduleFields.tsx`
- Create: `apps/mobile/src/components/location-form/LocationMediaFields.tsx`
- Create: `apps/mobile/src/ui/components/wizard.tsx`
- Modify: `apps/mobile/src/app/contribute/index.tsx`
- Modify: `apps/mobile/src/components/location/EditLocationScreen.tsx`
- Modify: `apps/mobile/src/app/claim/[locationId].tsx`

**Interfaces:**
- Produces: `Stepper`, `FormFooter`, and shared controlled location-field groups.
- Contribution uses four steps; claim uses three steps; edit reuses the same field groups.

- [ ] Add pure step-transition and payload-mapping tests before extracting UI.
- [ ] Implement `Stepper` and `FormFooter` using Paper controls.
- [ ] Extract location field groups without changing service payloads.
- [ ] Recompose contribution, edit, and claim routes from the shared groups.
- [ ] Verify that failed requests retain form state, then run service tests and TypeScript.

### Task 6: Migrate Explore and place detail composition

**Files:**
- Modify: `apps/mobile/src/components/home/MapScreen.tsx`
- Modify: `apps/mobile/src/components/location/LocationSearchScreen.tsx`
- Modify: `apps/mobile/src/components/location/LocationDetailScreen.tsx`
- Modify: `apps/mobile/src/components/location/tabs/GeneralTab.tsx`
- Modify: `apps/mobile/src/components/location/tabs/ReviewTab.tsx`
- Modify: `apps/mobile/src/components/location/ProductSection.tsx`
- Modify: `apps/mobile/src/components/location/modals/Category.tsx`
- Modify: `apps/mobile/src/components/location/modals/SubCategory.tsx`
- Modify: `apps/mobile/src/components/location/modals/GetNewLocation.tsx`
- Create: `apps/mobile/src/ui/components/map.tsx`

**Interfaces:**
- Produces: `FloatingControlGroup`, `SearchDock`, and shared sheet compositions.
- Keeps custom map rendering and camera behavior as the only feature-specific visual exception.

- [ ] Add state-transition tests for search, marker selection, and place preview visibility.
- [ ] Implement shared map controls and search dock with opaque Paper surfaces.
- [ ] Replace centered category/search modals with the universal sheet composition.
- [ ] Convert place detail to a single-scroll hierarchy using shared sections and rows.
- [ ] Simplify reviews into flat rows and a form-sheet composer.
- [ ] Run location tests, TypeScript, and native interaction QA.

### Task 7: Migrate vendor experience and remove legacy UI code

**Files:**
- Modify: `apps/mobile/src/app/vendor/dashboard.tsx`
- Modify: `apps/mobile/src/app/(tabs)/mine.tsx`
- Remove: `apps/mobile/src/components/ui/Badge.tsx`
- Remove: `apps/mobile/src/components/ui/Dialog.tsx`
- Remove: `apps/mobile/src/components/ui/Option.tsx`

**Interfaces:**
- Vendor mode uses the same Mine destination and universal `MetricBlock`, `PlaceRow`, and `ActivityRow` components.
- Legacy UI imports resolve exclusively through `@/ui/components` after removal.

- [ ] Add vendor view-model tests for KPI hierarchy, pending actions, and managed places.
- [ ] Recompose the dashboard without a two-by-two metric grid.
- [ ] Replace all imports from `components/ui` with universal equivalents.
- [ ] Search for remaining raw colors, `StyleSheet.create`, direct Paper visual controls, and duplicate feature-specific components.
- [ ] Run the complete mobile test suite, TypeScript, `rtk git diff --check`, and native smoke tests for every route family.

## Delivery Checkpoints

1. Shared destination components and four tabs.
2. Authentication and Account.
3. Activity workflow consolidation.
4. Contribution, edit, and claim forms.
5. Explore and place details.
6. Vendor migration and legacy cleanup.

Each checkpoint must leave the mobile app type-safe and all existing mobile tests passing.
