type PhoneVerificationStateInput = {
  phoneVerified: boolean;
  otpSent: boolean;
};

export function getPhoneVerificationState({ phoneVerified, otpSent }: PhoneVerificationStateInput) {
  return {
    phoneDisabled: phoneVerified,
    showOtpField: !phoneVerified && otpSent,
    showSendOtp: !phoneVerified,
    showResendOtp: !phoneVerified && otpSent,
  };
}
