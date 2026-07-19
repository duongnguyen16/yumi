# Vendor Review Reply UI Design

**Date:** 2026-07-19
**Scope:** Mobile review reply and edit experience for the vendor who owns a location

## Goal

Allow the vendor who owns a location to open a review from the location detail drawer, post one text reply, and later edit that reply without leaving the detail context. The UI must match the existing mobile design system and preserve all original review information.

## Current Context

- The active location detail experience is `MapLocationDrawer` on the home map. The `/location/[id]` route redirects to `/home` with a `locationId` parameter.
- `ReviewTab` is rendered both inside `MapLocationDrawer` (`embedded`) and the older `LocationDetailScreen`.
- The API worktree already contains:
  - `POST /location/reply`
  - `PATCH /location/reply/edit`
  - Service-side checks that the review is published, belongs to a location, and the authenticated user matches `location.ownerId`.
- The API accepts `{ data: { reviewId, content } }` and currently returns a success/message result without the saved reply body.

## Authorization and Entry Point

The mobile app considers a review card reply-capable only when both conditions are true:

1. `user.role === "VENDOR"`
2. The normalized current user ID equals the normalized `locationData.ownerId`.

For the owning vendor, the entire review card is pressable. A review without a reply displays a small “Phản hồi” affordance; a review with a reply displays “Đã trả lời”. Other users see the existing non-interactive review card and cannot open the vendor reply dialog.

This frontend check controls discoverability only. The existing backend owner check remains the authority. No backend guard or unrelated backend refactor is included in this scope.

## Dialog Interaction

Pressing an eligible review card opens a centered `react-native-paper` modal through a `Portal` owned by `ReviewTab`. No navigation occurs, `MapLocationDrawer` remains mounted underneath, and dismissing the dialog returns the vendor to the same review list and scroll position.

The dialog presents the original review first:

- Reviewer avatar, with an initial-based fallback
- Reviewer display name
- Relative review date
- Star rating
- Full review comment
- Existing review images, if any, in a compact horizontal gallery

Reply content is displayed below the review with indentation and a subtle thread connector inspired by the supplied Twitter reference. Vendor replies support text only; the reply composer does not provide image or video controls.

### Review Without a Reply

- Show a text area labeled for the vendor response.
- Show a live character counter up to 1000 characters.
- Show cancel and submit actions.
- Trim before submission and reject empty/whitespace-only content.
- Disable dismissal and repeated submission while the request is running.

### Review With a Reply

- Show the saved reply content and reply date in read-only form.
- Hide the new-reply text field and reply submit button entirely.
- Show a vertical three-dot menu in the reply header.
- The menu contains one action: “Chỉnh sửa phản hồi”.

### Editing an Existing Reply

- Selecting “Chỉnh sửa phản hồi” replaces the read-only reply body with a text area prefilled with the current reply.
- Show “Hủy” and “Lưu thay đổi” actions only while editing.
- Cancel restores the unchanged read-only reply.
- A successful save reloads the reviews and returns the dialog to read-only mode while keeping it open.
- A failed save preserves the draft and keeps edit mode active.

## Keyboard and Scrolling

The centered dialog is wrapped in a platform-aware `KeyboardAvoidingView`. iOS uses padding behavior and Android uses height behavior. The dialog has a bounded maximum height, with its content inside a scroll view configured with `keyboardShouldPersistTaps="handled"` and interactive keyboard dismissal where supported.

Opening the keyboard must keep the active text area and current actions visible. Closing the dialog explicitly dismisses the keyboard. Backdrop and close actions are disabled while a reply request is in flight.

## Data Flow

API clients are added to `apps/mobile/src/service/vendorService.ts`:

- `replyReview(reviewId, content)` calls `POST /location/reply`.
- `editReviewReply(reviewId, content)` calls `PATCH /location/reply/edit`.

Both functions normalize API errors using the vendor service's existing error helper and return a consistent `{ success, message }` result.

`ReviewTab` owns the selected review, dialog visibility, composer mode, draft, request state, and menu visibility. After a successful create or edit call, it reloads the location reviews because the current API response does not contain the persisted reply. The refreshed selected review replaces the stale dialog data. A `NoticeSnackbar` reports success or failure without navigating or closing the location detail drawer.

## Component Boundaries

- `ReviewTab`: fetching, permission calculation, selected-review state, mutation orchestration, and list refresh.
- `ReviewCard`: visual review summary, owner-only press affordance, and existing author edit/delete controls.
- `VendorReviewReplyDialog`: original review display, reply display/composer, three-dot edit menu, keyboard behavior, and callbacks.
- `vendorService.ts`: reply and edit API calls.
- Small pure helper functions may be extracted where needed for permission and draft validation so behavior can be tested without rendering the full tab.

## Error Handling

- Validation errors are shown before calling the API.
- Network and API failures retain the current draft and dialog mode.
- Failed reload after a successful mutation is surfaced through the snackbar; the next normal review reload reconciles state.
- A stale attempt to post a second reply is rejected by the existing backend check and shown as an API error.
- Missing or invalid review media is omitted without breaking the rest of the review display.

## Testing and Verification

Automated tests will cover:

- Only an owning vendor receives the interactive reply capability.
- Customer, unauthenticated, wrong-owner, and missing-owner states cannot open the dialog.
- Empty/whitespace reply content is rejected and the 1000-character limit is enforced.
- Existing replies start in read-only mode with no new-reply field or button.
- The edit action initializes the draft, cancel restores read-only state, and save uses the edit API path.
- Vendor service clients use the required routes and `{ data: ... }` payload shape.
- A successful mutation reloads review data and preserves the open detail context.

Verification will run the focused mobile Jest tests, TypeScript checks available to the workspace, and the relevant lint command. Existing unrelated worktree changes and known backend development issues will not be modified.

## Known Backend Development Warning

The reply and edit controller endpoints currently use JWT authentication without `VendorGuard`. Service-level location ownership checks still protect the intended persistence path, but explicit role enforcement remains a backend hardening item. The endpoints also do not return the saved reply, which requires the frontend reload described above. These warnings are documented but intentionally not fixed in this frontend scope.

## Out of Scope

- Reply images or videos
- Deleting a vendor reply
- Multiple vendor replies or threaded conversations
- Navigation or route changes for location detail
- Backend guard hardening and unrelated backend cleanup
