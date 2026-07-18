# Mobile Explore Discovery Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Explore map focus, discovery controls, branding, and search result context with real review ratings.

**Architecture:** Keep `MapScreen` as the owner of camera and search transitions, and keep `LocationSearchScreen` as the owner of filtering and result loading. Add a small pure mobile presentation model for testable constants/formatting and a pure API search-pipeline builder for rating aggregation.

**Tech Stack:** Expo Router 56, React Native 0.85, MapLibre React Native, React Native Paper, NestJS, Mongoose, Jest, TypeScript.

## Global Constraints

- Stay on the current branch.
- Add no native dependency.
- Keep the bottom-navigation current-location action as the only manual GPS control.
- Use zoom level `16` for the neighborhood-scale camera.
- Treat distances through `2000` meters as green and distances above `2000` meters as yellow-orange.
- Keep tests outside `apps/mobile/src/app`.

---

### Task 1: Explore presentation behavior

**Files:**
- Create: `apps/mobile/src/components/home/explore-presentation.ts`
- Create: `apps/mobile/src/components/home/explore-presentation.spec.ts`
- Modify: `apps/mobile/src/components/home/MapScreen.tsx`
- Modify: `apps/mobile/src/ui/components/map.tsx`
- Modify: `apps/mobile/src/components/location/LocationSearchScreen.tsx`

**Interfaces:**
- Produces: `EXPLORE_NEARBY_ZOOM`, `getDistanceTone(distanceMeters)`, and `getSearchRating(rating)`.
- Consumes: active categories from `getAllCategories()` and the existing `LocationSearchScreen` filtering flow.

- [ ] **Step 1: Write the failing presentation-model tests**

Cover zoom `16`, green at `0` and `2000`, yellow above `2000`, and numeric rating normalization with a zero fallback.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test --workspace=mobile -- --runInBand src/components/home/explore-presentation.spec.ts`

Expected: FAIL because `explore-presentation.ts` does not exist.

- [ ] **Step 3: Add the minimal presentation model**

Export the zoom constant, distance-tone helper, and rating-normalization helper using existing `colors` tokens.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npm test --workspace=mobile -- --runInBand src/components/home/explore-presentation.spec.ts`

Expected: PASS.

- [ ] **Step 5: Wire the Explore and search UI**

Use zoom `16` in both camera entry points, load active categories in `MapScreen`, render map-only category chips below `MapSearchDock`, pass the selected category into `LocationSearchScreen`, add cream edge fades, split the `Yumi` wordmark into serif `Yu` and accent `mi`, and render rating plus distance tones in `LocationSearchResult`.

- [ ] **Step 6: Run focused mobile tests**

Run: `npm test --workspace=mobile -- --runInBand src/components/home/explore-presentation.spec.ts src/components/location/search-model.spec.ts`

Expected: PASS.

### Task 2: Search rating aggregation

**Files:**
- Create: `apps/api/src/modules/locations/location-search.ts`
- Create: `apps/api/src/modules/locations/location-search.spec.ts`
- Modify: `apps/api/src/modules/locations/location.service.ts`

**Interfaces:**
- Produces: `buildLocationSearchPipeline({ filter, lng, lat, skip, limit })`.
- Consumes: the existing published-location filter and `ReviewStatus.PUBLISHED`.

- [ ] **Step 1: Write the failing pipeline test**

Assert that the pipeline performs `$geoNear`, joins `reviews`, filters joined reviews to `PUBLISHED`, computes average/count, outputs `rating`, and preserves the existing paginated facet.

- [ ] **Step 2: Run the focused API test and verify RED**

Run: `npm test --workspace=api -- --runInBand src/modules/locations/location-search.spec.ts`

Expected: FAIL because `location-search.ts` does not exist.

- [ ] **Step 3: Add the pipeline builder and use it**

Move only the aggregation pipeline construction into the helper and pass it to `locationModel.aggregate()` from `searchLocation`.

- [ ] **Step 4: Run the focused API test and verify GREEN**

Run: `npm test --workspace=api -- --runInBand src/modules/locations/location-search.spec.ts`

Expected: PASS.

### Task 3: Verification

**Files:**
- Verify all files changed by Tasks 1 and 2.

**Interfaces:**
- Consumes: all production and test changes.
- Produces: fresh verification evidence.

- [ ] **Step 1: Run the mobile suite**

Run: `npm test --workspace=mobile -- --runInBand`

Expected: all suites pass.

- [ ] **Step 2: Run mobile TypeScript**

Run: `npx tsc --noEmit -p apps/mobile/tsconfig.json`

Expected: exit code `0`.

- [ ] **Step 3: Run the API suite and TypeScript**

Run: `npm test --workspace=api -- --runInBand`

Run: `npx tsc --noEmit -p apps/api/tsconfig.json`

Expected: all suites pass and both commands exit `0`.

- [ ] **Step 4: Inspect the patch**

Run: `git diff --check`

Run: `git status --short`

Expected: no whitespace errors; pre-existing `.env` and `feedback.tsx` changes remain untouched.
