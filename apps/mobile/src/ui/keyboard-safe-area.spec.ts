import { getKeyboardSafeAreaBehavior } from "./keyboard-safe-area";

describe("getKeyboardSafeAreaBehavior", () => {
  it("uses padding on iOS so form controls move above the keyboard", () => {
    expect(getKeyboardSafeAreaBehavior("ios")).toBe("padding");
  });

  it("uses height resizing on Android so form controls remain reachable", () => {
    expect(getKeyboardSafeAreaBehavior("android")).toBe("height");
  });
});
