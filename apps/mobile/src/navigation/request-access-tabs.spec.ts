import { getRequestAccessTab, requestAccessTabs } from "./request-access-tabs";

describe("Kiểm thử các tab yêu cầu quyền truy cập", () => {
  it("ánh xạ chỉ số tab Paper tới phía yêu cầu", () => {
    expect(requestAccessTabs).toEqual([
      { label: "Tôi nhận", side: "owner" },
      { label: "Tôi gửi", side: "requester" },
    ]);
    expect(getRequestAccessTab(0).side).toBe("owner");
    expect(getRequestAccessTab(1).side).toBe("requester");
  });

  it("trở về tab yêu cầu đến khi chỉ số không hợp lệ", () => {
    expect(getRequestAccessTab(99).side).toBe("owner");
  });
});
