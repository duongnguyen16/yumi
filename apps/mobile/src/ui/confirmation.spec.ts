import { getConfirmationCopy } from "./confirmation";

describe("confirmation copy", () => {
  it("warns before granting location ownership", () => {
    expect(getConfirmationCopy("GRANT_ACCESS")).toEqual({
      cancelLabel: "Hủy",
      confirmLabel: "Chuyển quyền",
      message:
        "Bạn sẽ chuyển quyền quản lý địa điểm cho người yêu cầu. Hành động này ảnh hưởng đến quyền quản trị địa điểm.",
      title: "Xác nhận chuyển quyền",
    });
  });

  it("requires confirmation before rejecting an ownership request", () => {
    expect(getConfirmationCopy("REJECT_ACCESS")).toEqual({
      cancelLabel: "Hủy",
      confirmLabel: "Từ chối",
      message:
        "Yêu cầu chuyển quyền sẽ bị từ chối và người gửi có thể kháng cáo quyết định này.",
      title: "Xác nhận từ chối",
    });
  });

  it("requires confirmation before signing out", () => {
    expect(getConfirmationCopy("LOGOUT")).toEqual({
      cancelLabel: "Ở lại",
      confirmLabel: "Đăng xuất",
      message: "Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng tài khoản.",
      title: "Đăng xuất?",
    });
  });

  it("warns before claiming ownership with onsite evidence", () => {
    expect(getConfirmationCopy("VERIFY_TAKEOVER")).toEqual({
      cancelLabel: "Hủy",
      confirmLabel: "Xác minh và nhận quyền",
      message:
        "Bằng chứng và vị trí hiện tại sẽ được gửi để xác minh việc tiếp quản địa điểm.",
      title: "Xác nhận tiếp quản",
    });
  });
});
