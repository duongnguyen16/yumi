# Apple Maps Component Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the Apple Maps community file into the existing universal mobile component system without implementing the Explore map screen.

**Architecture:** Keep the existing `src/ui` public API while moving each responsibility into focused files under `src/ui/components`. The Figma reference influences geometry, hierarchy, color, and control grouping; all application surfaces remain opaque and the preview remains a component gallery.

**Tech Stack:** Expo Router, React Native, TypeScript, Inter via Expo Google Fonts, Jest.

## Global Constraints

- Light mode only.
- Inter is the single UI font family.
- Content surfaces are opaque; no blur or glass effects.
- Universal components precede route-specific composition.
- New source files contain no comments.

---

### Task 1: Align tokens and typography

**Files:**
- Modify: `apps/mobile/src/ui/tokens.spec.ts`
- Modify: `apps/mobile/src/ui/tokens.ts`
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/src/app/_layout.tsx`

**Interfaces:**
- Produces: `colors`, `typography`, `radius`, `spacing`, and globally loaded Inter font names.

- [ ] Change the token test to expect Inter and the reference-derived blue and neutral values.
- [ ] Run `npm test --workspace=mobile -- tokens.spec.ts` and confirm it fails on the old Manrope contract.
- [ ] Install and load Inter, update the token values, and rerun the focused test.

### Task 2: Split and restyle universal components

**Files:**
- Delete: `apps/mobile/src/ui/components.tsx`
- Create: `apps/mobile/src/ui/components/index.ts`
- Create: `apps/mobile/src/ui/components/types.ts`
- Create: `apps/mobile/src/ui/components/screen.tsx`
- Create: `apps/mobile/src/ui/components/button.tsx`
- Create: `apps/mobile/src/ui/components/fields.tsx`
- Create: `apps/mobile/src/ui/components/feedback.tsx`
- Create: `apps/mobile/src/ui/components/containers.tsx`
- Create: `apps/mobile/src/ui/components/navigation.tsx`

**Interfaces:**
- Consumes: the token exports from Task 1.
- Produces: the existing public component exports plus `Chip` and `SectionHeader`.

- [ ] Move each universal component into a focused module without changing import paths.
- [ ] Apply compact pill controls, grouped rows, opaque elevated surfaces, and blue action hierarchy from the reference.
- [ ] Run TypeScript to confirm every public interface remains valid.

### Task 3: Refresh the component gallery

**Files:**
- Modify: `apps/mobile/src/app/ui-preview.tsx`

**Interfaces:**
- Consumes: universal components only from `@/ui/components`.

- [ ] Recompose the gallery into typography, search/chips, actions, fields, grouped rows, sheet, and navigation sections.
- [ ] Run the complete mobile test suite, TypeScript, and whitespace checks.
