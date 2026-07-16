# Explore Location Tab Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the existing current-location action in an accent-colored control beside the floating tab bar only on Explore.

**Architecture:** `MapScreen` registers its existing map-centering callback in a small Explore action bridge. The tab layout invokes the bridge only for the active Explore route and passes that action to `BottomTabBar`, which renders a separate accent action next to the capsule.

**Tech Stack:** Expo Router, React Native, React Native Paper, Jest, TypeScript.

## Global Constraints

- Keep the existing GPS permission and camera-centering behavior unchanged.
- Show the location action only on the active `home` tab.
- Preserve the existing hidden-tab-bar behavior for selected map details.
- Do not modify unrelated in-progress worktree changes.

---

### Task 1: Add an optional tab-bar location action

**Files:**
- Modify: `apps/mobile/src/ui/components/navigation.tsx`
- Test: `apps/mobile/src/ui/components/navigation.spec.ts`

**Interfaces:**
- Consumes: `action?: { accessibilityLabel: string; onPress: () => void }`
- Produces: an accent-filled separate location button beside the tab capsule.

- [x] **Step 1: Write the failing test**

```ts
setExploreLocationAction(onLocate);
invokeExploreLocationAction();
expect(onLocate).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `rtk npm test --workspace=mobile -- navigation.spec.ts`

Expected: FAIL because the action bridge does not exist.

- [ ] **Step 3: Write the minimal implementation**

```ts
let exploreLocationAction: (() => void) | undefined;
export function invokeExploreLocationAction() { exploreLocationAction?.(); }
```

Render the icon action only when an action is supplied.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `rtk npm test --workspace=mobile -- navigation.spec.ts`

Expected: PASS.

### Task 2: Register the Explore callback and expose it to the tab bar

**Files:**
- Modify: `apps/mobile/src/components/home/MapScreen.tsx`
- Modify: `apps/mobile/src/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: `setCurrentLocation` from `MapScreen`.
- Produces: `BottomTabBar` receives the callback only when the active route is `home`.

- [ ] **Step 1: Register the callback through the Explore action bridge**

```ts
setExploreLocationAction(() => { void setCurrentLocation(); });
```

- [ ] **Step 2: Read the active descriptor and pass the action only for `home`**

```ts
const locationAction = route.name === "home" ? invokeExploreLocationAction : undefined;
```

- [ ] **Step 3: Verify type checking and focused tests**

Run: `rtk npm test --workspace=mobile -- navigation.spec.ts && rtk npx tsc -p apps/mobile/tsconfig.json --noEmit`

Expected: both commands exit 0.
