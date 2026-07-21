import { getLoginFeedback } from "./login-feedback";

describe("getLoginFeedback", () => {
  it("keeps a password-reset confirmation in the snackbar", () => {
    expect(getLoginFeedback("success")).toEqual({
      inlineError: "",
      snackbarMessage:
        "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.",
    });
  });
});
