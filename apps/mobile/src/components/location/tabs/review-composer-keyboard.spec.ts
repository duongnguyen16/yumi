import { getReviewComposerKeyboardBehavior } from "./review-composer-keyboard";

describe("getReviewComposerKeyboardBehavior", () => {
  it("uses one height-resize strategy instead of adding a keyboard offset", () => {
    expect(getReviewComposerKeyboardBehavior()).toBe("height");
  });
});
