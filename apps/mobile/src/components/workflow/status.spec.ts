import { getWorkflowStatus } from "./status";

describe("workflow status presentation", () => {
  it("localizes backend states and provides semantic tones", () => {
    expect(getWorkflowStatus("PENDING_OPEN")).toEqual({ label: "Đang chờ phản hồi", tone: "warning" });
    expect(getWorkflowStatus("GRANTED")).toEqual({ label: "Đã chuyển quyền", tone: "success" });
    expect(getWorkflowStatus("REJECTED")).toEqual({ label: "Đã từ chối", tone: "danger" });
    expect(getWorkflowStatus("OPEN")).toEqual({ label: "Đang xử lý", tone: "info" });
  });

  it("presents every resolved dispute outcome in Vietnamese", () => {
    expect(getWorkflowStatus("RESOLVED_KEEP")).toEqual({ label: "Giữ nguyên quyền quản lý", tone: "success" });
    expect(getWorkflowStatus("RESOLVED_TRANSFER")).toEqual({ label: "Đã chuyển quyền quản lý", tone: "success" });
    expect(getWorkflowStatus("RESOLVED_REVOKE")).toEqual({ label: "Đã thu hồi quyền quản lý", tone: "danger" });
  });
});
