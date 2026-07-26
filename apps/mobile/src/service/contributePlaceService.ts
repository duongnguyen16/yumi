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
};

export type VendorRegistrationPayload = CustomerContributionPayload & {
  systemCode: string;
  isPotentialDuplicate?: boolean;
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

const fileUriToArrayBuffer = async (uri: string) => {
  const response = await fetch(uri);
  return response.arrayBuffer();
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

type ImageUploadRoutes = {
  validate: string;
  uploadUrl: string;
};

const contributionImageRoutes: ImageUploadRoutes = {
  validate: "/images/validate",
  uploadUrl: "/images/upload-url",
};

const appealImageRoutes: ImageUploadRoutes = {
  validate: "/images/appeal/validate",
  uploadUrl: "/images/appeal/upload-url",
};

const uploadImage = async (
  image: PendingContributionImage,
  routes: ImageUploadRoutes,
) => {
  await api.post(routes.validate, {
    fileName: image.fileName,
    mimeType: image.mimeType,
    fileSize: image.fileSize,
  });

  const uploadResponse = await api.post(routes.uploadUrl, {
    fileName: image.fileName,
    mimeType: image.mimeType,
  });

  const upload = uploadResponse.data.upload as {
    bucket: string;
    path: string;
    token: string;
    signedUrl: string;
    publicUrl: string;
  };

  const fileBuffer = await fileUriToArrayBuffer(image.uri);
  const uploadResult = await fetch(upload.signedUrl, {
    body: fileBuffer,
    headers: {
      "cache-control": "max-age=3600",
      "content-type": image.mimeType,
      "x-upsert": "false",
    },
    method: "PUT",
  });

  if (!uploadResult.ok) {
    const errorText = await uploadResult.text().catch(() => "");
    console.log("Supabase image upload failed:", {
      body: errorText,
      status: uploadResult.status,
      statusText: uploadResult.statusText,
    });
    throw new Error(
      errorText || `Không thể tải ảnh lên Supabase (${uploadResult.status})`,
    );
  }

  console.log("Supabase image upload completed:", upload.publicUrl);
  return upload.publicUrl;
};

export const uploadContributionImage = (image: PendingContributionImage) => {
  return uploadImage(image, contributionImageRoutes);
};

export const uploadAppealImage = (image: PendingContributionImage) => {
  return uploadImage(image, appealImageRoutes);
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
  try {
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
      timeout: 0,
    });
    if (response.data?.success === false) {
      return {
        success: false,
        message: response.data?.message || "Đăng ký địa điểm thất bại",
      };
    }
    return response.data;
  } catch (error) {
    console.error("Error submitting vendor registration:", error);
    return {
      success: false,
      message: error?.response?.data?.message || "Đăng ký địa điểm thất bại",
    };
  }
};
