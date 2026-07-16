# Unified Vendor Locations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace two inconsistent vendor location lists with one status-aware list containing performance data.

**Architecture:** Expand the vendor dashboard locations endpoint to return every owned location and include its status alongside available metrics. Remove the redundant `/location/owned` request from mobile and render one `Địa điểm của bạn` section.

**Tech Stack:** NestJS, Mongoose, Expo, React Native Paper, Jest, TypeScript

## Global Constraints

- Do not create a branch or worktree.
- Do not add source comments.
- Published and non-published vendor locations must share one list.

---

### Task 1: Unified dashboard response

**Files:**
- Create: `apps/api/src/modules/vendor-dashboard/vendor-dashboard.service.spec.ts`
- Modify: `apps/api/src/modules/vendor-dashboard/vendor-dashboard.service.ts`

- [ ] Test that the locations query filters by owner only and returns status.
- [ ] Run the focused API test and verify failure.
- [ ] Include every owned status in the dashboard response.
- [ ] Run the focused API test and verify success.

### Task 2: Single mobile list

**Files:**
- Modify: `apps/mobile/src/service/vendorService.ts`
- Modify: `apps/mobile/src/app/vendor/dashboard.tsx`

- [ ] Remove the redundant owned-location request and type.
- [ ] Rename the section to `Địa điểm của bạn` and render status plus metrics in each row.
- [ ] Keep performance period chips above the unified list.
- [ ] Verify API and mobile tests, lint, TypeScript, and diff formatting.
