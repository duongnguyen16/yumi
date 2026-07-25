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
