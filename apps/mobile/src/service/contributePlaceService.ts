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
  aiSuggestedTags: Array<{
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
};

let supabaseClient: SupabaseClient | null = null;

const getSupabaseClient = () => {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

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
) => {
  const response = await api.post("/location/contribution/analyze", {
    name,
    categoryId,
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

export const submitContribution = async (payload: {
  name: string;
  description: string;
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
}) => {
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
