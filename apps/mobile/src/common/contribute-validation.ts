import {
  validateCategoryId,
  validateDescription,
  validatePlaceName,
  validateTimeRange,
  type ValidationResult,
} from "./function";

export type PickedVideoAsset = {
  uri?: string;
  fileName?: string | null;
  mimeType?: string | null;
  duration?: number | null;
  fileSize?: number | null;
};

export function getContributionFooterState({
  mediaUploading,
  saving,
}: {
  mediaUploading: boolean;
  saving: boolean;
}) {
  return {
    continueDisabled: mediaUploading,
    loading: saving || mediaUploading,
  };
}

type ContributionReviewMediaRow = {
  icon: "image-outline" | "video-outline" | "file-document-outline";
  label: string;
  value: string;
};

export function getContributionReviewMediaRows({
  imageCount,
  isVendorRegistration,
  licenseCount,
  videoCount,
}: {
  imageCount: number;
  isVendorRegistration: boolean;
  licenseCount: number;
  videoCount: number;
}): ContributionReviewMediaRow[] {
  const rows: ContributionReviewMediaRow[] = [
    {
      icon: "image-outline",
      label: "Hình ảnh",
      value: `${imageCount} ảnh`,
    },
  ];

  if (isVendorRegistration) {
    rows.push(
      {
        icon: "video-outline",
        label: "Video xác thực",
        value: `${videoCount} video`,
      },
      {
        icon: "file-document-outline",
        label: "Giấy phép",
        value: `${licenseCount} giấy phép`,
      },
    );
  }

  return rows;
}

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

  const descriptionResult = validateDescription(description, {
    maxLength: 500,
    minLength: 10,
  });
  if (!descriptionResult.isValid) return descriptionResult;

  const categoryResult = validateCategoryId(selectedCategoryId);
  if (!categoryResult.isValid) return categoryResult;

  const openingHoursResult = validateContributionOpeningHours(openingHours);
  if (!openingHoursResult.isValid) return openingHoursResult;

  return { isValid: true };
}

function validateContributionOpeningHours(
  openingHours: string,
): ValidationResult {
  const value = openingHours.trim();

  if (!value) {
    return {
      isValid: false,
      message: "Giờ mở cửa không được để trống.",
    };
  }

  const parts = value.split("-");
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

export function validateVendorVideos(
  assets: PickedVideoAsset[],
): ValidationResult {
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
