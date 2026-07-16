import { getMainTabs, SHOW_TABS_HEADER } from "./mainTabs";

describe("main tabs navigation", () => {
  it("uses customer destinations without notifications or management", () => {
    expect(getMainTabs("CUSTOMER").map((tab) => tab.name)).toEqual([
      "home",
      "mine",
      "profile",
    ]);
    expect(SHOW_TABS_HEADER).toBe(false);
  });

  it("uses location management as the vendor middle destination", () => {
    expect(getMainTabs("VENDOR").map((tab) => tab.name)).toEqual([
      "home",
      "manage",
      "profile",
    ]);
  });
});
