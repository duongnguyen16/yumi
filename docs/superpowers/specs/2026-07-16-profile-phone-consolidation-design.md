# Profile Phone Consolidation Design

## Goal

Keep profile phone verification in the Edit Profile screen and prevent a verified phone number from opening or repeating the OTP flow.

## Current finding

The profile tab always navigates its phone row to `/profile/verify-phone`, even when `phoneVerified` is true. The phone verification endpoint sets the persisted `user.phone` and `user.phoneVerified = true` only after the user submits a valid, pending OTP that has not expired.

Avatar upload remains in scope: the mobile picker submits `avatar` as multipart form data, and the API validates JPG/PNG files up to 2 MB, stores them in Supabase, saves the public URL, and removes the previous object.

## Approved behavior

- The profile tab exposes one Edit Profile entry and no separate phone-verification entry.
- Edit Profile displays the saved phone number.
- If `phoneVerified` is true, the phone field is disabled and the screen does not expose OTP actions.
- If `phoneVerified` is false, the phone field is editable. Sending an OTP reveals a six-digit OTP field and resend control; successful verification updates the user context and profile state.
- A Vendor who needs phone verification before location registration is sent to Edit Profile with the registration destination as a redirect. After successful verification, the screen replaces itself with that destination.
- The standalone `/profile/verify-phone` route is removed. All internal destinations target `/profile/edit`.
- Avatar selection stays because its API path is implemented; it is not removed merely because live Supabase credentials were not exercised in this change.

## Constraints

- A verified number is intentionally immutable in this UI, following the user request. This supersedes the older product note that a Vendor may change the number and verify it again.
- Reuse existing `sendProfilePhoneOtp`, `verifyProfilePhoneOtp`, `ProfileEditor`, `TextField`, and notification components.
- Do not alter existing unrelated workspace changes.

## Validation

- Add navigation tests for verified and unverified Vendor registration destinations.
- Run the focused mobile Jest tests, TypeScript checking/linting available to the workspace, and inspect the final diff for removal of standalone phone-verification references.
