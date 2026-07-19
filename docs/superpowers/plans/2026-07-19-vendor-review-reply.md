# Vendor Review Reply Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an owner-only mobile dialog for creating and editing text replies to location reviews without leaving the current location detail drawer.

**Architecture:** `ReviewTab` owns selection and mutation orchestration, a focused `VendorReviewReplyDialog` renders the centered keyboard-aware experience, and pure helpers define permission, validation, and display modes for deterministic tests. The reply API clients live in `vendorService.ts` and reuse the two backend endpoints already present in the worktree.

**Tech Stack:** Expo 56, React Native 0.85, React 19, React Native Paper 5, TypeScript, Axios, Jest/ts-jest

## Global Constraints

- Only a signed-in user with role `VENDOR` whose normalized ID equals `locationData.ownerId` can open the reply dialog.
- Keep `MapLocationDrawer` mounted and preserve its review scroll position; do not add or change routes.
- The centered dialog must avoid the keyboard on iOS and Android and must dismiss the keyboard when closed.
- Preserve reviewer avatar/name/date/rating/comment and existing review images in the dialog.
- Vendor replies are text-only, trimmed, non-empty, and limited to 1000 characters.
- Existing replies show read-only content and a vertical three-dot edit menu; the create field and create button stay hidden.
- Put both API client functions in `apps/mobile/src/service/vendorService.ts`.
- Do not modify backend guard behavior or unrelated backend development issues.
- Preserve every pre-existing uncommitted worktree change.

---

## File Structure

- Create `apps/mobile/src/components/location/tabs/review-reply-model.ts`: normalized IDs, owner permission, reply validation, and dialog view-mode calculation.
- Create `apps/mobile/src/components/location/tabs/review-reply-model.spec.ts`: permission, validation, and create/read/edit state tests.
- Modify `apps/mobile/src/components/location/tabs/review-composer-keyboard.ts`: platform-aware keyboard avoidance shared by both review dialogs.
- Modify `apps/mobile/src/components/location/tabs/review-composer-keyboard.spec.ts`: iOS/Android behavior tests.
- Modify `apps/mobile/src/service/vendorService.ts`: create and edit reply API clients.
- Create `apps/mobile/src/service/vendorService.spec.ts`: exact route and payload contract tests.
- Create `apps/mobile/src/components/location/tabs/VendorReviewReplyDialog.tsx`: centered review thread, image gallery, reply display/edit menu, composer, and keyboard handling.
- Modify `apps/mobile/src/components/location/tabs/ReviewTab.tsx`: owner-only card interaction, dialog state, API orchestration, and list reconciliation.

---

### Task 1: Reply Permission, Validation, and Dialog State Model

**Files:**
- Create: `apps/mobile/src/components/location/tabs/review-reply-model.spec.ts`
- Create: `apps/mobile/src/components/location/tabs/review-reply-model.ts`
- Modify: `apps/mobile/src/components/location/tabs/review-composer-keyboard.spec.ts`
- Modify: `apps/mobile/src/components/location/tabs/review-composer-keyboard.ts`

**Interfaces:**
- Produces: `canManageReviewReplies(user, ownerId): boolean`
- Produces: `validateReviewReply(content): { content: string; error: string }`
- Produces: `getReviewReplyDialogMode(hasReply, editing): "create" | "read" | "edit"`
- Produces: `getReviewComposerKeyboardBehavior(platform?): "padding" | "height"`

- [ ] **Step 1: Write failing model tests**

