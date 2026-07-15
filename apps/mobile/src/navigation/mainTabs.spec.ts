import {
  formatUnreadBadge,
  MAIN_TABS,
  SHOW_TABS_HEADER,
} from "./mainTabs";

describe("main tabs navigation", () => {
  it("uses the four universal destinations and hides the tabs header", () => {
    expect(MAIN_TABS.map((tab) => tab.name)).toEqual([
      "home",
      "mine",
      "activity",
      "profile",
    ]);
    expect(MAIN_TABS.map((tab) => tab.title)).toEqual([
      "Khám phá",
      "Của tôi",
      "Hoạt động",
      "Tài khoản",
    ]);
    expect(SHOW_TABS_HEADER).toBe(false);
  });

  it("formats the notification unread badge for the tab bar", () => {
    expect(formatUnreadBadge(0)).toBeUndefined();
    expect(formatUnreadBadge(12)).toBe("12");
    expect(formatUnreadBadge(120)).toBe("99+");
  });
});
