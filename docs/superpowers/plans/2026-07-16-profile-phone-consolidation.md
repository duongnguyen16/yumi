# Profile Phone Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate phone verification into Edit Profile and make verified phone numbers immutable in the mobile UI.

**Architecture:** `ProfileEditor` owns the edit and inline OTP state. The profile tab becomes a single entry point, while `getVendorRegistrationDestination` sends unverified Vendors to Edit Profile with a redirect parameter. The existing users API remains the source of truth for phone verification and avatar upload.

**Tech Stack:** Expo Router, React Native, React Native Paper, Jest, NestJS users API, Supabase Storage.

## Global Constraints

- Keep avatar selection because mobile-to-Supabase avatar upload is implemented.
- A `phoneVerified === true` user must not be offered phone or OTP edits.
- Preserve the unverified Vendor redirect to `/contribute?type=register` after OTP success.
- Do not stage unrelated existing workspace changes.

---

### Task 1: Cover the new Vendor verification destination

**Files:**
- Modify: `apps/mobile/src/navigation/authDestination.ts`
- Modify: `apps/mobile/src/navigation/authDestination.spec.ts`

**Interfaces:**
- Consumes: `phoneVerified: boolean`.
- Produces: `getVendorRegistrationDestination(phoneVerified)` returning `/contribute` for verified users or `/profile/edit` with `redirect` for unverified users.

- [ ] **Step 1: Write the failing test**

```ts
it("opens Edit Profile and preserves the registration destination for an unverified phone", () => {
  expect(getVendorRegistrationDestination(false)).toEqual({
    pathname: "/profile/edit",
    params: { redirect: "/contribute?type=register" },
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk npm test --workspace=mobile -- authDestination.spec.ts --runInBand`

Expected: FAIL because the destination remains `/profile/verify-phone`.

- [ ] **Step 3: Write minimal implementation**

```ts
return phoneVerified
  ? { pathname: "/contribute", params: { type: "register" } }
  : { pathname: "/profile/edit", params: { redirect: "/contribute?type=register" } };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `rtk npm test --workspace=mobile -- authDestination.spec.ts --runInBand`

Expected: PASS with both verified and unverified destination assertions.

### Task 2: Merge OTP handling into Edit Profile

**Files:**
- Modify: `apps/mobile/src/components/profile/profile-editor.tsx`
- Modify: `apps/mobile/src/app/profile/edit.tsx`
- Delete: `apps/mobile/src/app/profile/verify-phone.tsx`

**Interfaces:**
- Consumes: `sendProfilePhoneOtp(phone)`, `verifyProfilePhoneOtp(otp)`, `redirect?: string` route parameter.
- Produces: an Edit Profile screen that locks verified phone numbers and redirects after successful verification when requested.

- [ ] **Step 1: Write the failing test**

```ts
expect(readFileSync("src/app/profile/verify-phone.tsx", "utf8")).toBeUndefined();
expect(readFileSync("src/components/profile/profile-editor.tsx", "utf8"))
  .toContain("phoneVerified");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk npm test --workspace=mobile -- profile-phone-consolidation.spec.ts --runInBand`

Expected: FAIL because the standalone file exists and the editor has no phone verification state.

- [ ] **Step 3: Write minimal implementation**

```tsx
<TextField disabled={saving || phoneVerified} label="Số điện thoại" value={phone} onChangeText={setPhone} />
{!phoneVerified && otpSent ? <TextField label="Mã OTP" value={otp} onChangeText={setOtp} /> : null}
{!phoneVerified ? <Button label={otpSent ? "Xác minh OTP" : "Gửi mã OTP"} onPress={otpSent ? verifyOtp : sendOtp} /> : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `rtk npm test --workspace=mobile -- profile-phone-consolidation.spec.ts --runInBand`

Expected: PASS with the standalone route absent and the merged editor behavior present.

### Task 3: Remove the ambiguous profile entry and verify the app

**Files:**
- Modify: `apps/mobile/src/app/(tabs)/profile.tsx`
- Modify: `apps/mobile/src/components/profile/profile-editor.tsx`
- Test: `apps/mobile/src/navigation/authDestination.spec.ts`

**Interfaces:**
- Consumes: the consolidated Edit Profile route.
- Produces: one profile-management row, without a tappable verified-phone row.

- [ ] **Step 1: Write the failing test**

```ts
expect(readFileSync("src/app/(tabs)/profile.tsx", "utf8"))
  .not.toContain('router.push("/profile/verify-phone")');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk npm test --workspace=mobile -- profile-phone-consolidation.spec.ts --runInBand`

Expected: FAIL because the profile tab still exposes the separate route.

- [ ] **Step 3: Write minimal implementation**

```tsx
<ListRow
  icon="account-edit-outline"
  label="Chỉnh sửa hồ sơ"
  onPress={() => router.push("/profile/edit")}
  supportingText="Tên hiển thị, ảnh đại diện và số điện thoại"
/>
```

- [ ] **Step 4: Run verification**

Run: `rtk npm test --workspace=mobile -- authDestination.spec.ts --runInBand && rtk npm run lint --workspace=mobile`

Expected: Jest passes and Expo lint completes without errors.
