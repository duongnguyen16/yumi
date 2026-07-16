import { getRequestAccessTab, requestAccessTabs } from "./request-access-tabs";

describe("request access tabs", () => {
  it("maps Paper tab indexes to request sides", () => {
    expect(requestAccessTabs).toEqual([
      { label: "Tôi nhận", side: "owner" },
      { label: "Tôi gửi", side: "requester" },
    ]);
    expect(getRequestAccessTab(0).side).toBe("owner");
    expect(getRequestAccessTab(1).side).toBe("requester");
  });

  it("falls back to the incoming tab for an invalid index", () => {
    expect(getRequestAccessTab(99).side).toBe("owner");
  });
});
