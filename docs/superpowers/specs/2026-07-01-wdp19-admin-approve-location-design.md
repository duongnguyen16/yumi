# WDP-19 — Admin duyệt địa điểm (LocationRequest queue) — Design

**Branch:** `feature/sample/WDP19-Approve-Location-Request` (built on top of the existing WIP on `feature/WDP19-Approve-Location-Request`)
**Scope:** `apps/api` only. `apps/web` admin queue UI is out of scope — this doc defines the API contract for it.
**Source of truth:** `guideline/WDP-19-admin-duyet-dia-diem.md` (personal, gitignored). This spec captures the confirmed decisions in a committable form and resolves the points the guideline left open.

## Goal

Admin reviews a queue of `PENDING` `LocationRequest` documents and approves or rejects each one. Approving publishes the linked `Location` and awards trust to the submitter; rejecting requires a reason and leaves the main record untouched. Every decision is notified and audit-logged.

## Architecture decision (already fixed, not re-litigated)

Admin acts on `LocationRequest` (a review-ticket entity), never mutates `Location.status` directly except as a side effect of approve/reject. This mirrors `ClaimRequest`/`RequestAccess` in the same codebase.

## Current-code reality check

- `LocationRequest` is already registered in `schema.module.ts` — no change needed.
- `apps/api/src/modules/admin/` already has `admin-location.service.ts`, `dto/list-pending-requests.dto.ts`, `dto/reject-request.dto.ts`, all uncommitted and **not currently valid TypeScript** (broken constructor, missing imports, stray semicolon between decorators, unfinished method body). These get fixed in place, not rewritten from a blank file, per the chosen branch strategy.
- No controller, no module, no `app.module.ts` wiring, no `notification.port.ts` exist yet.

## Files touched

| File | Action |
|---|---|
| `common/contracts/notification.port.ts` | Create — `NotificationPort` interface + `NotificationStub` (writes to `notifications` collection; real impl is WDP-7, owned by Đăng) |
| `modules/admin/dto/list-pending-requests.dto.ts` | Fix — keep as pagination DTO (`page`, `limit`, default limit 20 to match the doc) |
| `modules/admin/dto/reject-request.dto.ts` | Fix — remove stray `;`, rename `duplicatedLocationId` → `duplicateOfLocationId` (matches service/controller naming below) |
| `modules/admin/admin-location.service.ts` | Rewrite in place — `getQueue`, `approve`, `reject` |
| `modules/admin/admin-location.controller.ts` | Create — `GET queue`, `PATCH :id/approve`, `PATCH :id/reject`, guarded by `AuthGuard('jwt-at')` + `AdminGuard` |
| `modules/admin/admin.module.ts` | Create — imports `SchemaModule`, `TrustEngineModule`; provides service, `AdminGuard`, `NOTIFICATION_PORT` |
| `app.module.ts` | Add `AdminModule` to imports |
| `apps/api/scripts/seed-location-request.js` | Create — idempotent seed (test category + test submitter user + one `SUBMITTED` Location + one `PENDING` LocationRequest with both flags triggered), following the existing `seed-test-users.js` pattern so the flow is testable without waiting on F13/F32 |
| `modules/admin/admin-location.service.spec.ts` | Create — unit tests mirroring `admin-category.service.spec.ts`'s manual-mock style |

## State machine

| LocationRequest (before) | Action | LocationRequest (after) | Effect on `Location` | Trust |
|---|---|---|---|---|
| `PENDING` | approve | `APPROVED` + `reviewerId` + `reviewedAt` | apply allow-listed fields from `submittedDataSnapshot`, `status = PUBLISHED`, clear `rejectionReason` | `LOCATION_APPROVED` (+15) via `TrustEngineService.recordEvent` |
| `PENDING` | reject | `REJECTED` + `rejectReason` + `reviewerId` + `reviewedAt` | no snapshot applied. If `Location.status !== PUBLISHED` (new-location case): set `status = REJECTED`, `rejectionReason = rejectReason`. If already `PUBLISHED` (BR-30 edit re-approval case): leave `Location` untouched. | none — rejection never calls Trust Engine |
| anything else | either | — | — | 409 `"Phiếu đang ở trạng thái {status}, không thể duyệt"` |

Rule I8 holds: the only trust mutation path is `TrustEngineService.recordEvent`; nothing increments `trustScore` by hand.

## Resolving the guideline's open "SEAM": snapshot → Location field copy

The guideline leaves "apply `submittedDataSnapshot` to `Location`" as a commented-out placeholder because F13/F32 (the flows that create `LocationRequest`) don't exist yet, so there's no confirmed field contract. Since the DoD requires approve to actually publish a working `Location` (testable end to end), this spec fixes a concrete, defensible interim contract instead of leaving a no-op:

Copy only these keys from `submittedDataSnapshot`, if present: `name`, `description`, `address`, `geo`, `accuracyMeters`, `openingHours`, `categoryId`, `subCategoryIds`, `images`. Anything else in the snapshot is ignored. This is a plain allow-list against `Location`'s actual editable fields (from `location.schema.ts`) — it deliberately excludes system-managed fields (`submittedBy`, `ownerId`, `status`, `isDuplicate`, `isSuspectedDuplicate`, `viewCount`, `source`, timestamps) so a snapshot can never mass-assign something it shouldn't. `categoryId`/`subCategoryIds` are cast to `ObjectId` when present as strings.

This is flagged as a decision F13/F32's authors should confirm against, not a guess at unstated business rules — the set of copyable fields is derived directly from the schema, not invented.

## Flags in the queue (display-only, not computed here)

- `suspectedDuplicate` = `isPotentialDuplicate === true` (plus `suspectedDuplicateLocationIds` passthrough)
- `farPin` = `deviceDistanceMeters > FAR_PIN_THRESHOLD`, `FAR_PIN_THRESHOLD = 50` (meters) — the guideline's own default, flagged there as "chốt với team"; kept as a single named constant so it's a one-line change later.

Computing `isPotentialDuplicate`/`deviceDistanceMeters` themselves is F13/F32's job, out of scope here.

## Notification / Audit (both decision branches)

- Notification: `NOTIFICATION_PORT.notify(...)` stub, one call per decision, in-app only (`notifications` collection).
- Audit: one `audit_logs` document per decision (`actorId`, `action`, `targetCollection: 'location_requests'`, `targetId`, `reason`, `diff` of both status transitions), written directly (no shared audit util exists yet — WDP-39).

## Auth

`@UseGuards(AuthGuard('jwt-at'), AdminGuard)` on the whole controller, reusing the existing `AdminGuard` as-is (no new `RolesGuard`).

## Testing plan

1. `admin-location.service.spec.ts` — unit tests for `getQueue` (flags computed correctly), `approve` (status transitions, trust call, field copy), `reject` (reason required, duplicate-link message, Location left alone when already `PUBLISHED`), and the non-`PENDING` 409 guard.
2. `scripts/seed-location-request.js` + existing `scripts/seed-test-users.js` → manual run through the checklist in the guideline (§7/§8): queue lists the seeded request with both flags on, approve publishes + credits trust, reject requires a reason, re-deciding an already-decided request 409s, non-admin 403s, no token 401s.

## Out of scope / explicit follow-ups

- `apps/web` admin queue UI — this spec's endpoints are the contract for it.
- Real notification delivery (WDP-7) and a shared audit-log util (WDP-39) — both stubbed/direct per the guideline.
- Creating `LocationRequest` on submit/edit (F13/F32) — still hand-seeded for this ticket.
- Any duplicate-detection or distance-computation logic — consumed as given, not built here.
