export type ConfirmationKind =
  | "GRANT_ACCESS"
  | "REJECT_ACCESS"
  | "VERIFY_TAKEOVER"
  | "LOGOUT";

type ConfirmationCopy = {
  cancelLabel: string;
  confirmLabel: string;
  message: string;
  title: string;
};

const confirmations: Record<ConfirmationKind, ConfirmationCopy> = {
  GRANT_ACCESS: {
    cancelLabel: "Hủy",
    confirmLabel: "Chuyển quyền",
    message:
      "Bạn sẽ chuyển quyền quản lý địa điểm cho người yêu cầu. Hành động này ảnh hưởng đến quyền quản trị địa điểm.",
    title: "Xác nhận chuyển quyền",
  },
  REJECT_ACCESS: {
    cancelLabel: "Hủy",
    confirmLabel: "Từ chối",
    message:
      "Yêu cầu chuyển quyền sẽ bị từ chối và người gửi có thể kháng cáo quyết định này.",
    title: "Xác nhận từ chối",
  },
  VERIFY_TAKEOVER: {
    cancelLabel: "Hủy",
    confirmLabel: "Xác minh và nhận quyền",
    message:
      "Bằng chứng và vị trí hiện tại sẽ được gửi để xác minh việc tiếp quản địa điểm.",
    title: "Xác nhận tiếp quản",
  },
  LOGOUT: {
    cancelLabel: "Ở lại",
    confirmLabel: "Đăng xuất",
    message: "Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng tài khoản.",
    title: "Đăng xuất?",
  },
};

export function getConfirmationCopy(kind: ConfirmationKind) {
  return confirmations[kind];
}
