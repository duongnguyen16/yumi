# Comprehensive Manual Fixtures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide non-destructive, repeatable local fixtures for at least forty places and the core ownership workflows.

**Architecture:** Keep catalogue seed data unchanged and add deterministic fixture documents through `apps/api/scripts/seed-test-users.js`. Fixed ObjectIds and replace-upserts make every run repeatable, while a fixture-only location range keeps unrelated database records untouched.

**Tech Stack:** Node.js, MongoDB, Mongoose, BSON ObjectId, npm workspaces.

## Global Constraints

- Never delete or reset existing database documents.
- Use fixed fixture IDs and upserts only.
- All created test accounts use one documented password.
- Cover ownership, claims, access transfers, disputes, contributions, reports, appeals, and history states.

---

### Task 1: Generate deterministic place and workflow fixtures

**Files:**
- Modify: `apps/api/scripts/seed-test-users.js`

**Interfaces:**
- Produces: `fixtureLocations()` and expanded `fixtureCollections()` consumed by `main()`.

- [ ] **Step 1: Add a fixture count assertion command**

Run: `npm run seed:users --workspace=api`

Expected: existing fixture seed completes and prints the current account list.

- [ ] **Step 2: Add the fixture location generator and lifecycle documents**

Create forty fixed-ID location documents across published, submitted, rejected, hidden, duplicate, and pending-reapproval states. Add every relation using the matching foreign keys and valid enums.

- [ ] **Step 3: Run the seed twice**

Run: `npm run seed:users --workspace=api && npm run seed:users --workspace=api`

Expected: both runs succeed; the second run does not add duplicate fixture documents.

### Task 2: Verify database data and provide operator credentials

**Files:**
- Modify: `apps/api/scripts/seed-test-users.js`

**Interfaces:**
- Produces: seed console output listing test accounts and fixture totals.

- [ ] **Step 1: Add post-seed summary queries**

Log counts for fixture locations and each workflow collection, grouped by status where useful.

- [ ] **Step 2: Execute and inspect the seed summary**

Run: `npm run seed:users --workspace=api`

Expected: output shows at least forty fixture locations and the required lifecycle categories.

- [ ] **Step 3: Query MongoDB directly**

Run: a read-only Node/Mongoose query against the fixture ObjectId range.

Expected: no duplicate fixed IDs, valid owner references, and the requested workflow-status coverage.
