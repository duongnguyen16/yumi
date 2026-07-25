# Ownership Workflows Changes Summary

Tai lieu nay liet ke cac phan da sua trong cac luong dang ky dia diem/vendor, xet duyet, tranh chap va xin chuyen quyen.

## 1. Them co `ownershipRequested` vao schema

File: `apps/api/src/common/schemas/location-request.ts:72`

```ts
@Prop({ type: Boolean, default: false, index: true })
ownershipRequested!: boolean;
```

Y nghia:

- Mac dinh `false` cho cac flow cu/contribution.
- Vendor registration set `true` de Admin approve gan owner dung nguoi gui.

## 2. Vendor registration set ro la phieu xin ownership

File: `apps/api/src/modules/vendor-locations/vendor-locations.service.ts:464`

```ts
ownershipRequested: true,
```

Day la dong duy nhat duoc them trong `vendor-locations.service.ts`; khong sua transaction vendor.

## 3. Admin queue tra co `ownershipRegistration`

File: `apps/api/src/modules/admin/admin-location.service.ts:148`

```ts
ownershipRegistration: this.isOwnershipRegistration(request),
```

Helper fallback cho du lieu cu:

File: `apps/api/src/modules/admin/admin-location.service.ts:681`

```ts
private isOwnershipRegistration(
  req: Pick<Partial<LocationRequest>, 'ownershipRequested' | 'verificationProof'>,
) {
  return (
    req.ownershipRequested === true ||
    Boolean(req.verificationProof?.proofUrls?.length)
  );
}
```

## 4. Admin approve gan owner khi la phieu ownership

File: `apps/api/src/modules/admin/admin-location.service.ts:487`

```ts
const ownershipRegistration = this.isOwnershipRegistration(req);
```

File: `apps/api/src/modules/admin/admin-location.service.ts:503`

```ts
if (ownershipRegistration) {
  location.ownerId = req.submittedBy;
}
```

## 5. Endpoint confirm duplicate theo request

File: `apps/api/src/modules/admin/admin-location.controller.ts:111`

```ts
await this.service.confirmDuplicateRequest(
  id,
  req.user.userId,
  body.reason,
  body.duplicateOfLocationId,
),
```

Web queue doi sang goi bang request id:

File: `apps/web/src/app/(protected)/location-requests/page.tsx:218`

```ts
await confirmDuplicateLocationRequest(
  selected._id,
  reason,
  duplicateOfLocationId,
);
```

## 6. Admin UI hien thi ownership proof va doi label approve

File: `apps/web/src/components/admin/ownership-verification.ts:27`

```ts
request?.ownershipRequested === true || proofUrls.length > 0;
```

File: `apps/web/src/app/(protected)/location-requests/components/LocationRequestDetailDrawer.tsx:160`

```tsx
: flags?.ownershipRegistration
  ? 'Duyệt và gán quyền'
  : 'Duyệt địa điểm'
```

## 7. Request-access verification session

File: `apps/api/src/common/schemas/request-access-verification-session.schema.ts:10`

```ts
export class RequestAccessVerificationSession {
```

TTL index:

File: `apps/api/src/common/schemas/request-access-verification-session.schema.ts:42`

```ts
RequestAccessVerificationSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

DTO bat buoc session khi create/takeover:

File: `apps/api/src/modules/request-access/dto/create-request-access.dto.ts:18`

```ts
@IsMongoId()
verificationSessionId!: string;
```

File: `apps/api/src/modules/request-access/dto/verify-takeover.dto.ts:6`

```ts
@IsMongoId()
verificationSessionId!: string;
```

## 8. Server xac minh evidence va consume session

File: `apps/api/src/modules/request-access/request-access.service.ts:127`

```ts
this.evidenceVerifier.assertValid(
  dto.evidenceFiles,
  loc,
  new Types.ObjectId(userId),
);
```

File: `apps/api/src/modules/request-access/request-access.service.ts:133`

```ts
const verification = await this.verification.consume({
  sessionId: dto.verificationSessionId,
  userId,
  locationId: String(loc._id),
  purpose: 'CREATE',
});
```

Takeover:

File: `apps/api/src/modules/request-access/request-access.service.ts:350`

```ts
const verification = await this.verification.consume({
  sessionId: dto.verificationSessionId,
  userId,
  locationId: String(loc._id),
  purpose: 'TAKEOVER',
  requestAccessId: String(req._id),
});
```

## 9. Kiem URL Supabase ownership media

File: `apps/api/src/modules/images/images.service.ts:227`

```ts
assertOwnedLocationMediaUrl(userId: string | { toString(): string }, url: string) {
```

File: `apps/api/src/modules/request-access/ownership-evidence.service.ts:82`

```ts
this.images.assertOwnedLocationMediaUrl(userId, file.url);
```

## 10. Ownership workflow lock

File: `apps/api/src/modules/request-access/request-access.service.ts:124`

```ts
if (await this.hasOwnershipWorkflowLock(loc._id, new Date())) {
  return this.fail(409, 'Địa điểm đang có quy trình chuyển quyền');
}
```

File: `apps/api/src/modules/request-access/request-access.service.ts:486`

```ts
private async hasOwnershipWorkflowLock(
```

## 11. Dispute link voi appeal va context Admin

File: `apps/api/src/common/schemas/dispute.schema.ts:25`

```ts
appealId?: Types.ObjectId;
```

File: `apps/api/src/modules/appeals/appeal.service.ts:314`

```ts
appealId: appeal._id,
```

File: `apps/api/src/modules/disputes/dispute.service.ts:165`

```ts
context: {
  requestReason: requestAccess?.requestReason,
  ownerResponseReason: requestAccess?.responseReason,
```

## 12. Vendor OTP het han

File: `apps/api/src/modules/auth/auth.service.ts:270`

```ts
if (pending.expires_at.getTime() <= Date.now()) {
  await this.pendingVendorModel.deleteOne({ _id: pending._id });
```

## 13. Product delete bi chan khi ownership hold

File: `apps/api/src/common/ownership/hold.util.ts:5`

```ts
'HIDE_LOCATION' | 'BULK_DELETE_PRODUCTS' | 'EDIT_CORE_INFO' | 'DELETE_PRODUCT';
```

File: `apps/api/src/modules/products/products.service.ts:213`

```ts
assertNotUnderHold(location, 'DELETE_PRODUCT');
```

## Verification

Da chay:

```powershell
npm test --workspace=api -- --runInBand
```

Ket qua:

```text
Test Suites: 36 passed, 36 total
Tests: 149 passed, 149 total
```

