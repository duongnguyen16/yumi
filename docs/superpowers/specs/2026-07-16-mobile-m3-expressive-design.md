# Mobile M3 Expressive Design

## Direction

The mobile app uses a light-only M3 Expressive system derived from the supplied shadcn palette. The warm off-white background, clay primary color, muted stone surfaces, and dark olive typography replace the previous orange and cool gray system. Google Sans Flex becomes the global variable typeface.

## Role-aware navigation

- Customers see Explore, Saved, and Account. Location contribution moves to Account settings and is removed from the Explore FAB.
- Vendors see Explore, Manage, and Account. Manage opens the vendor dashboard and location management tools.
- Notifications are removed from bottom navigation for all roles and become an icon action beside the Explore search field.
- The bottom navigation is an opaque floating capsule inset from the screen edges and bottom safe area. The selected destination uses a wider tonal segment; unselected destinations remain compact.

## Explore

The search field and notification action share one safe-area-aware top dock. The search field grows to available width while the notification icon stays compact. The vendor Explore FAB uses the palette primary color; customers only retain the current-location control.

## Components and forms

Cards are reserved for summaries, grouped rows, and elevated spatial controls. Forms use plain vertical sections on the page background with labels and supporting text outside fields. Fields use filled tonal surfaces, larger continuous corners, and no wrapping card. Icon actions replace text actions when their meaning is standard, including back, close, edit, camera, and delete.

## Account

The account overview uses an asymmetric identity surface with a large avatar, name, verification state, email, and role. Editing moves to a dedicated `/profile/edit` screen. Language and theme rows are removed while they have no alternative choices. Customers receive a contribution entry; vendors receive management shortcuts.

## Palette mapping

- Background: `rgb(250, 249, 245)`
- Foreground: `rgb(61, 57, 41)`
- Surface: `rgb(245, 244, 239)`
- Primary: `rgb(201, 100, 66)`
- Secondary/muted: `rgb(233, 230, 220)` and `rgb(237, 233, 222)`
- Border: `rgb(218, 217, 212)`
- Input outline: `rgb(180, 178, 167)`
- Destructive: `rgb(20, 20, 19)`

Dark palette values are intentionally ignored because the product remains light-only.

