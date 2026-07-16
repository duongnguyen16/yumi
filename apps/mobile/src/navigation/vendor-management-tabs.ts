import type { IconName } from "@/ui/components";

export type VendorManagementTab = { key: "locations" | "analytics"; label: string; icon: IconName };

export const vendorManagementTabs: readonly VendorManagementTab[] = [
  { key: "locations", label: "Địa điểm của bạn", icon: "storefront-outline" },
  { key: "analytics", label: "Phân tích", icon: "chart-box-outline" },
];

export function getVendorManagementTab(index: number) {
  return vendorManagementTabs[index] ?? vendorManagementTabs[0];
}
