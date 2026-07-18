# Map Drawer Location Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the authenticated location-report workflow inside the Explore map’s location-detail drawer.

**Architecture:** Keep eligibility, available reasons, and validation in a pure location-report model so they receive fast, mock-free Jest coverage. `LocationReportSheet` owns only report-form state, image selection/upload, API submission, and feedback; `MapLocationDrawer` remains responsible only for opening that sheet from its stable action strip.

**Tech Stack:** Expo Router, React Native, React Native Paper, Expo Image Picker, TypeScript, Jest, existing Axios report service.

## Global Constraints

- Preserve all unrelated, currently uncommitted Explore/map edits.
- The report action is hidden for the location owner, opens sign-in for a guest, and opens the composer for another authenticated user.
- Submit only `IMAGE` evidence accepted by `POST /locations/:locationId/reports`; a wrong-owner report requires at least one evidence image.
- The API remains authoritative for banned accounts, duplicate pending reports, ownership checks, and report routing.
- Use Vietnamese copy and existing shared mobile UI primitives.

---

### Task 1: Define the report action and validation model

**Files:**
- Create: `apps/mobile/src/components/location/location-report.ts`
- Create: `apps/mobile/src/components/location/location-report.spec.ts`

**Interfaces:**
- Produces: `getLocationReportAction({ locationId, ownerId, userId }): "hidden" | "authenticate" | "compose"`.
- Produces: `getLocationReportReasons(hasOwner): Array<{ label: string; value: LocationReportReason }>`.
- Produces: `validateLocationReport({ reason, description, evidenceCount }): string | null`.
- Consumes: `LocationReportReason` from `@/service/locationReportService`.

- [ ] **Step 1: Write the failing tests**

```ts
import {
  getLocationReportAction,
  getLocationReportReasons,
  validateLocationReport,
} from "./location-report";

describe("getLocationReportAction", () => {
  it("hides reporting for the location owner", () => {
    expect(getLocationReportAction({ locationId: "location-1", ownerId: "owner-1", userId: "owner-1" })).toBe("hidden");
  });

  it("requires sign-in for a guest and opens the composer for another user", () => {
    expect(getLocationReportAction({ locationId: "location-1", ownerId: "owner-1", userId: "" })).toBe("authenticate");
    expect(getLocationReportAction({ locationId: "location-1", ownerId: "owner-1", userId: "user-2" })).toBe("compose");
  });

  it("does not expose a report action without a location id", () => {
    expect(getLocationReportAction({ locationId: "", ownerId: "owner-1", userId: "user-2" })).toBe("hidden");
  });
});

describe("location report validation", () => {
  it("omits wrong-owner when the location has no owner", () => {
    expect(getLocationReportReasons(false).map((reason) => reason.value)).not.toContain("WRONG_OWNER");
  });

  it("requires a valid description and wrong-owner evidence", () => {
    expect(validateLocationReport({ reason: "SPAM", description: "ngắn", evidenceCount: 0 })).toBe("Mô tả báo cáo cần từ 10 đến 1000 ký tự.");
    expect(validateLocationReport({ reason: "WRONG_OWNER", description: "Chủ sở hữu hiện tại không đúng.", evidenceCount: 0 })).toBe("Báo cáo chủ sở hữu sai cần ít nhất 1 ảnh bằng chứng.");
    expect(validateLocationReport({ reason: "WRONG_OWNER", description: "Chủ sở hữu hiện tại không đúng.", evidenceCount: 1 })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `rtk npm test --workspace=mobile -- location-report.spec.ts --runInBand`

Expected: FAIL because `./location-report` does not exist.

- [ ] **Step 3: Write the minimal model implementation**

```ts
import type { LocationReportReason } from "@/service/locationReportService";

type ReportActionInput = { locationId?: string; ownerId?: string; userId?: string };
type ReportValidationInput = { reason: LocationReportReason; description: string; evidenceCount: number };

const reportReasons: Array<{ label: string; value: LocationReportReason }> = [
  { label: "Sai thông tin", value: "INCORRECT_INFORMATION" },
  { label: "Spam", value: "SPAM" },
  { label: "Đã đóng cửa", value: "PERMANENTLY_CLOSED" },
  { label: "Khác", value: "OTHER" },
];

