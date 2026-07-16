import { getWorkflowStatus } from "./status";

describe("Kiểm thử cách hiển thị trạng thái quy trình", () => {
  it("bản địa hóa trạng thái backend và cung cấp sắc thái ngữ nghĩa", () => {
    expect(getWorkflowStatus("PENDING_OPEN")).toEqual({ label: "Đang chờ phản hồi", tone: "warning" });
    expect(getWorkflowStatus("GRANTED")).toEqual({ label: "Đã chuyển quyền", tone: "success" });
    expect(getWorkflowStatus("REJECTED")).toEqual({ label: "Đã từ chối", tone: "danger" });
    expect(getWorkflowStatus("OPEN")).toEqual({ label: "Đang xử lý", tone: "info" });
  });

  it("hiển thị mọi kết quả tranh chấp đã giải quyết bằng tiếng Việt", () => {
    expect(getWorkflowStatus("RESOLVED_KEEP")).toEqual({ label: "Giữ nguyên quyền quản lý", tone: "success" });
    expect(getWorkflowStatus("RESOLVED_TRANSFER")).toEqual({ label: "Đã chuyển quyền quản lý", tone: "success" });
    expect(getWorkflowStatus("RESOLVED_REVOKE")).toEqual({ label: "Đã thu hồi quyền quản lý", tone: "danger" });
  });
});
