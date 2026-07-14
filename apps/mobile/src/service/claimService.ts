import api from "./aixos";

export type ClaimEvidence = {
  url: string;
  fileType: "IMAGE";
  geo: { type: "Point"; coordinates: [number, number] };
  accuracyMeters?: number;
  capturedAt: string;
  metadata: { siteCode: string };
};

type ClaimApiResponse = {
  success: boolean;
  message?: string;
};

export type StartClaimResult =
  | (ClaimApiResponse & { success: true; otpRequired: boolean; siteCode: string })
  | { success: false; message: string };

const messageFromError = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error as { response?: { data?: { message?: string } } };
    return response.response?.data?.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

export const startClaim = async (locationId: string): Promise<StartClaimResult> => {
  try {
    const response = await api.post("/claims/start", { locationId });
    return response.data as StartClaimResult;
  } catch (error) {
    return { success: false, message: messageFromError(error, "Không thể bắt đầu yêu cầu claim.") };
  }
};

export const verifyClaimOtp = async (locationId: string, otp: string) => {
  try {
    const response = await api.post("/claims/verify-otp", { locationId, otp });
    return response.data as ClaimApiResponse;
  } catch (error) {
    return { success: false, message: messageFromError(error, "Xác minh OTP không thành công.") };
  }
};

export const submitClaim = async (payload: {
  locationId: string;
  evidenceFiles: ClaimEvidence[];
}) => {
  try {
    const response = await api.post("/claims/submit", payload);
    return response.data as ClaimApiResponse & {
      claim?: { id: string; status: string };
    };
  } catch (error) {
    return { success: false, message: messageFromError(error, "Không thể gửi yêu cầu claim.") };
  }
};
