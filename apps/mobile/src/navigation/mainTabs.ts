export type MainTabName = "home" | "mine" | "activity" | "profile";
export type MainTabIcon = "compass-outline" | "bookmark-outline" | "bell-outline" | "account-outline";

export type MainTab = {
  name: MainTabName;
  title: string;
  icon: MainTabIcon;
};

export const SHOW_TABS_HEADER = false;

export const MAIN_TABS: MainTab[] = [
  { name: "home", title: "Khám phá", icon: "compass-outline" },
  { name: "mine", title: "Của tôi", icon: "bookmark-outline" },
  { name: "activity", title: "Hoạt động", icon: "bell-outline" },
  { name: "profile", title: "Tài khoản", icon: "account-outline" },
];

export function formatUnreadBadge(count: number) {
  if (count <= 0) return undefined;
  return count > 99 ? "99+" : String(count);
}
