import { getTabContentBottomPadding, getTabSnackbarBottomOffset } from "./tab-content-inset";

describe("tab content bottom inset", () => {
  it("reserves space for the floating tab bar and the device safe area", () => {
    expect(getTabContentBottomPadding(12)).toBe(92);
  });

  it("positions snackbars above the floating tab bar without double-counting the safe area", () => {
    expect(getTabSnackbarBottomOffset(12)).toBe(60);
    expect(getTabSnackbarBottomOffset(0)).toBe(72);
  });
});