```ts
import {
  canManageReviewReplies,
  getReviewReplyDialogMode,
  validateReviewReply,
} from "./review-reply-model";

describe("vendor review reply model", () => {
  it("allows only the vendor who owns the location", () => {
    expect(
      canManageReviewReplies(
        { _id: "vendor-1", role: "VENDOR" },
        { _id: "vendor-1" },
      ),
    ).toBe(true);
    expect(
      canManageReviewReplies(
        { _id: "vendor-2", role: "VENDOR" },
        "vendor-1",
      ),
    ).toBe(false);
    expect(
      canManageReviewReplies(
        { _id: "vendor-1", role: "CUSTOMER" },
        "vendor-1",
      ),
    ).toBe(false);
    expect(canManageReviewReplies(null, "vendor-1")).toBe(false);
    expect(
      canManageReviewReplies({ _id: "vendor-1", role: "VENDOR" }, null),
    ).toBe(false);
  });

  it("trims valid content and rejects empty or oversized content", () => {
    expect(validateReviewReply("  Cảm ơn bạn!  ")).toEqual({
      content: "Cảm ơn bạn!",
      error: "",
    });
    expect(validateReviewReply("   ").error).toBe(
      "Vui lòng nhập nội dung phản hồi.",
    );
    expect(validateReviewReply("a".repeat(1001)).error).toBe(
      "Phản hồi không được vượt quá 1000 ký tự.",
    );
  });

  it("hides create controls for saved replies until edit starts", () => {
    expect(getReviewReplyDialogMode(false, false)).toBe("create");
    expect(getReviewReplyDialogMode(true, false)).toBe("read");
    expect(getReviewReplyDialogMode(true, true)).toBe("edit");
  });
});
```

- [ ] **Step 2: Update keyboard tests before implementation**

```ts
import { getReviewComposerKeyboardBehavior } from "./review-composer-keyboard";

describe("getReviewComposerKeyboardBehavior", () => {
  it("uses padding on iOS", () => {
    expect(getReviewComposerKeyboardBehavior("ios")).toBe("padding");
  });

  it("uses height resizing on Android", () => {
    expect(getReviewComposerKeyboardBehavior("android")).toBe("height");
  });
});
```

- [ ] **Step 3: Run tests and verify RED**

Run:

```powershell
npm test --workspace=mobile -- --runInBand src/components/location/tabs/review-reply-model.spec.ts src/components/location/tabs/review-composer-keyboard.spec.ts
```

Expected: FAIL because `review-reply-model.ts` does not exist and the keyboard helper does not yet accept/branch on a platform.

- [ ] **Step 4: Implement the minimal pure model and keyboard helper**

```ts
// review-reply-model.ts
export type EntityId =
  | string
  | { _id?: string; id?: string }
  | null
  | undefined;

type ReviewReplyUser =
  | { _id?: string; id?: string; role?: string }
  | null
  | undefined;

export function normalizeEntityId(value: EntityId): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id ?? value.id ?? "";
}

export function canManageReviewReplies(
  user: ReviewReplyUser,
  ownerId: EntityId,
): boolean {
  const userId = normalizeEntityId(user);
  const locationOwnerId = normalizeEntityId(ownerId);
  return Boolean(
    user?.role === "VENDOR" &&
      userId &&
      locationOwnerId &&
      userId === locationOwnerId,
  );
}

export function validateReviewReply(content: string): {
  content: string;
  error: string;
} {
  const normalized = content.trim();
  if (!normalized) {
    return { content: "", error: "Vui lòng nhập nội dung phản hồi." };
  }
  if (normalized.length > 1000) {
    return {
      content: normalized,
      error: "Phản hồi không được vượt quá 1000 ký tự.",
    };
  }
  return { content: normalized, error: "" };
}

export function getReviewReplyDialogMode(
  hasReply: boolean,
  editing: boolean,
): "create" | "read" | "edit" {
  if (!hasReply) return "create";
  return editing ? "edit" : "read";
}
```

```ts
// review-composer-keyboard.ts
import { Platform } from "react-native";

export function getReviewComposerKeyboardBehavior(
  platform: string = Platform.OS,
): "padding" | "height" {
  return platform === "ios" ? "padding" : "height";
}
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the Step 3 command again.

Expected: both suites PASS.

- [ ] **Step 6: Commit the model change**

```powershell
git add -- apps/mobile/src/components/location/tabs/review-reply-model.ts apps/mobile/src/components/location/tabs/review-reply-model.spec.ts apps/mobile/src/components/location/tabs/review-composer-keyboard.ts apps/mobile/src/components/location/tabs/review-composer-keyboard.spec.ts
git commit -m "feat(mobile): model vendor review reply states"
```

---

### Task 2: Vendor Reply API Clients

**Files:**
- Create: `apps/mobile/src/service/vendorService.spec.ts`
- Modify: `apps/mobile/src/service/vendorService.ts`

**Interfaces:**
- Produces: `replyReview(reviewId: string, content: string): Promise<VendorReviewMutationResult>`
- Produces: `editReviewReply(reviewId: string, content: string): Promise<VendorReviewMutationResult>`

- [ ] **Step 1: Write failing API contract tests**

```ts
import api from "./aixos";
import { editReviewReply, replyReview } from "./vendorService";

