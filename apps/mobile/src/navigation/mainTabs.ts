export type MainTabName = "home" | "mine" | "manage" | "profile";
export type MainTabIcon = "compass-outline" | "bookmark-outline" | "storefront-outline" | "account-outline";

export type MainTab = {
  name: MainTabName;
  title: string;
  icon: MainTabIcon;
  href: `/(tabs)/${MainTabName}`;
};

export const SHOW_TABS_HEADER = false;

const CUSTOMER_TABS: MainTab[] = [
  { name: "home", title: "Khám phá", icon: "compass-outline", href: "/(tabs)/home" },
  { name: "mine", title: "Đã lưu", icon: "bookmark-outline", href: "/(tabs)/mine" },
  { name: "profile", title: "Tài khoản", icon: "account-outline", href: "/(tabs)/profile" },
];

const VENDOR_TABS: MainTab[] = [
  { name: "home", title: "Khám phá", icon: "compass-outline", href: "/(tabs)/home" },
  { name: "manage", title: "Quản lý", icon: "storefront-outline", href: "/(tabs)/manage" },
  { name: "profile", title: "Tài khoản", icon: "account-outline", href: "/(tabs)/profile" },
  { name: "mine", title: "Đã lưu", icon: "bookmark-outline", href: "/(tabs)/mine" },
];

export function getMainTabs(role?: string | null) {
  return role === "VENDOR" ? VENDOR_TABS : CUSTOMER_TABS;
}
