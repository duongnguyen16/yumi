# Customer Ownership Promotion Design

## Goal

Allow an active Customer with a verified account phone to claim an unowned
location. Promote a Customer to Vendor only when an Admin approves an ownership
request, either through an existing-location claim or a WDP-19 new-location
ownership registration.

## Scope

- Mobile exposes the claim action to authenticated Customers and Vendors for
  unowned locations.
- `ClaimService` accepts Customers and Vendors while retaining account status
  and phone-verification checks.
- `AdminClaimService` promotes an approved Customer claimant to Vendor.
- `AdminLocationService` promotes an approved Customer submitter to Vendor only
  when the approved WDP-19 request represents an ownership registration.
- Existing `vendorId` persistence fields remain unchanged to avoid a schema
  migration.
- RequestAccess behavior, community contributions, and unrelated role-based UI
  remain outside this change.

## Behavior

### Existing-location claim

1. An authenticated Customer or Vendor opens a published, unowned location.
2. Mobile shows the ownership claim action.
3. The API checks that the requester is a Customer or Vendor, is active, and has
   a verified account phone.
4. Existing listing OTP, on-site proof, duplicate pending-slot, and owner checks
   remain unchanged.
5. Admin approval assigns the location owner to the requester.
6. If the requester is still a Customer, approval changes the role to Vendor.
   Existing Vendors keep their role.
7. Rejection does not change the requester role.

### WDP-19 new-location ownership registration

1. A location request qualifies as an ownership registration only when the
   existing `ownershipRequested` or verification-proof contract says so.
2. Admin approval assigns the location owner to `submittedBy`.
3. If that submitter is still a Customer, approval changes the role to Vendor.
4. A normal community contribution without ownership intent publishes without
   an owner and without changing the submitter role.
5. Rejection does not change the submitter role.

## Error Handling

- Missing, Admin, inactive, or phone-unverified accounts cannot start, verify,
  or submit a claim.
- If the requester account cannot be loaded during approval, the approval
  returns a failure instead of assigning ownership without the corresponding
  role state.
- Existing claim proof, duplicate, owner-conflict, and WDP-19 review-state
  failures retain their current responses.

## Testing

- Claim service regression tests prove a verified active Customer can start and
  submit a claim while Admin, inactive, and unverified accounts remain blocked.
- Admin claim tests prove Customer approval assigns ownership and promotes the
  requester, while Vendor approval does not rewrite the role.
- WDP-19 tests prove ownership-registration approval promotes a Customer and
  community-contribution approval does not.
- Mobile behavior is covered through a small ownership-action policy test that
  distinguishes authenticated Customer/Vendor, guest, owned, and unowned
  locations.
- Focused API and mobile tests run first, followed by API build, mobile type
  checking, and diff validation.
