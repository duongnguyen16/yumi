# Customer Ownership Workflows Design

## Goal

Allow active, phone-verified Customer accounts to use every ownership-acquisition workflow currently available to Vendors while preserving the existing management experience after ownership is granted.

## Scope

- Claim continues to accept Customer and Vendor accounts.
- Request Access accepts Customer and Vendor accounts.
- Appeal and Dispute remain authorized by affected-user and participant IDs rather than role.
- A Customer becomes a Vendor only when ownership is actually assigned through Claim approval, location-registration approval, Request Access grant or automatic takeover, or Dispute transfer.
- Vendor-only product, review-reply, dashboard, and location-management endpoints remain unchanged because a successful Customer owner is promoted before using them.

## Backend Behavior

Request Access eligibility accepts only `CUSTOMER` or `VENDOR`, requires `ACTIVE`, and keeps the existing phone-verification requirement. Invalid roles, inactive accounts, and unverified phones remain forbidden.

When Request Access changes `location.ownerId` to the requester, the service promotes a Customer requester to Vendor before returning success. Both owner-approved and automatic-takeover paths share the same transfer helper.

Dispute access and evidence submission continue to use participant IDs. When an Admin resolves a Dispute with `TRANSFER`, the service promotes Vendor B if that user is still a Customer. `KEEP` and `REVOKE` do not change roles.

## Mobile Behavior

The location detail screen continues to expose Claim for Customer or Vendor accounts when a location has no owner and Request Access to any authenticated non-owner when a location has an owner. Appeal and Dispute screens do not add role gates.

The Account workflow section exposes Request Access, Appeals, and Ownership Disputes to both Customer and Vendor accounts. Vendor-only location management remains role-gated.

The role returned by a later profile refresh controls the existing Vendor management navigation after ownership is assigned. No new Customer-only management route is introduced.

## Verification

- Request Access service tests prove an active, phone-verified Customer can create a request.
- Request Access service tests prove both grant paths promote a Customer requester.
- Dispute service tests prove Customer participants retain access and `TRANSFER` promotes the new owner.
- Existing role, status, phone verification, participant, state-machine, notification, and audit tests remain green.
- API focused tests, API full tests, API build, mobile focused tests, and mobile TypeScript checks pass.
