# Banned Appeal Access and Audit Actions

## Scope

Fix two confirmed defects:

1. A banned user cannot access appeals after the pre-ban access token expires.
2. The admin audit filter omits current workflow actions because its options are hardcoded.

Other reported defects and unrelated mobile refactoring remain outside this change.

## Authentication design

Banned users receive an appeal-scoped access and refresh token after valid credential login. The standard JWT strategy rejects appeal-scoped tokens. A dedicated appeal-access strategy accepts both normal and appeal-scoped tokens and is used only by the user appeal endpoints and `auth/me`.

Login and refresh responses expose `appealOnly`. Mobile authentication routes banned users directly to `/appeals`, including restored sessions. Normal users retain the existing token and navigation behavior.

## Audit filter design

The existing audit-log response includes the distinct action values stored in MongoDB. The admin page renders those returned actions instead of maintaining a static list. The options are sorted by the backend for deterministic display and automatically include future workflow actions.

## Error and security behavior

- Invalid credentials remain unauthorized.
- Appeal-scoped tokens cannot call normal protected endpoints.
- Normal access tokens continue to work for appeals.
- Banned users can read, submit, and follow their own appeals but cannot use unrelated authenticated APIs.
- Admin authorization remains unchanged.

## Verification

- Auth service tests cover banned login, banned refresh, and active-user behavior.
- JWT strategy tests cover scoped-token isolation.
- Appeal controller tests or service-level integration verify both normal and scoped access.
- Admin dashboard tests verify distinct audit actions are returned and sorted.
- Mobile navigation tests verify banned users route to appeals and other users route home.
- API, web, and mobile builds and focused tests must pass.
- Chrome verifies the audit dropdown contains appeal, claim, and dispute actions.
