# Admin Request History Design

## Goal

Allow administrators to view previously processed location requests, claims,
ownership disputes, and appeals without mixing them into the active work queue.

## Scope

The existing admin pages at `/admin/location-requests`, `/admin/claims`,
`/admin/disputes`, and `/admin/appeals` each gain two views:

- `Chờ xử lý`: the existing actionable queue.
- `Lịch sử`: completed or otherwise non-actionable records.

This change does not alter any decision state machine, notification, trust, audit,
or ownership behavior.

## Status Classification

Each resource has one explicit set of actionable statuses. Every other valid
status belongs to history.

| Resource | Actionable statuses | History statuses |
| --- | --- | --- |
| Location request | `PENDING`, `PENDING_RE_APPROVAL` | `APPROVED`, `REJECTED`, `CANCELLED` |
| Claim | `PENDING` | `APPROVED`, `REJECTED`, `RELEASED`, `REVOKED` |
| Dispute | `OPEN` | `RESOLVED_KEEP`, `RESOLVED_TRANSFER`, `RESOLVED_REVOKE` |
| Appeal | `PENDING` | `ACCEPTED_TO_DISPUTE`, `OVERTURNED`, `UPHELD` |

## API Contract

The existing list endpoints accept an optional `view` query parameter with two
values: `queue` and `history`.

- Missing `view` remains equivalent to `queue`, preserving existing consumers.
- `queue` filters by the actionable status set and sorts oldest first.
- `history` filters by the history status set and sorts newest first using the
  best available decision timestamp, with `updatedAt` and `createdAt` as
  fallbacks.
- Existing `page` and `limit` parameters continue to control pagination.
- Each response continues returning `items`, `total`, `page`, and `limit`.

The API validates `view` rather than accepting an unbounded status expression.
This keeps the classification centralized and prevents the web client from
duplicating backend state-machine rules.

## Web Behavior

Each page renders a shared visual pattern using MUI tabs:

- The initial tab is `Chờ xử lý`.
- Switching tabs resets the page to 1 and loads the selected view.
- The subtitle and empty state describe the selected view rather than always
  saying records are waiting.
- The history table includes the record status and retains access to the detail
  drawer.
- History rows never render decision buttons. Their drawers are read-only and
  show stored decision metadata when available.
- Both views expose pagination so every matching record remains reachable.
- Reload refreshes the currently selected view and page.

The pages keep their current data-fetching architecture. No new client cache or
state library is introduced.

## Error and Concurrency Handling

- A failed tab or page load leaves the selected view visible and shows the
  existing page-level error alert.
- Decision actions are available only in `queue`. The backend's existing
  conflict checks remain the final protection against stale concurrent actions.
- After a successful decision, the active queue page reloads. If the last item
  on a non-first page disappears, the page moves back one page before reloading.

## Testing

Backend service tests cover both classifications for all four resources,
including the default queue behavior and descending history order. DTO tests or
controller validation coverage confirm invalid `view` values are rejected.

Frontend verification covers API parameter forwarding and page behavior where
the current test setup supports it. The final verification includes focused API
tests, the API build, the web build, and `git diff --check`.

## Non-goals

- Searching or filtering history by arbitrary status, user, location, or date.
- Exporting history.
- Editing or reopening processed records.
- Changing decision reasons or adding missing historical data.
