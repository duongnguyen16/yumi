import { getNoticeMessage } from "./feedback";

describe("getNoticeMessage", () => {
  it("uses API message strings", () => {
    expect(getNoticeMessage({ response: { data: { message: "Mã OTP không đúng" } } }, "Thử lại")).toBe("Mã OTP không đúng");
  });

  it("joins API message arrays", () => {
    expect(getNoticeMessage({ response: { data: { message: ["Email không hợp lệ", "Mật khẩu quá ngắn"] } } }, "Thử lại")).toBe("Email không hợp lệ. Mật khẩu quá ngắn");
  });

  it("falls back for unknown failures", () => {
    expect(getNoticeMessage(null, "Không thể hoàn tất yêu cầu")).toBe("Không thể hoàn tất yêu cầu");
  });
});