jest.mock("./aixos", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  },
}));

describe("vendor review reply service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("posts a new reply using the backend data envelope", async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { success: true, message: "Trả lời đánh giá thành công" },
    });

    await expect(replyReview("review-1", "Cảm ơn bạn")).resolves.toEqual({
      success: true,
      message: "Trả lời đánh giá thành công",
    });
    expect(api.post).toHaveBeenCalledWith("/location/reply", {
      data: { reviewId: "review-1", content: "Cảm ơn bạn" },
    });
  });

  it("patches an existing reply using the backend data envelope", async () => {
    (api.patch as jest.Mock).mockResolvedValue({
      data: { success: true, message: "Cập nhật phản hồi thành công" },
    });

    await expect(
      editReviewReply("review-1", "Nội dung mới"),
    ).resolves.toEqual({
      success: true,
      message: "Cập nhật phản hồi thành công",
    });
    expect(api.patch).toHaveBeenCalledWith("/location/reply/edit", {
      data: { reviewId: "review-1", content: "Nội dung mới" },
    });
  });
});
```

- [ ] **Step 2: Run the service suite and verify RED**

Run:

```powershell
npm test --workspace=mobile -- --runInBand src/service/vendorService.spec.ts
```

Expected: FAIL because the two functions are not exported.

- [ ] **Step 3: Add the API clients to `vendorService.ts`**

Add this type and the two functions while retaining the existing dashboard functions:

```ts
export type VendorReviewMutationResult = {
  success: boolean;
  message: string;
};

const replyReview = async (
  reviewId: string,
  content: string,
): Promise<VendorReviewMutationResult> => {
  try {
    const response = await api.post("/location/reply", {
      data: { reviewId, content },
    });
    return {
      success: response.data?.success !== false,
      message: response.data?.message || "Đã gửi phản hồi.",
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getVendorError(error, "Không thể gửi phản hồi lúc này."),
    };
  }
};

const editReviewReply = async (
  reviewId: string,
  content: string,
): Promise<VendorReviewMutationResult> => {
  try {
    const response = await api.patch("/location/reply/edit", {
      data: { reviewId, content },
    });
    return {
      success: response.data?.success !== false,
      message: response.data?.message || "Đã cập nhật phản hồi.",
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getVendorError(error, "Không thể cập nhật phản hồi lúc này."),
    };
  }
};
```

Extend the export list to:

```ts
export {
  editReviewReply,
  getDashboardOverview,
  getLocationStats,
  replyReview,
};
```

- [ ] **Step 4: Run the service suite and verify GREEN**

Run the Step 2 command again.

Expected: PASS with both exact route/payload assertions satisfied.

- [ ] **Step 5: Commit the API client change**

```powershell
git add -- apps/mobile/src/service/vendorService.ts apps/mobile/src/service/vendorService.spec.ts
git commit -m "feat(mobile): add vendor review reply clients"
```

---

### Task 3: Centered Vendor Reply Dialog

**Files:**
- Create: `apps/mobile/src/components/location/tabs/VendorReviewReplyDialog.tsx`
- Use: `apps/mobile/src/components/location/tabs/review-reply-model.ts`
- Use: `apps/mobile/src/components/location/tabs/review-composer-keyboard.ts`
- Use: `apps/mobile/src/service/reviewService.ts`

**Interfaces:**
- Consumes: `LocationReview`, dialog mode helper, keyboard behavior helper
- Produces: `VendorReviewReplyDialog(props)` with controlled draft/edit/submit callbacks

- [ ] **Step 1: Extend the RED assertion for read mode visibility**

Add these exported helpers to the imports in `review-reply-model.spec.ts`, then add the test:

```ts
import { getReviewReplyDialogVisibility } from "./review-reply-model";

