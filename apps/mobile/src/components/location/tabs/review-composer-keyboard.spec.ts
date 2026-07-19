import { getReviewComposerKeyboardBehavior } from "./review-composer-keyboard";

describe("getReviewComposerKeyboardBehavior", () => {
  it("uses padding on iOS", () => {
    expect(getReviewComposerKeyboardBehavior("ios")).toBe("padding");
  });

  it("uses height resizing on Android", () => {
    expect(getReviewComposerKeyboardBehavior("android")).toBe("height");
  });
});
