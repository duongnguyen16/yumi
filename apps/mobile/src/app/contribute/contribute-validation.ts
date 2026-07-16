import {
  validateCategoryId,
  validateDescription,
  validateOpeningHours,
  validatePlaceName,
  type ValidationResult,
} from "@/common/function";

export type PickedVideoAsset = {
  uri?: string;
  fileName?: string | null;
  mimeType?: string | null;
  duration?: number | null;
  fileSize?: number | null;
};

export function validateContributionBasics({
  name,
  description,
  selectedCategoryId,
  openingHours,
}: {
  name: string;
  description: string;
  selectedCategoryId: string;
  openingHours: string;
}): ValidationResult {
  const nameResult = validatePlaceName(name);
  if (!nameResult.isValid) return nameResult;

  const descriptionResult = validateDescription(description);
  if (!descriptionResult.isValid) return descriptionResult;

  const categoryResult = validateCategoryId(selectedCategoryId);
  if (!categoryResult.isValid) return categoryResult;

  const openingHoursResult = validateOpeningHours(openingHours, {
    required: true,
  });
  if (!openingHoursResult.isValid) return openingHoursResult;

  return { isValid: true };
}

export function validateVendorVideos(assets: PickedVideoAsset[]): ValidationResult {
  for (const asset of assets) {
    if (typeof asset.fileSize !== "number") {
      return {
        isValid: false,
        message: "Dữ liệu video không hợp lệ. Vui lòng chọn video khác.",
      };
    }

    if (asset.fileSize > 50 * 1024 * 1024) {
      return {
        isValid: false,
        message: "Vui lòng chọn video nhỏ hơn 50MB.",
      };
    }

    if (typeof asset.duration === "number" && asset.duration > 60 * 1000) {
      return {
        isValid: false,
        message: "Vui lòng chọn video ngắn hơn 60 giây.",
      };
    }
  }

  return { isValid: true };
}
