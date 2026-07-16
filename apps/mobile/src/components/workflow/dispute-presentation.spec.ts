import { getDisputeOutcome, getDisputeSide } from "./dispute-presentation";

describe("dispute presentation", () => {
  it("explains each final ownership outcome", () => {
    expect(getDisputeOutcome("OPEN")).toBeNull();
    expect(getDisputeOutcome("RESOLVED_KEEP")).toEqual({ detail: "Chủ tại thời điểm mở tranh chấp tiếp tục quản lý địa điểm.", title: "Giữ nguyên quyền quản lý", tone: "success" });
    expect(getDisputeOutcome("RESOLVED_TRANSFER")).toEqual({ detail: "Quyền quản lý đã được chuyển cho người yêu cầu.", title: "Chuyển quyền quản lý", tone: "success" });
    expect(getDisputeOutcome("RESOLVED_REVOKE")).toEqual({ detail: "Địa điểm hiện không còn chủ và có thể được nhận sở hữu lại.", title: "Thu hồi quyền quản lý", tone: "danger" });
  });

  it("identifies the signed-in participant side", () => {
    expect(getDisputeSide("vendor-a", "vendor-a", "vendor-b")).toBe("OWNER_AT_OPEN");
    expect(getDisputeSide("vendor-b", "vendor-a", "vendor-b")).toBe("REQUESTER");
    expect(getDisputeSide("outsider", "vendor-a", "vendor-b")).toBeNull();
  });
});
