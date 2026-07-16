# Mobile Request Access Paper Tabs Implementation Plan

> **For agentic workers:** Execute inline in the current working tree. Do not create a branch, stage, commit, or delegate.

**Goal:** Replace the request-access segmented selector with swipeable Material top tabs backed by `react-native-paper-tabs`.

**Architecture:** Keep the route shell in `request-access/index.tsx`. Render one isolated request-list page per `AccessSide` inside `TabsProvider`, `Tabs`, and `TabScreen` so each tab owns its asynchronous state.

**Tech Stack:** Expo Router, React Native, React Native Paper, react-native-paper-tabs, TypeScript, Jest.

## Global Constraints

- Preserve the updated UI tokens and existing request API.
- Keep both tab pages pull-to-refresh capable.
- Do not change branches or create commits.

---

### Task 1: Tab-side contract

**Files:**
- Create: `apps/mobile/src/navigation/request-access-tabs.ts`
- Create: `apps/mobile/src/navigation/request-access-tabs.spec.ts`

- [ ] Write a failing test asserting index 0 maps to `owner` and index 1 maps to `requester`.
- [ ] Run the focused Jest test and verify RED.
- [ ] Implement the two immutable tab definitions and index lookup.
- [ ] Re-run the focused test and verify GREEN.

### Task 2: Paper tab screen

**Files:**
- Modify: `apps/mobile/src/app/request-access/index.tsx`

- [ ] Extract the existing list behavior into an internal `AccessTabContent` receiving one `AccessSide`.
- [ ] Render both isolated pages under `TabsProvider`, `Tabs`, and `TabScreen`.
- [ ] Apply fixed mode, sentence-case labels, swipe support, app surface background, and current font tokens.
- [ ] Preserve refresh, empty, error snackbar, activity rows, and detail navigation in each page.

### Task 3: Verification

- [ ] Run the complete mobile Jest suite.
- [ ] Run mobile TypeScript no-emit.
- [ ] Run Expo lint.
- [ ] Run `git diff --check` and Android UI inspection without staging or committing.