export function getLocationReportAction({ locationId, ownerId, userId }: ReportActionInput) {
  if (!locationId || (ownerId && ownerId === userId)) return "hidden" as const;
  return userId ? "compose" as const : "authenticate" as const;
}

export function getLocationReportReasons(hasOwner: boolean) {
  return hasOwner
    ? [...reportReasons.slice(0, 3), { label: "Chủ sở hữu sai", value: "WRONG_OWNER" as const }, reportReasons[3]]
    : reportReasons;
}

export function validateLocationReport({ reason, description, evidenceCount }: ReportValidationInput) {
  const length = description.trim().length;
  if (length < 10 || length > 1000) return "Mô tả báo cáo cần từ 10 đến 1000 ký tự.";
  if (reason === "WRONG_OWNER" && evidenceCount === 0) return "Báo cáo chủ sở hữu sai cần ít nhất 1 ảnh bằng chứng.";
  return null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `rtk npm test --workspace=mobile -- location-report.spec.ts --runInBand`

Expected: PASS with the model tests green.

- [ ] **Step 5: Commit the model**

```bash
rtk git add apps/mobile/src/components/location/location-report.ts apps/mobile/src/components/location/location-report.spec.ts
rtk git commit -m "feat: model location report actions"
```

### Task 2: Restore the report composer in the map drawer

**Files:**
- Create: `apps/mobile/src/components/location/LocationReportSheet.tsx`
- Modify: `apps/mobile/src/components/home/MapLocationDrawer.tsx`

**Interfaces:**
- Consumes: `getLocationReportReasons` and `validateLocationReport` from `location-report.ts`.
- Consumes: `reportLocation(locationId, { reason, description, evidence })` and `uploadContributionImage(image)`.
- Produces: `LocationReportSheet({ locationId, hasOwner, visible, onDismiss }): JSX.Element`.
- Uses: `getLocationReportAction` to decide whether the drawer action hides, navigates to `/auth/login`, or opens the sheet.

- [ ] **Step 1: Implement the sheet and wire the action strip**

Create `LocationReportSheet.tsx` with this public shape and behavior:

```tsx
export function LocationReportSheet({ locationId, hasOwner, visible, onDismiss }: {
  locationId: string;
  hasOwner: boolean;
  visible: boolean;
  onDismiss: () => void;
}) {
  const [reason, setReason] = useState<LocationReportReason>("INCORRECT_INFORMATION");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<SelectedReportImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const submit = async () => {
    const error = validateLocationReport({ reason, description, evidenceCount: images.length });
    if (error) return setNotice(error);
    setSubmitting(true);
    try {
      const evidence = await Promise.all(images.map(async ({ id, ...image }) => ({
        url: await uploadContributionImage(image), fileType: "IMAGE" as const, capturedAt: image.capturedAt,
      })));
      const response = await reportLocation(locationId, { reason, description: description.trim(), evidence });
      if (!response.success) return setNotice(response.message);
      setReason("INCORRECT_INFORMATION");
      setDescription("");
      setImages([]);
      onDismiss();
      setNotice(response.message);
    } catch {
      setNotice("Không thể gửi báo cáo địa điểm lúc này.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Portal>
      <Modal dismissable={!submitting} onDismiss={onDismiss} visible={visible}>
        <BottomSheet style={{ maxHeight: "88%" }}>
          <AppText variant="title2">Báo cáo địa điểm</AppText>
          <ScrollView keyboardShouldPersistTaps="handled">
            <RadioButton.Group onValueChange={(value) => setReason(value as LocationReportReason)} value={reason}>
              {getLocationReportReasons(hasOwner).map((item) => <RadioButton.Item key={item.value} label={item.label} value={item.value} />)}
            </RadioButton.Group>
            <TextArea disabled={submitting} label="Mô tả" onChangeText={setDescription} value={description} />
            <AppText variant="headline">Ảnh bằng chứng ({images.length}/5)</AppText>
            <Button disabled={submitting || images.length === 5} icon="image-plus" label="Thêm ảnh" onPress={pickImages} variant="secondary" />
            <Inline>{images.map((image) => <Pressable key={image.id} onPress={() => removeImage(image.id)}><Image source={{ uri: image.uri }} style={{ height: 72, width: 72 }} /></Pressable>)}</Inline>
          </ScrollView>
          <Inline style={{ justifyContent: "flex-end" }}>
            <Button disabled={submitting} label="Hủy" onPress={onDismiss} variant="tertiary" />
            <Button disabled={submitting} icon="send" label="Gửi báo cáo" loading={submitting} onPress={() => void submit()} variant="destructive" />
          </Inline>
        </BottomSheet>
      </Modal>
      <NoticeSnackbar message={notice} onDismiss={() => setNotice("")} />
    </Portal>
  );
}
```

Use `ImagePicker.requestMediaLibraryPermissionsAsync()` followed by `launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: remainingSlots, quality: 0.85 })`. Convert each asset to `PendingContributionImage` with its `uri`, a stable fallback file name, MIME type fallback `image/jpeg`, a positive `fileSize` fallback, and `capturedAt`. Render local thumbnails with `expo-image`, remove buttons, and the label `Ảnh bằng chứng (n/5)`.

In `MapLocationDrawer.tsx`, derive string identifiers with the same object-or-string normalization already used by `LocationManagementActions`, add `reportVisible` state, and place this action after `Chỉ đường` in the fixed action strip:

```tsx
{reportAction !== "hidden" ? (
  <Button
    icon="flag-outline"
    label="Báo cáo"
    onPress={() => {
      if (reportAction === "authenticate") router.push("/auth/login");
      else setReportVisible(true);
    }}
    variant="destructive"
  />
) : null}
<LocationReportSheet
  hasOwner={Boolean(ownerId)}
  locationId={current._id ?? current.id}
  onDismiss={() => setReportVisible(false)}
  visible={reportVisible}
/>
```

- [ ] **Step 2: Run the focused test to verify it stays green**

Run: `rtk npm test --workspace=mobile -- location-report.spec.ts --runInBand`

Expected: PASS with all report eligibility and validation cases green.

- [ ] **Step 3: Type-check the mobile project**

Run: `rtk npx tsc --noEmit -p apps/mobile/tsconfig.json`

Expected: no new errors from `LocationReportSheet`, `location-report`, or `MapLocationDrawer`; report unrelated pre-existing errors separately if present.

- [ ] **Step 4: Commit the drawer restoration**

```bash
rtk git add apps/mobile/src/components/location/LocationReportSheet.tsx apps/mobile/src/components/home/MapLocationDrawer.tsx apps/mobile/src/components/location/location-report.spec.ts
rtk git commit -m "feat: restore location reporting in map drawer"
```

### Task 3: Verify the complete mobile behavior

**Files:**
- Verify: `apps/mobile/src/components/location/location-report.spec.ts`
- Verify: `apps/mobile/src/components/home/MapLocationDrawer.tsx`
- Verify: `apps/mobile/src/components/location/LocationReportSheet.tsx`

**Interfaces:**
- Verifies the public component and API integration from Task 2.

- [ ] **Step 1: Run the complete targeted test set**

Run: `rtk npm test --workspace=mobile -- location-report.spec.ts map-location.spec.ts contributePlaceService.spec.ts --runInBand`

Expected: PASS; drawer helpers and upload behavior remain green.

- [ ] **Step 2: Inspect the final diff for scope and whitespace**

Run: `rtk git diff --check && rtk git diff -- apps/mobile/src/components/home/MapLocationDrawer.tsx apps/mobile/src/components/location/LocationReportSheet.tsx apps/mobile/src/components/location/location-report.ts apps/mobile/src/components/location/location-report.spec.ts`

Expected: no whitespace errors and no unrelated user changes staged or modified by this feature.

- [ ] **Step 3: Manually verify the Expo Go flow**

Run: `rtk npm run start --workspace=mobile`

Expected: the Explore map displays the flag for a guest and opens login; displays the composer for a non-owner; hides it for the owner; blocks a short description and a wrong-owner report without evidence; accepts up to five evidence images; surfaces the API success/error message.

- [ ] **Step 4: Report verification evidence**

Report the focused Jest and TypeScript results, whether Expo Go verification was available, and any unrelated failures without claiming them fixed.
