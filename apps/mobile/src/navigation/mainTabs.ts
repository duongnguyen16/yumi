export type MainTabName = "home" | "notifications" | "profile";
export type MainTabIcon = "home" | "bell" | "user";

export type MainTab = {
  name: MainTabName;
  title: string;
  icon: MainTabIcon;
};

export const SHOW_TABS_HEADER = false;

export const MAIN_TABS: MainTab[] = [
  { name: "home", title: "YuMi", icon: "home" },
  { name: "notifications", title: "Thông báo", icon: "bell" },
  { name: "profile", title: "Hồ sơ", icon: "user" },
];

export function formatUnreadBadge(count: number) {
  if (count <= 0) return undefined;
  return count > 99 ? "99+" : String(count);
}
