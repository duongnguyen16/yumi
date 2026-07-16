# Vendor Location Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the vendor add-location control from Explore and add a phone-aware registration entry under Account.

**Architecture:** Keep Explore focused on map browsing and location selection. Centralize vendor registration destination selection in the navigation module so Account can route either to phone verification or directly to contribution registration.

**Tech Stack:** Expo Router, React Native Paper, Jest, TypeScript

## Global Constraints

- Do not create a branch or worktree.
- Do not add source comments.
- Preserve the non-vendor contribution entry.

---

### Task 1: Vendor registration destination

**Files:**
- Modify: `apps/mobile/src/navigation/authDestination.ts`
- Test: `apps/mobile/src/navigation/authDestination.spec.ts`

**Interfaces:**
- Produces: `getVendorRegistrationDestination(phoneVerified: boolean): string | HrefObject`

- [ ] Add failing tests for verified and unverified vendor destinations.
- [ ] Run `npm test --workspace=mobile -- --runInBand src/navigation/authDestination.spec.ts` and verify failure.
- [ ] Implement the destination helper.
- [ ] Run the focused test and verify success.

### Task 2: Move the registration entry

**Files:**
- Modify: `apps/mobile/src/components/home/MapScreen.tsx`
- Modify: `apps/mobile/src/app/(tabs)/profile.tsx`

**Interfaces:**
- Consumes: `getVendorRegistrationDestination(phoneVerified)`

- [ ] Remove the vendor add action and its action sheet from Explore.
- [ ] Add `Đăng ký địa điểm` to the vendor Account business group.
- [ ] Route through phone verification when the account is not verified.
- [ ] Run mobile tests, lint, TypeScript, and `git diff --check`.
