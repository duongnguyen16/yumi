export type ContributionExitAction = "BACK" | "HOME";

export const contributionExitConfirmation = {
  cancelLabel: "Ở lại",
  confirmLabel: "Thoát",
  message:
    "Các thông tin bạn đã nhập sẽ không được lưu. Bạn có muốn thoát khỏi quá trình tạo địa điểm?",
  title: "Thoát quá trình tạo địa điểm?",
};

export function getContributionExitAction(
  canGoBack: boolean,
): ContributionExitAction {
  return canGoBack ? "BACK" : "HOME";
}