it("shows only the controls required by each dialog mode", () => {
  expect(getReviewReplyDialogVisibility("create")).toEqual({
    showComposer: true,
    showCreateActions: true,
    showEditActions: false,
    showEditMenu: false,
    showReadReply: false,
  });
  expect(getReviewReplyDialogVisibility("read")).toEqual({
    showComposer: false,
    showCreateActions: false,
    showEditActions: false,
    showEditMenu: true,
    showReadReply: true,
  });
  expect(getReviewReplyDialogVisibility("edit")).toEqual({
    showComposer: true,
    showCreateActions: false,
    showEditActions: true,
    showEditMenu: false,
    showReadReply: false,
  });
});
```

- [ ] **Step 2: Run the model suite and verify RED**

Run:

```powershell
npm test --workspace=mobile -- --runInBand src/components/location/tabs/review-reply-model.spec.ts
```

Expected: FAIL because `getReviewReplyDialogVisibility` is missing.

- [ ] **Step 3: Implement visibility projection**

```ts
export type ReviewReplyDialogMode = "create" | "read" | "edit";

export function getReviewReplyDialogVisibility(mode: ReviewReplyDialogMode) {
  return {
    showComposer: mode === "create" || mode === "edit",
    showCreateActions: mode === "create",
    showEditActions: mode === "edit",
    showEditMenu: mode === "read",
    showReadReply: mode === "read",
  };
}
```

Update `getReviewReplyDialogMode` to return `ReviewReplyDialogMode`.

- [ ] **Step 4: Run the model suite and verify GREEN**

Run the Step 2 command again.

Expected: PASS.

- [ ] **Step 5: Build the controlled dialog component**

Create `VendorReviewReplyDialog.tsx` with these exact props and behaviors:

```ts
type VendorReviewReplyDialogProps = {
  draft: string;
  editing: boolean;
  review: LocationReview | null;
  saving: boolean;
  visible: boolean;
  onCancelEdit: () => void;
  onChangeDraft: (value: string) => void;
  onDismiss: () => void;
  onStartEdit: () => void;
  onSubmit: () => void;
};
```

Implement the component with this source:

```tsx
import type { LocationReview } from "@/service/reviewService";
import { toAbsoluteUrl } from "@/service/url";
import {
  AppText,
  Button,
  IconButton,
  Inline,
  Stack,
  TextArea,
} from "@/ui/components";
import { colors, fontFamily, radius, spacing } from "@/ui/tokens";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  View,
} from "react-native";
import { Avatar, Icon, Menu, Modal, Portal, Surface } from "react-native-paper";
import { getReviewComposerKeyboardBehavior } from "./review-composer-keyboard";
import {
  getReviewReplyDialogMode,
  getReviewReplyDialogVisibility,
} from "./review-reply-model";

type VendorReviewReplyDialogProps = {
  draft: string;
  editing: boolean;
  review: LocationReview | null;
  saving: boolean;
  visible: boolean;
  onCancelEdit: () => void;
  onChangeDraft: (value: string) => void;
  onDismiss: () => void;
  onStartEdit: () => void;
  onSubmit: () => void;
};

