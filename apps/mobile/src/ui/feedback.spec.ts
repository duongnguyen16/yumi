import { getNoticeMessage } from "./feedback";

describe("getNoticeMessage", () => {
  it("uses API message strings", () => {
    expect(getNoticeMessage({ response: { data: { message: "Mã OTP không đúng" } } }, "Thử lại")).toBe("Mã OTP không đúng");
  });

  it("joins API message arrays", () => {
    expect(getNoticeMessage({ response: { data: { message: ["Email không hợp lệ", "Mật khẩu quá ngắn"] } } }, "Thử lại")).toBe("Email không hợp lệ. Mật khẩu quá ngắn");
  });

  it("prefers an Axios response message over its generic error text", () => {
    const error = Object.assign(new Error("Request failed with status code 404"), {
      response: { data: { message: "Không tìm thấy quyết định gốc" } },
    });

    expect(getNoticeMessage(error, "Thử lại")).toBe(
      "Không tìm thấy quyết định gốc",
    );
  });

  it("falls back for unknown failures", () => {
    expect(getNoticeMessage(null, "Không thể hoàn tất yêu cầu")).toBe("Không thể hoàn tất yêu cầu");
  });
});
