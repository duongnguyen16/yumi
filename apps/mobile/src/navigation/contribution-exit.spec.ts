import {
  contributionExitConfirmation,
  getContributionExitAction,
} from "./contribution-exit";

describe("getContributionExitAction", () => {
  it("returns to the previous route when one exists", () => {
    expect(getContributionExitAction(true)).toBe("BACK");
  });

  it("returns Home when the contribution route has no history", () => {
    expect(getContributionExitAction(false)).toBe("HOME");
  });

  it("warns before abandoning an unfinished location contribution", () => {
    expect(contributionExitConfirmation).toEqual({
      cancelLabel: "Ở lại",
      confirmLabel: "Thoát",
      message:
        "Các thông tin bạn đã nhập sẽ không được lưu. Bạn có muốn thoát khỏi quá trình tạo địa điểm?",
      title: "Thoát quá trình tạo địa điểm?",
    });
  });
});
