# Mobile Workflow List Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compact and widen workflow request lists on mobile while correcting Vietnamese strings that are missing diacritics.

**Architecture:** Define testable workflow-list layout metrics in the shared mobile UI layer. `ActivityRow` accepts an opt-in compact presentation and the three workflow indexes use compact page content plus a zero-gap stack. Update only confirmed user-facing Vietnamese copy.

**Tech Stack:** Expo Router, React Native, react-native-paper, TypeScript, Jest.

## Global Constraints

- Preserve the current spacing of non-workflow `ActivityRow` consumers.
- Do not alter API values, identifiers, or unrelated in-progress workspace changes.
- Keep Vietnamese UI copy correctly accented.

---

### Task 1: Define and test compact workflow-list metrics

**Files:**
- Create: `apps/mobile/src/ui/components/workflow-list.ts`
- Create: `apps/mobile/src/ui/components/workflow-list.spec.ts`
- Modify: `apps/mobile/src/ui/components/patterns.tsx`

- [ ] Write a failing test that expects zero list gap and padding, an 8px row inset, a 40px icon, and compact badges.
- [ ] Run `npm test --workspace=mobile -- workflow-list.spec.ts` and confirm it fails because the metrics module does not exist.
- [ ] Add the minimal metrics export and use it for the `ActivityRow` compact variant.
- [ ] Re-run the targeted test and confirm it passes.

### Task 2: Apply the compact variant to workflow request indexes

**Files:**
- Modify: `apps/mobile/src/app/request-access/index.tsx`
- Modify: `apps/mobile/src/app/appeals/index.tsx`
- Modify: `apps/mobile/src/app/disputes/index.tsx`

- [ ] Pass compact page-content and row options to each workflow index, retaining empty-state padding.
- [ ] Ensure each item remains a full-width, pressable `ActivityRow` with status visible.

### Task 3: Correct confirmed Vietnamese UI strings and verify

**Files:**
- Modify: `apps/mobile/src/common/function.ts`

- [ ] Replace confirmed user-visible strings `Truong nay`, `Mo ta`, and `Dia chi` with their accented Vietnamese equivalents.
- [ ] Run the mobile Jest suite and TypeScript check.
- [ ] Search mobile source for the corrected strings and report any remaining candidates that require product-copy judgment.
