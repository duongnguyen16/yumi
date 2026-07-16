import {
  normalizePhoneNumber,
  validateOtp,
  validatePhoneNumber,
  validateUserName,
  type ValidationResult,
} from "./function";

type ProfileValidationResult = ValidationResult & {
  name?: string;
  phone?: string;
  otp?: string;
};

type ProfileAvatar = {
  uri?: string;
  name?: string;
  type?: string;
};

export function validateProfileUpdate({
  name,
  avatar,
}: {
  name: string;
  avatar?: ProfileAvatar | null;
}): ProfileValidationResult {
  const normalizedName = name.trim().replace(/\s+/g, " ");
  const nameResult = validateUserName(normalizedName);
  if (!nameResult.isValid) return nameResult;

  if (avatar) {
    const avatarResult = validateProfileAvatar(avatar);
    if (!avatarResult.isValid) return avatarResult;
  }

  return { isValid: true, name: normalizedName };
}

export function validateProfilePhoneOtpRequest(
  phone: string,
): ProfileValidationResult {
  const normalizedPhone = normalizePhoneNumber(phone);
  const result = validatePhoneNumber(normalizedPhone);
  return result.isValid ? { isValid: true, phone: normalizedPhone } : result;
}

export function validateProfilePhoneOtpVerification(
  otp: string,
): ProfileValidationResult {
  const normalizedOtp = otp.trim();
  const result = validateOtp(normalizedOtp);
  return result.isValid ? { isValid: true, otp: normalizedOtp } : result;
}

export function validateProfileAvatar(
  avatar: ProfileAvatar,
): ValidationResult {
  if (!avatar.uri?.trim() || !avatar.name?.trim() || !avatar.type?.trim()) {
    return {
      isValid: false,
      message: "Ảnh đại diện không hợp lệ.",
    };
  }

  if (!avatar.type.startsWith("image/")) {
    return {
      isValid: false,
      message: "Ảnh đại diện phải là tệp hình ảnh.",
    };
  }

  return { isValid: true };
}
