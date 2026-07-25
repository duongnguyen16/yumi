# Edit Location Selection Chip Icons Design

## Goal

Make every selectable chip in the Edit Location and Suggest Edit flows visually communicate whether the option will be added or is already selected.

## Scope

Apply selection icons to:

- Editable field chips at the top of `EditLocationScreen`.
- Suggestion status chips.
- Main category chips.
- Subcategory chips.

The change must remain limited to Edit Location and Suggest Edit. Other screens that use the shared `Chip` or `LocationCategoryFields`, including the contribute-location flow, keep their current appearance.

## Visual Behavior

- An unselected selectable chip displays the Material Community Icons `plus` icon.
- A selected selectable chip displays the Material Community Icons `check` icon.
- Icons update from the same `selected` state that controls each chip's current colors and behavior.
- Labels, colors, spacing, press handlers, and selection rules remain unchanged.

## Component Design

`EditLocationScreen` passes `icon={selected ? "check" : "plus"}` to its editable-field and suggestion-status chips.

`LocationCategoryFields` gains an optional `showSelectionIcons` boolean prop with a default of `false`. When enabled, category and subcategory chips derive their icon from their selected state. `EditLocationScreen` enables this prop; existing consumers do not need to change and retain the icon-free appearance.

The shared `Chip` implementation is not changed.

## Verification

Add focused tests for the selection-icon mapping and the opt-in scope of category-field icons. Run the related Edit Location tests, TypeScript, and lint checks for changed files.

## Non-goals

- No changes to edit permissions, selected-field state, validation, submissions, or APIs.
- No global redesign of chips.
- No changes to non-edit screens.
