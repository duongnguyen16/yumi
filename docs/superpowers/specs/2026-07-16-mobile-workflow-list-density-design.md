# Mobile Workflow List Density Design

## Goal

Make the mobile Chuyển quyền, Kháng cáo, and Tranh chấp lists use the available screen width more efficiently while keeping the workflow information readable.

## Design

The three workflow indexes will opt in to one shared compact list presentation. The scroll content will have no horizontal padding or inter-item gap; each row will be full width and separated only by its own surface boundary. The compact row uses an 8px horizontal inset, a 40px icon surface, and the existing compact badge style. Other uses of `ActivityRow`, including notifications, retain their current spacing and badge size.

## Localization

Audit user-visible Vietnamese strings in the mobile application and correct confirmed strings without diacritics. Code identifiers, API values, and English-only developer preview labels are out of scope.

## Verification

Add a focused unit test for the shared compact-list metrics, run the mobile Jest suite, TypeScript checking, and search the mobile UI for confirmed unaccented Vietnamese strings.
