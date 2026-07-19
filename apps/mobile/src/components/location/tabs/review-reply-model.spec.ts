import {
  canManageReviewReplies,
  getReviewReplyDialogVisibility,
  getReviewReplyDialogMode,
  getReviewReplyMutation,
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
      canManageReviewReplies({ _id: "vendor-2", role: "VENDOR" }, "vendor-1"),
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

  it("selects create or edit mutation from dialog state", () => {
    expect(getReviewReplyMutation(false)).toBe("create");
    expect(getReviewReplyMutation(true)).toBe("edit");
  });
});
