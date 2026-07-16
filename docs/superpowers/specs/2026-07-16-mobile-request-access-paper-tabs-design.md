# Mobile Request Access Paper Tabs Design

## Goal

Replace the custom segmented selector on the request-access list with Material top tabs from the installed `react-native-paper-tabs` package.

## Design

The screen keeps its existing navigation bar and routes. A `TabsProvider` and fixed `Tabs` render two swipeable `TabScreen` pages: "Tôi nhận" and "Tôi gửi". Each page owns its request data, loading, refresh, empty, and error states so swiping never displays data from the other side.

The header uses sentence case, the updated Paper theme, the app surface color, and the current font tokens. Existing `ActivityRow`, `EmptyState`, and request detail navigation remain unchanged.

## Constraints

Do not change branches or create commits. Do not modify APIs or shared tab components.
