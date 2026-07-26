export type AccessVerificationUiState =
  | "STARTING"
  | "OTP_REQUIRED"
  | "READY"
  | "SUBMITTING";

export interface AccessVerificationSessionState {
  sessionId: string | null;
  otpRequired?: boolean;
  otpVerified?: boolean;
  submitting?: boolean;
}

export function getAccessVerificationState(
  state: AccessVerificationSessionState,
): AccessVerificationUiState {
  if (state.submitting) return "SUBMITTING";
  if (!state.sessionId) return "STARTING";
  if (state.otpRequired && !state.otpVerified) return "OTP_REQUIRED";
  return "READY";
}

export interface RequestAccessSubmitInput {
  sessionId: string | null;
  otpRequired: boolean;
  otp: string;
  proofCount: number;
  submitting: boolean;
}

export function getRequestAccessPhoneHelper({
  destinationPhone,
  locationName,
  otpRequired,
}: {
  destinationPhone: string | null;
  locationName: string;
  otpRequired: boolean;
}) {
  if (!otpRequired) return null;

  const phone = destinationPhone || "số điện thoại của địa điểm";
  return `Mã OTP đã gửi đến ${phone}, số điện thoại liên hệ công khai của ${locationName}.`;
}

export function getRequestAccessSubmitAction(
  input: RequestAccessSubmitInput,
): {
  disabled: boolean;
  label: "Xác minh và gửi yêu cầu" | "Gửi yêu cầu";
} {
  const hasOtp = !input.otpRequired || /^\d{6}$/.test(input.otp);

  return {
    disabled:
      input.submitting ||
      !input.sessionId ||
      input.proofCount < 1 ||
      !hasOtp,
    label: input.otpRequired
      ? "Xác minh và gửi yêu cầu"
      : "Gửi yêu cầu",
  };
}
