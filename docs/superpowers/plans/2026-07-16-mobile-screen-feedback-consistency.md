# Mobile Screen and Feedback Consistency Plan

## Goal

Replace modal phone verification with a dedicated screen, standardize transient feedback with React Native Paper Snackbars, and make headers and primary actions consistent across mobile forms.

## Tasks

1. Add shared notice-message normalization, Snackbar, bottom action, and left-aligned navigation primitives with regression tests.
2. Add `/profile/verify-phone`, migrate profile and map entry points, and remove the phone verification modal.
3. Refactor login, registration, password recovery, and profile editing so primary actions remain at the safe-area bottom and failures use Snackbars.
4. Migrate contribution and workflow request feedback from response labels or native result dialogs to Snackbars while retaining destructive confirmation dialogs.
5. Remove duplicate page headers and ensure contribution and all pushed screens use the shared back-title top bar.
6. Run focused Jest tests, TypeScript, and lint for the mobile workspace.
