# Vendor Management Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate vendor location management and analytics into two focused Paper tabs.

**Architecture:** Define the tab contract in navigation configuration and render each tab as an isolated data view. The locations tab owns status and edit navigation; the analytics tab owns date filters and performance metrics.

**Tech Stack:** Expo, React Native Paper Tabs, Jest, TypeScript

## Global Constraints

- `Địa điểm của bạn` is the default tab.
- Use icons and compact badges instead of long inline metric text.
- Do not add source comments.

---

### Task 1: Tab contract

**Files:**
- Create: `apps/mobile/src/navigation/vendor-management-tabs.ts`
- Create: `apps/mobile/src/navigation/vendor-management-tabs.spec.ts`

- [ ] Test the order, labels, icons, and default tab.
- [ ] Verify the focused test fails before implementation.
- [ ] Implement the tab contract and verify it passes.

### Task 2: Split dashboard views

**Files:**
- Modify: `apps/mobile/src/app/vendor/dashboard.tsx`

- [ ] Move the status-only list into `Địa điểm của bạn`.
- [ ] Move summary, period filters, and performance rows into `Phân tích`.
- [ ] Use Paper tabs with icon labels and independent loading/error states.
- [ ] Run mobile tests, lint, TypeScript, and diff checks.
