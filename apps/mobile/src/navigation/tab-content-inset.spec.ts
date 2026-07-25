import { getTabContentBottomPadding } from "./tab-content-inset";

describe("tab content bottom inset", () => {
  it("reserves space for the floating tab bar and the device safe area", () => {
    expect(getTabContentBottomPadding(12)).toBe(92);
  });
});
