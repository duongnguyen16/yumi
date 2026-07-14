import api from "./aixos";

export type ContributionCategory = {
  id: string;
  name: string;
  description: string | null;
  tags: Array<{
    id: string;
    name: string;
  }>;
};

export type DraftAnalysisResult = {
  success: boolean;
  aiSuggestedTags?: Array<{
    id: string;
    name: string;
  }>;
  duplicateWarning: boolean;
  similarLocations: Array<{
    id: string;
    name: string;
    address: string;
    distanceMeters?: number | null;
    status: string;
  }>;
};

export type PendingContributionImage = {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  capturedAt?: string;
};

export type PendingVendorEvidenceFile = PendingContributionImage;

export type CustomerContributionPayload = {
  name: string;
  description: string;
  openingHours?: string;
  categoryId: string;
  tagIds: string[];
  address: string;
  latitude: number;
  longitude: number;
  deviceLatitude: number;
  deviceLongitude: number;
  accuracyMeters?: number;
  suspectedDuplicateLocationIds?: string[];
  isPotentialDuplicate?: boolean;
};

export type VendorRegistrationPayload = CustomerContributionPayload & {
  systemCode: string;
  videoFiles: PendingVendorEvidenceFile[];
  licenseFiles: PendingVendorEvidenceFile[];
  imageFiles: PendingContributionImage[];
};

const appendEvidenceFile = (
  formData: FormData,
  fieldName: string,
  file: PendingContributionImage,
) => {
  formData.append(fieldName, {
    uri: file.uri,
    name: file.fileName,
    type: file.mimeType,
  } as unknown as Blob);
};

export const getContributionOptions = async () => {
  const response = await api.get("/location/contribution/options");
  return response.data as {
    success: boolean;
    categories: ContributionCategory[];
  };
};

export const analyzeLocationDraft = async (
  name: string,
  categoryId?: string,
  latitude?: number,
  longitude?: number,
) => {
  const response = await api.post("/location/contribution/analyze", {
    name,
    categoryId,
    latitude,
    longitude,
  });

  return response.data as DraftAnalysisResult;
};

export const validateContributionPosition = async (payload: {
  pinLatitude: number;
  pinLongitude: number;
  deviceLatitude: number;
  deviceLongitude: number;
  accuracyMeters?: number;
  address?: string;
}) => {
  const response = await api.post(
    "/location/contribution/validate-position",
    payload,
  );

  return response.data as {
    success: boolean;
    message?: string;
    distanceMeters: number;
    withinRange: boolean;
  };
};

export const submitCustomerContribution = async (
  payload: CustomerContributionPayload,
  imageFiles: PendingContributionImage[],
) => {
  const formData = new FormData();
  formData.append("data", JSON.stringify(payload));
  imageFiles.forEach((file) =>
    appendEvidenceFile(formData, "imageFiles", file),
  );

  const response = await api.post("/location/contribution/submit", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data as {
    success: boolean;
    message: string;
    request: {
      id: string;
      status: string;
      duplicateWarning: boolean;
    };
    location: {
      id: string;
      status: string;
    };
  };
};

export const submitContribution = submitCustomerContribution;

export const submitVendorRegistration = async (
  payload: VendorRegistrationPayload,
) => {
  const locationData = {
    name: payload.name,
    description: payload.description,
    openingHours: payload.openingHours,
    categoryId: payload.categoryId,
    subCategoryIds: payload.tagIds,
    address: payload.address,
    accuracyMeters: payload.accuracyMeters,
    longitude: payload.longitude,
    latitude: payload.latitude,
  };
  const requestData = {
    systemCode: payload.systemCode,
    deviceLatitude: payload.deviceLatitude,
    deviceLongitude: payload.deviceLongitude,
    isPotentialDuplicate: payload.isPotentialDuplicate,
    suspectedDuplicateLocationIds: payload.suspectedDuplicateLocationIds,
    captureAt: new Date().toISOString(),
    pinLatitude: payload.latitude,
    pinLongitude: payload.longitude,
  };
  const formData = new FormData();
  formData.append("request", JSON.stringify(requestData));
  formData.append("locationData", JSON.stringify(locationData));
  payload.videoFiles.forEach((file) =>
    appendEvidenceFile(formData, "videoFiles", file),
  );
  if (payload.licenseFiles.length > 0) {
    payload.licenseFiles.forEach((file) =>
      appendEvidenceFile(formData, "licenseFiles", file),
    );
  }
  payload.imageFiles.forEach((file) =>
    appendEvidenceFile(formData, "imageFiles", file),
  );
  const response = await api.post("/location/register", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  if (response.data?.success === false) {
    throw new Error(
      response.data.message || "Xảy ra lỗi khi gửi đăng ký địa điểm",
    );
  }

  return response.data;
};
