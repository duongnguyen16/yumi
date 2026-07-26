export type EntityId =
  | string
  | { _id?: string; id?: string }
  | null
  | undefined;

export type ReviewReplyDialogMode = "create" | "read" | "edit";

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

export function canOpenReviewReply(
  canCreateReply: boolean,
  hasReply: boolean,
): boolean {
  return canCreateReply || hasReply;
}

export function canEditReviewReply(
  user: ReviewReplyUser,
  replyVendorId: EntityId,
): boolean {
  const userId = normalizeEntityId(user);
  const vendorId = normalizeEntityId(replyVendorId);

  return Boolean(
    user?.role === "VENDOR" &&
      userId &&
      vendorId &&
      userId === vendorId,
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
): ReviewReplyDialogMode {
  if (!hasReply) return "create";
  return editing ? "edit" : "read";
}

export function getReviewReplyDialogVisibility(
  mode: ReviewReplyDialogMode,
  canEditReply: boolean,
) {
  return {
    showComposer: mode === "create" || mode === "edit",
    showCreateActions: mode === "create",
    showEditActions: mode === "edit",
    showEditMenu: mode === "read" && canEditReply,
    showReadReply: mode === "read",
  };
}

export function getReviewReplyMutation(editing: boolean): "create" | "edit" {
  return editing ? "edit" : "create";
}
