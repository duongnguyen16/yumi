import { createClient, SupabaseClient } from "@supabase/supabase-js";
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
  imageUrls: string[];
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
  formData.append(
    fieldName,
    {
      uri: file.uri,
      name: file.fileName,
      type: file.mimeType,
    } as unknown as Blob,
  );
};

let supabaseClient: SupabaseClient | null = null;

const getSupabaseClient = () => {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  console.log("supabaseUrl:", supabaseUrl);

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Thieu EXPO_PUBLIC_SUPABASE_URL hoac EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY trong apps/mobile/.env",
    );
  }

  supabaseClient = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseClient;
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

export const uploadContributionImage = async (
  image: PendingContributionImage,
) => {
  await api.post("/images/validate", {
    fileName: image.fileName,
    mimeType: image.mimeType,
    fileSize: image.fileSize,
  });

  const uploadResponse = await api.post("/images/upload-url", {
    fileName: image.fileName,
    mimeType: image.mimeType,
  });

  const upload = uploadResponse.data.upload as {
    bucket: string;
    path: string;
    token: string;
    publicUrl: string;
  };

  const supabase = getSupabaseClient();
  const fileBuffer = await fileUriToArrayBuffer(image.uri);
  const { error } = await supabase.storage
    .from(upload.bucket)
    .uploadToSignedUrl(upload.path, upload.token, fileBuffer, {
      contentType: image.mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return upload.publicUrl;
};

export const submitCustomerContribution = async (
  payload: CustomerContributionPayload,
) => {
  const response = await api.post("/location/contribution/submit", payload);
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
      newData: locationData,
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
    return response.data;
  } catch (error) {
    console.log("Error in submitVendorRegistration: ", error);
    return {
      success: false,
      message:
        error.response?.data?.message || "Xảy ra lỗi khi gửi đăng ký địa điểm",
    };
  }
};