export function VendorReviewReplyDialog({
  draft,
  editing,
  review,
  saving,
  visible,
  onCancelEdit,
  onChangeDraft,
  onDismiss,
  onStartEdit,
  onSubmit,
}: VendorReviewReplyDialogProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const hasReply = Boolean(review?.reply?.content);
  const mode = getReviewReplyDialogMode(hasReply, editing);
  const visibility = getReviewReplyDialogVisibility(mode);

  useEffect(() => {
    if (!visible || editing) setMenuVisible(false);
  }, [editing, visible]);

  if (!review) return null;

  const reviewerName = review.user?.fullName?.trim() || "Người dùng";
  const avatarUrl = toAbsoluteUrl(review.user?.avatarUrl);
  const avatarInitial = reviewerName.slice(0, 1).toUpperCase();
  const imageUrls = review.images
    .map((image) => toAbsoluteUrl(image.url))
    .filter((url): url is string => Boolean(url));

  const dismiss = () => {
    if (saving) return;
    Keyboard.dismiss();
    setMenuVisible(false);
    onDismiss();
  };

  const startEdit = () => {
    setMenuVisible(false);
    onStartEdit();
  };

  return (
    <Portal>
      <KeyboardAvoidingView
        behavior={getReviewComposerKeyboardBehavior()}
        pointerEvents="box-none"
        style={{ flex: 1 }}
      >
        <Modal dismissable={!saving} onDismiss={dismiss} visible={visible}>
          <Surface
            elevation={2}
            style={{
              alignSelf: "center",
              backgroundColor: colors.surfaceRaised,
              borderRadius: radius.large,
              maxHeight: "82%",
              padding: spacing[4],
              width: "92%",
            }}
          >
            <Inline style={{ justifyContent: "space-between" }}>
              <AppText variant="title2">Phản hồi đánh giá</AppText>
              <IconButton icon="close" label="Đóng" onPress={dismiss} />
            </Inline>

            <ScrollView
              contentContainerStyle={{ gap: spacing[3], paddingTop: spacing[2] }}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Inline style={{ alignItems: "flex-start" }}>
                {avatarUrl ? (
                  <Avatar.Image
                    accessibilityLabel={`Ảnh đại diện của ${reviewerName}`}
                    size={40}
                    source={{ uri: avatarUrl }}
                  />
                ) : (
                  <Avatar.Text
                    accessibilityLabel={`Ảnh đại diện của ${reviewerName}`}
                    color={colors.textInverse}
                    label={avatarInitial}
                    labelStyle={{ fontFamily: fontFamily.bold }}
                    size={40}
                    style={{ backgroundColor: colors.accentPrimary }}
                  />
                )}
                <Stack gap={spacing[1]} style={{ flex: 1 }}>
                  <Inline gap={spacing[1]}>
                    <AppText variant="headline">{reviewerName}</AppText>
                    <AppText style={{ color: colors.textTertiary }} variant="caption">
                      {formatRelativeDate(review.createdAt)}
                    </AppText>
                  </Inline>
                  <Inline gap={1}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Icon
                        color={
                          index < Math.round(review.rating || 0)
                            ? colors.accentOrange
                            : colors.borderStrong
                        }
                        key={index}
                        size={15}
                        source="star"
                      />
                    ))}
                  </Inline>
                  <AppText variant="body">{review.comment}</AppText>
                </Stack>
              </Inline>

              {imageUrls.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Inline>
                    {imageUrls.map((url) => (
                      <Image
                        contentFit="cover"
                        key={url}
                        source={{ uri: url }}
                        style={{
                          backgroundColor: colors.surfaceMedia,
                          borderRadius: radius.medium,
                          height: 88,
                          width: 88,
                        }}
                      />
                    ))}
                  </Inline>
                </ScrollView>
              ) : null}

              <View
                style={{
                  borderLeftColor: colors.borderSubtle,
                  borderLeftWidth: 2,
                  marginLeft: spacing[4],
                  paddingLeft: spacing[4],
                }}
              >
                {visibility.showReadReply && review.reply ? (
                  <Stack gap={spacing[2]}>
                    <Inline style={{ justifyContent: "space-between" }}>
                      <Stack gap={spacing[1]} style={{ flex: 1 }}>
                        <AppText variant="headline">Phản hồi của chủ địa điểm</AppText>
                        {review.reply.createdAt ? (
                          <AppText
                            style={{ color: colors.textTertiary }}
                            variant="caption"
                          >
                            {formatRelativeDate(review.reply.createdAt)}
                          </AppText>
                        ) : null}
                      </Stack>
                      <Menu
                        anchor={
                          <IconButton
                            icon="dots-vertical"
                            label="Tùy chọn phản hồi"
                            onPress={() => setMenuVisible(true)}
                          />
                        }
                        onDismiss={() => setMenuVisible(false)}
                        visible={menuVisible}
                      >
                        <Menu.Item
                          leadingIcon="pencil-outline"
                          onPress={startEdit}
                          title="Chỉnh sửa phản hồi"
                        />
                      </Menu>
                    </Inline>
                    <AppText variant="body">{review.reply.content}</AppText>
                  </Stack>
                ) : null}

                {visibility.showComposer ? (
                  <Stack gap={spacing[2]}>
                    <TextArea
                      autoFocus
                      disabled={saving}
                      label={
                        mode === "edit"
                          ? "Chỉnh sửa phản hồi"
                          : "Phản hồi của bạn"
                      }
                      maxLength={1000}
                      onChangeText={onChangeDraft}
                      value={draft}
                    />
                    <AppText
                      style={{ color: colors.textTertiary, textAlign: "right" }}
                      variant="caption"
                    >
                      {draft.length}/1000
                    </AppText>
                    <Inline style={{ justifyContent: "flex-end" }}>
                      <Button
                        disabled={saving}
                        label="Hủy"
                        onPress={mode === "edit" ? onCancelEdit : dismiss}
                        variant="tertiary"
                      />
                      <Button
                        disabled={saving}
                        icon={mode === "edit" ? "content-save" : "send"}
                        label={
                          mode === "edit" ? "Lưu thay đổi" : "Gửi phản hồi"
                        }
                        loading={saving}
                        onPress={onSubmit}
                      />
                    </Inline>
                  </Stack>
                ) : null}
              </View>
            </ScrollView>
          </Surface>
        </Modal>
      </KeyboardAvoidingView>
    </Portal>
  );
}

function formatRelativeDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const diffDays = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 86_400_000),
  );
  if (diffDays === 0) return "Hôm nay";
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}
```

- [ ] **Step 6: Verify the dialog compiles with the model tests green**

Run:

```powershell
npm test --workspace=mobile -- --runInBand src/components/location/tabs/review-reply-model.spec.ts src/components/location/tabs/review-composer-keyboard.spec.ts
npx tsc -p apps/mobile/tsconfig.json --noEmit
```

Expected: focused tests PASS. TypeScript reports no new errors in `VendorReviewReplyDialog.tsx`; record any unrelated pre-existing workspace errors separately.

- [ ] **Step 7: Commit the dialog**

```powershell
git add -- apps/mobile/src/components/location/tabs/VendorReviewReplyDialog.tsx apps/mobile/src/components/location/tabs/review-reply-model.ts apps/mobile/src/components/location/tabs/review-reply-model.spec.ts
git commit -m "feat(mobile): add vendor review reply dialog"
```

---

### Task 4: Integrate Owner-Only Reply and Edit Flow into ReviewTab

**Files:**
- Modify: `apps/mobile/src/components/location/tabs/ReviewTab.tsx`
- Use: `apps/mobile/src/components/location/tabs/VendorReviewReplyDialog.tsx`
- Use: `apps/mobile/src/service/vendorService.ts`

**Interfaces:**
- Consumes: `canManageReviewReplies`, `validateReviewReply`, `replyReview`, `editReviewReply`
- Produces: owner-only pressable review cards and mutation/reload orchestration

- [ ] **Step 1: Add a failing orchestration decision test**

Add this helper and test contract to `review-reply-model.spec.ts` before implementing it:

```ts
import { getReviewReplyMutation } from "./review-reply-model";

it("selects create or edit mutation from dialog state", () => {
  expect(getReviewReplyMutation(false)).toBe("create");
  expect(getReviewReplyMutation(true)).toBe("edit");
});
```

- [ ] **Step 2: Run the model suite and verify RED**

Run:

```powershell
npm test --workspace=mobile -- --runInBand src/components/location/tabs/review-reply-model.spec.ts
```

Expected: FAIL because `getReviewReplyMutation` is missing.

- [ ] **Step 3: Implement the orchestration decision**

```ts
export function getReviewReplyMutation(editing: boolean): "create" | "edit" {
  return editing ? "edit" : "create";
}
```

Run the Step 2 command again and expect PASS.

- [ ] **Step 4: Add controlled dialog state and mutation handlers to `ReviewTab`**

Import the dialog, helpers, and vendor service clients. Extend the context user shape with `role?: string`, then add:

```ts
const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
const [replyDraft, setReplyDraft] = useState("");
const [editingReply, setEditingReply] = useState(false);
const [savingReply, setSavingReply] = useState(false);

