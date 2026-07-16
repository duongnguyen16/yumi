import { validateLoginCredentials } from "./login-validation";

describe("login validation", () => {
  it("rejects malformed email before login request", () => {
    expect(
      validateLoginCredentials({
        email: "not-an-email",
        password: "password123",
      }).message,
    ).toBe("Email không hợp lệ.");
  });

  it("rejects invalid password before login request", () => {
    expect(
      validateLoginCredentials({
        email: "user@example.com",
        password: "short",
      }).message,
    ).toBe("Mật khẩu phải có ít nhất 8 ký tự.");
  });
});
