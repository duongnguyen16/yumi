# Vendor Review Reply Card Footer Design

## Goal

Keep the vendor reply actions visible at the bottom of the reply card while the review content and reply composer scroll independently.

## Scope

Update `VendorReviewReplyDialog` only. Preserve the current reply, edit, dismiss, loading, disabled, keyboard, and image-preview behavior.

## Layout

The dialog card has three vertical regions:

1. The existing header with the title and close button.
2. A flexible `ScrollView` containing the review details, images, existing reply, and reply input with its character count.
3. A footer outside the `ScrollView` containing the cancel and submit buttons.

The footer is rendered only when the dialog is in create or edit mode. Read-only mode does not render an empty footer.

The scroll region must be allowed to shrink within the card's existing maximum height so that the footer remains visible. The footer uses normal document flow rather than absolute positioning, preventing it from covering the input or requiring hard-coded content padding.

## Interaction

- Cancel keeps the existing behavior: cancel editing in edit mode and dismiss the dialog in create mode.
- Submit keeps the existing label, icon, loading state, disabled state, and handler.
- The keyboard-avoidance behavior remains unchanged.
- Scrolling affects only the review/composer region, never the footer actions.

## Verification

Add a focused structural regression test that verifies the action footer is outside the vertical `ScrollView` and remains conditional on composer visibility. Run the focused mobile tests and TypeScript/lint checks available for the workspace.

## Non-goals

- No API, service, reply-model, or data-flow changes.
- No redesign of the header, review content, input, or buttons.
- No unrelated component extraction or styling refactor.
