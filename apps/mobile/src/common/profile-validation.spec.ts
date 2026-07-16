import {
  validateProfileAvatar,
  validateProfilePhoneOtpRequest,
  validateProfilePhoneOtpVerification,
  validateProfileUpdate,
} from "./profile-validation";

describe("profile validation", () => {
  it("validates profile display name before saving", () => {
    expect(validateProfileUpdate({ name: "" }).message).toBe(
      "Tên không được để trống.",
    );
    expect(validateProfileUpdate({ name: "A" }).message).toBe(
      "Tên phải có ít nhất 2 ký tự.",
    );
    expect(validateProfileUpdate({ name: "User 123" }).message).toBe(
      "Tên không nên chứa chữ số.",
    );
    expect(validateProfileUpdate({ name: "  Nguyễn Văn A  " })).toEqual({
      isValid: true,
      name: "Nguyễn Văn A",
    });
  });

  it("normalizes and validates profile phone before requesting OTP", () => {
    expect(validateProfilePhoneOtpRequest("123").message).toBe(
      "Số điện thoại không hợp lệ.",
    );
    expect(validateProfilePhoneOtpRequest("+84 909 000 111")).toEqual({
      isValid: true,
      phone: "0909000111",
    });
  });

  it("validates profile OTP before verification", () => {
    expect(validateProfilePhoneOtpVerification("12a456").message).toBe(
      "Mã OTP phải gồm 6 chữ số.",
    );
    expect(validateProfilePhoneOtpVerification(" 123456 ")).toEqual({
      isValid: true,
      otp: "123456",
    });
  });

  it("validates avatar files before saving profile", () => {
    expect(validateProfileAvatar({ uri: "", name: "avatar.jpg", type: "image/jpeg" }).message).toBe(
      "Ảnh đại diện không hợp lệ.",
    );
    expect(validateProfileAvatar({ uri: "file://avatar.pdf", name: "avatar.pdf", type: "application/pdf" }).message).toBe(
      "Ảnh đại diện phải là tệp hình ảnh.",
    );
    expect(validateProfileAvatar({ uri: "file://avatar.jpg", name: "avatar.jpg", type: "image/jpeg" })).toEqual({
      isValid: true,
    });
  });
});
