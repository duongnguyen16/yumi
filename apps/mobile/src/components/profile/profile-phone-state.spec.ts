import { getPhoneVerificationState } from "./profile-phone-state";

describe("getPhoneVerificationState", () => {
  it("locks a verified phone and hides every OTP action", () => {
    expect(getPhoneVerificationState({ phoneVerified: true, otpSent: true })).toEqual({
      phoneDisabled: true,
      showOtpField: false,
      showSendOtp: false,
      showResendOtp: false,
    });
  });

  it("allows an unverified phone to start verification", () => {
    expect(getPhoneVerificationState({ phoneVerified: false, otpSent: false })).toEqual({
      phoneDisabled: false,
      showOtpField: false,
      showSendOtp: true,
      showResendOtp: false,
    });
  });

  it("shows OTP verification and resend for an unverified phone after sending", () => {
    expect(getPhoneVerificationState({ phoneVerified: false, otpSent: true })).toEqual({
      phoneDisabled: false,
      showOtpField: true,
      showSendOtp: true,
      showResendOtp: true,
    });
  });
});
