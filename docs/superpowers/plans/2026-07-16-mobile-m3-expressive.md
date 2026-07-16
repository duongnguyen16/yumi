# Mobile M3 Expressive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the supplied warm palette and M3 Expressive visual language across the mobile app while introducing optimized role-aware navigation, safe-area Explore actions, and dedicated profile editing.

**Architecture:** Extend the existing universal component layer rather than styling screens independently. Derive navigation from a pure role-aware model, centralize typography and palette in tokens and the Paper theme, and let screens compose plain form sections and shared spatial controls.

**Tech Stack:** Expo Router 56, React Native 0.85, React Native Paper 5, Google Sans Flex through `@expo-google-fonts/google-sans-flex`, Jest, TypeScript.

## Global Constraints

- Stay on the current branch and do not create a worktree.
- Keep the app light-only.
- Use React Native Paper wherever an appropriate primitive exists.
- Keep source changes comment-free.
- Apply global tokens before screen-specific adjustments.
- Preserve safe areas at the top and bottom.

---

### Task 1: Global palette, typography, and shape

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/src/ui/tokens.ts`
- Modify: `apps/mobile/src/ui/tokens.spec.ts`
- Modify: `apps/mobile/src/app/_layout.tsx`
- Modify: `apps/mobile/src/ui/components/*.tsx`

- [ ] Write failing token tests for the supplied background, primary, surface, foreground, and increased shape scale.
- [ ] Run the token test and confirm the old orange/cool-gray values fail.
- [ ] Install Google Sans Flex and map all shared typography to the new font family.
- [ ] Replace global colors and Paper theme roles with the supplied light palette.
- [ ] Increase radii and add expressive narrow/wide shared variants.
- [ ] Run token tests and TypeScript.

### Task 2: Role-aware floating navigation

**Files:**
- Modify: `apps/mobile/src/navigation/mainTabs.ts`
- Modify: `apps/mobile/src/navigation/mainTabs.spec.ts`
- Modify: `apps/mobile/src/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/src/app/(tabs)/manage.tsx`
- Modify: `apps/mobile/src/ui/components/navigation.tsx`

- [ ] Write failing tests that customers receive `home`, `mine`, `profile`; vendors receive `home`, `manage`, `profile`; and neither receives `activity`.
- [ ] Run the navigation test and confirm it fails against static four-tab navigation.
- [ ] Implement `getMainTabs(role)` and role-aware tab routing.
- [ ] Implement the floating capsule Paper navigation bar with a wider selected destination.
- [ ] Point the vendor Manage tab at vendor management content.
- [ ] Run navigation tests and TypeScript.

### Task 3: Safe-area Explore dock and notifications

**Files:**
- Modify: `apps/mobile/src/ui/components/map.tsx`
- Modify: `apps/mobile/src/components/home/MapScreen.tsx`
- Create: `apps/mobile/src/app/notifications.tsx`

- [ ] Add a safe-area-aware top dock combining the growing search field and notification icon badge.
- [ ] Route the notification icon to a standalone notifications screen using the existing activity feed.
- [ ] Hide contribution controls for customers and show a primary-colored contribution FAB for vendors.
- [ ] Verify top and bottom insets on iOS and Android bundle targets.

### Task 4: Plain expressive forms and icon actions

**Files:**
- Modify: `apps/mobile/src/ui/components/containers.tsx`
- Modify: `apps/mobile/src/ui/components/fields.tsx`
- Modify: `apps/mobile/src/ui/components/wizard.tsx`
- Modify: `apps/mobile/src/ui/components/button.tsx`
- Modify: affected form screens under `apps/mobile/src/app`

- [ ] Change `FormSection` to a plain section without an enclosing card.
- [ ] Use filled tonal Paper fields and stronger expressive spacing.
- [ ] Replace standard text navigation actions with shared icon buttons.
- [ ] Check long Vietnamese labels do not wrap inside cards or buttons.
- [ ] Run TypeScript and lint.

### Task 5: Account overview and dedicated profile editor

**Files:**
- Modify: `apps/mobile/src/app/(tabs)/profile.tsx`
- Create: `apps/mobile/src/app/profile/edit.tsx`
- Create: `apps/mobile/src/components/profile/profile-editor.tsx`

- [ ] Replace inline editing with a dedicated profile edit route.
- [ ] Redesign the account identity surface with asymmetric avatar and metadata layout.
- [ ] Remove Language and Theme rows.
- [ ] Add contribution settings for customers and management settings for vendors.
- [ ] Preserve avatar selection, profile update, phone verification, and logout behavior.
- [ ] Run TypeScript, lint, tests, and a native Metro bundle smoke check.

