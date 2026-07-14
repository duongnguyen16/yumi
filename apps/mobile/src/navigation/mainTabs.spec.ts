import {
  formatUnreadBadge,
  MAIN_TABS,
  SHOW_TABS_HEADER,
} from "./mainTabs";

describe("main tabs navigation", () => {
  it("places notifications in the bottom tab bar and hides the tabs header", () => {
    expect(MAIN_TABS.map((tab) => tab.name)).toEqual([
      "home",
      "notifications",
      "profile",
    ]);
    expect(SHOW_TABS_HEADER).toBe(false);
  });

  it("formats the notification unread badge for the tab bar", () => {
    expect(formatUnreadBadge(0)).toBeUndefined();
    expect(formatUnreadBadge(12)).toBe("12");
    expect(formatUnreadBadge(120)).toBe("99+");
  });
});