const canManageReplies = canManageReviewReplies(
  userState?.user,
  locationData?.ownerId,
);
const selectedReview =
  reviews.find((review) => review.id === selectedReviewId) ?? null;

const openReplyDialog = (review: LocationReview) => {
  if (!canManageReplies) return;
  Keyboard.dismiss();
  setSelectedReviewId(review.id);
  setReplyDraft("");
  setEditingReply(false);
};

const closeReplyDialog = () => {
  Keyboard.dismiss();
  setSelectedReviewId(null);
  setReplyDraft("");
  setEditingReply(false);
};

const startReplyEdit = () => {
  if (!selectedReview?.reply?.content) return;
  setReplyDraft(selectedReview.reply.content);
  setEditingReply(true);
};

const cancelReplyEdit = () => {
  Keyboard.dismiss();
  setReplyDraft("");
  setEditingReply(false);
};

const submitVendorReply = async () => {
  if (!selectedReview || savingReply) return;
  const validation = validateReviewReply(replyDraft);
  if (validation.error) {
    setNotice(validation.error);
    return;
  }

  setSavingReply(true);
  try {
    const mutation = getReviewReplyMutation(editingReply);
    const response =
      mutation === "edit"
        ? await editReviewReply(selectedReview.id, validation.content)
        : await replyReview(selectedReview.id, validation.content);
    if (!response.success) {
      setNotice(response.message);
      return;
    }

    setNotice(response.message);
    const optimisticCreatedAt =
      selectedReview.reply?.createdAt ?? new Date().toISOString();
    setReviews((current) =>
      current.map((review) =>
        review.id === selectedReview.id
          ? {
              ...review,
              reply: {
                vendorId: normalizeEntityId(userState?.user),
                content: validation.content,
                createdAt: optimisticCreatedAt,
              },
            }
          : review,
      ),
    );
    setReplyDraft("");
    setEditingReply(false);

    const refreshed = await loadReviews({
      preserveExisting: true,
      showLoading: false,
    });
    if (!refreshed.success) {
      setNotice("Đã lưu phản hồi nhưng chưa thể tải lại danh sách.");
      return;
    }
  } finally {
    setSavingReply(false);
  }
};
```

Replace `loadReviews` with this returning, preserve-on-error version:

```ts
const loadReviews = useCallback(
  async (options?: {
    preserveExisting?: boolean;
    showLoading?: boolean;
  }) => {
    if (!locationId) {
      const unavailable = {
        success: false as const,
        summary: { avgRating: 0, reviewCount: 0 },
        reviews: [],
        message: "Không tìm thấy địa điểm.",
      };
      setLoading(false);
      return unavailable;
    }

    if (options?.showLoading !== false) setLoading(true);
    const response = await getReviewsByLocation(locationId);
    if (response.success) {
      setSummary(response.summary);
      setReviews(response.reviews);
      setErrorMessage("");
    } else {
      if (!options?.preserveExisting) setReviews([]);
      setErrorMessage(response.message);
    }
    setLoading(false);
    return response;
  },
  [locationId],
);
```

- [ ] **Step 5: Make review cards owner-interactive**

Replace the local `ReviewCard` with this owner-aware version:

```tsx
function ReviewCard({
  review,
  canEdit,
  canReply,
  onEdit,
  onDelete,
  onReply,
  deleting,
}: {
  review: LocationReview;
  canEdit: boolean;
  canReply: boolean;
  onEdit: (review: LocationReview) => void;
  onDelete: (review: LocationReview) => void;
  onReply: (review: LocationReview) => void;
  deleting: boolean;
}) {
  const hasReply = Boolean(review.reply?.content);

  return (
    <Pressable
      accessibilityHint={
        canReply ? "Mở hộp thoại phản hồi đánh giá" : undefined
      }
      accessibilityRole={canReply ? "button" : undefined}
      disabled={!canReply}
      onPress={() => onReply(review)}
      style={({ pressed }) => ({ opacity: pressed ? 0.86 : 1 })}
    >
      <Surface
        elevation={0}
        style={{
          backgroundColor: colors.surfaceBase,
          borderRadius: radius.large,
          height: locationReviewCardHeight,
          padding: spacing[4],
          width: 280,
        }}
      >
        <Stack gap={spacing[2]} style={{ flex: 1 }}>
          <Inline style={{ alignItems: "flex-start" }}>
            <Stack gap={spacing[1]} style={{ flex: 1 }}>
              <AppText numberOfLines={1} variant="headline">
                {review.user?.fullName || "Người dùng"}
              </AppText>
              <AppText style={{ color: colors.textTertiary }} variant="caption">
                {formatRelativeDate(review.createdAt)}
              </AppText>
              <StarRating rating={review.rating} size={14} />
            </Stack>
            {canEdit ? (
              <Inline gap={0}>
                <IconButton
                  icon="pencil-outline"
                  label="Sửa"
                  onPress={() => onEdit(review)}
                />
                <IconButton
                  icon="delete-outline"
                  label="Xóa"
                  onPress={() => onDelete(review)}
                />
              </Inline>
            ) : canReply ? (
              <Chip
                icon={hasReply ? "check" : "reply"}
                label={hasReply ? "Đã trả lời" : "Phản hồi"}
              />
            ) : hasReply ? (
              <Chip icon="check" label="Đã trả lời" />
            ) : null}
          </Inline>
          <AppText
            numberOfLines={locationReviewCommentLines}
            style={{ color: colors.textSecondary, opacity: deleting ? 0.5 : 1 }}
            variant="body"
          >
            {review.comment}
          </AppText>
        </Stack>
      </Surface>
    </Pressable>
  );
}
```

Pass `canReply={canManageReplies}` and `onReply={openReplyDialog}` from both embedded and flat-list render paths.

- [ ] **Step 6: Mount the controlled dialog inside the existing screen context**

Render this beside the existing review composer and snackbar without changing routes:

```tsx
<VendorReviewReplyDialog
  draft={replyDraft}
  editing={editingReply}
  onCancelEdit={cancelReplyEdit}
  onChangeDraft={setReplyDraft}
  onDismiss={closeReplyDialog}
  onStartEdit={startReplyEdit}
  onSubmit={() => void submitVendorReply()}
  review={selectedReview}
  saving={savingReply}
  visible={Boolean(selectedReview)}
