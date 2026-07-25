const PASSWORD_RESET_SUCCESS_MESSAGE =
  "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.";

export function getLoginFeedback(passwordReset?: string) {
  return {
    inlineError: "",
    snackbarMessage:
      passwordReset === "success" ? PASSWORD_RESET_SUCCESS_MESSAGE : "",
  };
}
