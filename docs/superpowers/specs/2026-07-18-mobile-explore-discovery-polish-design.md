# Mobile Explore Discovery Polish Design

## Goal

Make Explore open around the user's current position at a neighborhood-scale zoom, improve map depth and discovery, and make search results more informative.

## Interaction design

- Explore uses zoom level `16` for its initial user-centered camera and for the existing bottom-navigation location action. This approximates the requested 500 m neighborhood context without adding a scale control.
- Active top-level categories appear in one horizontal row below the Explore top bar. Tapping a category opens the existing search experience, focuses the search input, preselects that category, and immediately searches even when the text query is empty.
- The existing bottom-navigation location action remains the only manual current-location control.
- Search keeps its existing category and subcategory filtering, pagination, loading, empty, and error behavior.

## Visual design

- Non-interactive cream fades sit over the top and bottom map edges. Each fade is made from a few translucent surface-colored layers so it works consistently without a new native or gradient dependency.
- The centered wordmark becomes larger and serif-styled. `Yu` uses the primary text color and `mi` uses the primary accent.
- Search results display a compact five-star row, the numeric average, and the review count when available.
- Distance is green through 2 km and yellow-orange above 2 km.

## Data design

- The location search aggregation joins published reviews, computes `avgRating` and `reviewCount`, and returns them under `rating`.
- Mobile result types accept the same `rating` object already used by location details and bookmarks.
- Pure helpers own the Explore zoom constant, distance color selection, and rating normalization so the behavior can be covered by focused tests outside Expo Router routes.

## Failure behavior

- If categories fail to load, Explore still renders and search remains available through the search icon.
- If ratings are absent, the result shows an unrated five-star row with `0.0`; no extra request is made per result.
- Location permission or lookup failures preserve the existing fallback/error behavior.

## Verification

- Focused mobile unit tests cover zoom, distance color, rating normalization, and category-based search eligibility.
- A focused API unit test covers the rating lookup and output shape in the aggregation pipeline.
- Run the mobile test suite, mobile TypeScript check, API tests/type check, and `git diff --check`.
