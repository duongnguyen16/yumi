# Mobile UI Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the opaque dark Solid Spatial UI component foundation and expose it through a temporary gallery in Account settings.

**Architecture:** A focused `src/ui` layer owns design tokens and composable React Native components. Existing features remain unchanged; the gallery composes the new components in one screen and is linked from Profile until Phase 2 adopts the navigation architecture.

**Tech Stack:** Expo Router, React Native, TypeScript, React Native Paper, Jest.

## Global Constraints

- All content surfaces use opaque solid colors.
- Do not use blur or transparent content containers.
- Use the shared token scale for color, spacing, radius, typography, elevation, and motion.
- Keep components universal and route-independent.
- Keep code files focused and free of code comments.

---

### Task 1: Define the design-system contract

**Files:**
- Create: `apps/mobile/src/ui/tokens.ts`
- Test: `apps/mobile/src/ui/tokens.spec.ts`

- [ ] Write a failing token contract test for the dark solid palette and spacing scale.
- [ ] Run `npm test --workspace=mobile -- tokens.spec.ts` and confirm the missing module failure.
- [ ] Add the exported token groups and pass the contract test.

### Task 2: Build universal primitives and controls

**Files:**
- Create: `apps/mobile/src/ui/components.tsx`

- [ ] Create Button, IconButton, TextField, SearchField, Badge, Card, ListRow, BottomSheet, NavigationBar, and BottomTabBar using the token contract.
- [ ] Run the mobile TypeScript check to validate the public component interfaces.

### Task 3: Add the temporary component gallery

**Files:**
- Create: `apps/mobile/src/app/ui-preview.tsx`
- Modify: `apps/mobile/src/app/(tabs)/profile.tsx`

- [ ] Compose every universal component in the UI preview route.
- [ ] Add one Profile menu item that links to `/ui-preview`.
- [ ] Run the focused test suite and TypeScript check.
