import { shouldSelectTab } from "./tab-selection";

describe("shouldSelectTab", () => {
  it("selects a different tab", () => {
    expect(shouldSelectTab("home", "profile")).toBe(true);
  });

  it("does not reselect the active tab", () => {
    expect(shouldSelectTab("profile", "profile")).toBe(false);
  });
});
