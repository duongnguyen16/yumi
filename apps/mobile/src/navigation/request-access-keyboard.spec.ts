import { getRequestAccessKeyboardBehavior } from "./request-access-keyboard";

describe("getRequestAccessKeyboardBehavior", () => {
  it("uses padding on iOS so content moves above the keyboard", () => {
    expect(getRequestAccessKeyboardBehavior("ios")).toBe("padding");
  });

  it("uses height resizing on Android so content remains reachable", () => {
    expect(getRequestAccessKeyboardBehavior("android")).toBe("height");
  });
});
