import api from "./aixos";
import { getNoticeMessage } from "@/ui/feedback";

export type ClaimEvidence = {
  url: string;
  fileType: "IMAGE";
  geo: { type: "Point"; coordinates: [number, number] };
  accuracyMeters?: number;
  capturedAt: string;
  metadata?: Record<string, unknown>;
};

type ClaimApiResponse = {
  success: boolean;
  message?: string;
};

export type StartClaimResult =
  | (ClaimApiResponse & {
      success: true;
      otpRequired: boolean;
      siteCode: string;
    })
  | { success: false; message: string };

export const startClaim = async (
  locationId: string,
): Promise<StartClaimResult> => {
  try {
    const response = await api.post("/claims/start", { locationId });
    return response.data as StartClaimResult;
  } catch (error) {
    const message = getNoticeMessage(error, "Không thể bắt đầu yêu cầu claim.");
    return { success: false, message };
  }
};

export const verifyClaimOtp = async (locationId: string, otp: string) => {
  try {
    const response = await api.post("/claims/verify-otp", { locationId, otp });
    return response.data as ClaimApiResponse;
  } catch (error) {
    const message = getNoticeMessage(error, "Xác minh OTP không thành công.");
    return { success: false, message };
  }
};

export const submitClaim = async (payload: {
  locationId: string;
  siteCode: string;
  evidenceFiles: ClaimEvidence[];
  licenseUrl?: string;
}) => {
  try {
    const { siteCode, evidenceFiles, ...claim } = payload;
    const response = await api.post("/claims/submit", {
      ...claim,
      evidenceFiles: evidenceFiles.map((file) => ({
        ...file,
        metadata: { ...file.metadata, siteCode },
      })),
    });
    return response.data as ClaimApiResponse & {
      claim?: { id: string; status: string };
    };
  } catch (error) {
    const message = getNoticeMessage(error, "Không thể gửi yêu cầu claim.");
    return { success: false, message };
  }
};
