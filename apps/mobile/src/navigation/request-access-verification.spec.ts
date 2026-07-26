import {
  getAccessVerificationState,
  getRequestAccessSubmitAction,
} from "./request-access-verification";

describe("request access verification state", () => {
  it("maps session and OTP state to UI state", () => {
    expect(getAccessVerificationState({ sessionId: null })).toBe("STARTING");
    expect(
      getAccessVerificationState({
        sessionId: "s1",
        otpRequired: true,
        otpVerified: false,
      }),
    ).toBe("OTP_REQUIRED");
    expect(
      getAccessVerificationState({
        sessionId: "s1",
        otpRequired: false,
        otpVerified: false,
      }),
    ).toBe("READY");
    expect(
      getAccessVerificationState({
        sessionId: "s1",
        otpRequired: true,
        otpVerified: true,
      }),
    ).toBe("READY");
  });

  it("enables the combined action only when verification input and proof are ready", () => {
    expect(
      getRequestAccessSubmitAction({
        sessionId: "s1",
        otpRequired: true,
        otp: "123456",
        proofCount: 1,
        submitting: false,
      }),
    ).toEqual({
      disabled: false,
      label: "Xác minh và gửi yêu cầu",
    });
    expect(
      getRequestAccessSubmitAction({
        sessionId: "s1",
        otpRequired: true,
        otp: "12345",
        proofCount: 1,
        submitting: false,
      }).disabled,
    ).toBe(true);
    expect(
      getRequestAccessSubmitAction({
        sessionId: "s1",
        otpRequired: false,
        otp: "",
        proofCount: 1,
        submitting: false,
      }),
    ).toEqual({
      disabled: false,
      label: "Gửi yêu cầu",
    });
    expect(
      getRequestAccessSubmitAction({
        sessionId: "s1",
        otpRequired: false,
        otp: "",
        proofCount: 1,
        submitting: true,
      }).disabled,
    ).toBe(true);
  });
});
