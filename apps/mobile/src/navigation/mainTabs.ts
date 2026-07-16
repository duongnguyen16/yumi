export type MainTabName = "home" | "mine" | "manage" | "profile";
export type MainTabIcon = "compass-outline" | "bookmark-outline" | "storefront-outline" | "account-outline";

export type MainTab = {
  name: MainTabName;
  title: string;
  icon: MainTabIcon;
};

export const SHOW_TABS_HEADER = false;

const CUSTOMER_TABS: MainTab[] = [
  { name: "home", title: "Khám phá", icon: "compass-outline" },
  { name: "mine", title: "Đã lưu", icon: "bookmark-outline" },
  { name: "profile", title: "Tài khoản", icon: "account-outline" },
];

const VENDOR_TABS: MainTab[] = [
  { name: "home", title: "Khám phá", icon: "compass-outline" },
  { name: "manage", title: "Quản lý", icon: "storefront-outline" },
  { name: "profile", title: "Tài khoản", icon: "account-outline" },
];

export function getMainTabs(role?: string | null) {
  return role === "VENDOR" ? VENDOR_TABS : CUSTOMER_TABS;
}
