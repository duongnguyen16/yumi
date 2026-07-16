import { getVendorManagementTab, vendorManagementTabs } from "./vendor-management-tabs";

describe("vendor management tabs", () => {
  it("opens locations first and keeps analytics separate", () => {
    expect(vendorManagementTabs).toEqual([
      { key: "locations", label: "Địa điểm của bạn", icon: "storefront-outline" },
      { key: "analytics", label: "Phân tích", icon: "chart-box-outline" },
    ]);
    expect(getVendorManagementTab(0).key).toBe("locations");
    expect(getVendorManagementTab(1).key).toBe("analytics");
  });

  it("falls back to locations for an invalid tab index", () => {
    expect(getVendorManagementTab(99).key).toBe("locations");
  });
});
