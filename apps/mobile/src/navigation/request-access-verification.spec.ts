import { getAccessVerificationState } from "./request-access-verification";

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
});
