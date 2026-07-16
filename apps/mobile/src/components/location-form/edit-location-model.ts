import type {
  EditSuggestionChange,
  EditSuggestionFlag,
} from "@/service/editSuggestionService";
import {
  normalizePhoneNumber,
  validateDescription,
  validatePhoneNumber,
  validatePlaceName,
  validateRequiredText,
  validateOtp,
  validateTimeRange,
  type ValidationResult,
} from "@/common/function";

export type EditField =
  | "name"
  | "address"
  | "openingHours"
  | "description"
  | "phone"
  | "flag"
  | "category";

const ownerFields: EditField[] = [
  "name",
  "address",
  "openingHours",
  "description",
  "phone",
  "category",
];
const publicFields: EditField[] = ["address", "openingHours", "phone", "flag"];

export function getAllowedEditFields(isOwner: boolean) {
  return isOwner ? ownerFields : publicFields;
}

export function buildSuggestionChanges({
  selectedFields,
  openingHours,
  phone,
  coordinates,
  flag,
}: {
  selectedFields: EditField[];
  openingHours: string;
  phone: string;
  coordinates?: [number, number] | null;
  flag: EditSuggestionFlag;
}) {
  const changes: EditSuggestionChange[] = [];
  if (selectedFields.includes("openingHours") && openingHours.trim())
    changes.push({ fieldName: "openingHours", textValue: openingHours.trim() });
  if (selectedFields.includes("phone") && phone.trim())
    changes.push({ fieldName: "phone", textValue: phone.trim() });
  if (selectedFields.includes("address") && coordinates)
    changes.push({
      fieldName: "geo",
      geoValue: { latitude: coordinates[1], longitude: coordinates[0] },
    });
  if (selectedFields.includes("flag"))
    changes.push({ fieldName: "flag", flagValue: flag });
  return changes;
}

type PhoneValidationResult = ValidationResult & { phone?: string };
type OtpValidationResult = ValidationResult & { otp?: string };

export function validatePhoneOtpRequest(phone: string): PhoneValidationResult {
  const normalizedPhone = normalizePhoneNumber(phone);
  const result = validatePhoneNumber(normalizedPhone);
  return result.isValid ? { isValid: true, phone: normalizedPhone } : result;
}

export function validatePhoneOtpVerification(otp: string): OtpValidationResult {
  const normalizedOtp = otp.trim();
  const result = validateOtp(normalizedOtp);
  return result.isValid ? { isValid: true, otp: normalizedOtp } : result;
}

export function validateEditLocationSubmission({
  selectedFields,
  name = "",
  address = "",
  openingHours = "",
  description = "",
  phone = "",
  selectedCategory = "",
  coordinates,
  assets = [],
  otpVerified = false,
}: {
  selectedFields: EditField[];
  name?: string;
  address?: string;
  openingHours?: string;
  description?: string;
  phone?: string;
  selectedCategory?: string;
  coordinates?: [number, number] | null;
  assets?: unknown[];
  otpVerified?: boolean;
}): ValidationResult {
  if (
    (selectedFields.includes("name") || selectedFields.includes("address")) &&
    assets.length === 0
  ) {
    return { isValid: false, message: "Vui lòng thêm bằng chứng" };
  }

  if (selectedFields.includes("name")) {
    const result = validatePlaceName(name);
    if (!result.isValid) return result;
  }

  if (selectedFields.includes("address")) {
    const result = validateRequiredText(address, {
      fieldName: "Địa chỉ",
      minLength: 5,
    });
    if (!result.isValid) return result;
    if (!coordinates)
      return { isValid: false, message: "Vui lòng xác thực lại vị trí" };
  }

  if (selectedFields.includes("openingHours")) {
    const result = validateEditOpeningHours(openingHours);
    if (!result.isValid) return result;
  }

  if (selectedFields.includes("description")) {
    const result = validateDescription(description);
    if (!result.isValid) return result;
  }

  if (selectedFields.includes("phone")) {
    const result = validatePhoneNumber(phone);
    if (!result.isValid) return result;
    if (!otpVerified)
      return { isValid: false, message: "Vui lòng xác nhận số điện thoại" };
  }

  if (selectedFields.includes("category") && !selectedCategory) {
    return { isValid: false, message: "Vui lòng chọn danh mục" };
  }

  return { isValid: true };
}

function validateEditOpeningHours(openingHours: string): ValidationResult {
  const value = openingHours.trim();

  if (!value) {
    return {
      isValid: false,
      message: "Giờ mở cửa không được để trống.",
    };
  }

  const parts = value.split(/\s*-\s*/);
  if (parts.length !== 2) {
    return {
      isValid: false,
      message: "Giờ mở cửa phải có định dạng HH:mm-HH:mm.",
    };
  }

  return validateTimeRange(parts[0], parts[1], {
    allowOvernight: false,
    allowSameTime: false,
  });
}