/>
```

- [ ] **Step 7: Run focused and regression tests**

Run:

```powershell
npm test --workspace=mobile -- --runInBand src/components/location/tabs/review-reply-model.spec.ts src/components/location/tabs/review-composer-keyboard.spec.ts src/service/vendorService.spec.ts src/common/map-location.spec.ts
```

Expected: all selected suites PASS.

- [ ] **Step 8: Run static verification**

Run:

```powershell
npx tsc -p apps/mobile/tsconfig.json --noEmit
npm run lint --workspace=mobile
git diff --check
```

Expected: no new errors in changed files and no whitespace errors. If the full workspace reports pre-existing failures, capture the exact diagnostics and verify the changed files separately.

- [ ] **Step 9: Review the final diff against the spec**

Confirm from the diff that:

- No API/backend files changed during this implementation.
- API calls are located in `vendorService.ts`.
- Non-owner cards do not receive an `onPress` action.
- Read mode renders no text field and no create button.
- Edit mode is reachable only through the vertical three-dot menu.
- Closing the dialog never dismisses `MapLocationDrawer` or navigates away.
- Original review images remain visible while reply media controls are absent.

- [ ] **Step 10: Commit the integration**

```powershell
git add -- apps/mobile/src/components/location/tabs/ReviewTab.tsx
git commit -m "feat(mobile): integrate vendor review replies"
```
