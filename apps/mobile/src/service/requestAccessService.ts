import api from "./aixos";
import { getNoticeMessage } from "@/ui/feedback";

export type AccessSide = "owner" | "requester";
export type AccessState =
  | "PENDING_OPEN"
  | "PENDING_TIMED_OUT"
  | "GRANTED"
  | "REJECTED"
  | "AUTO_GRANTED"
  | "EXPIRED"
  | "ESCALATED";

export type AccessEvidence = {
  url: string;
  fileType: "IMAGE" | "VIDEO" | "DOCUMENT";
  geo?: { type: "Point"; coordinates: [number, number] };
  accuracyMeters?: number;
  capturedAt?: string;
  metadata?: Record<string, unknown>;
};

export type AccessUser = {
  _id: string;
  fullName?: string;
  email?: string;
};

export type AccessLocation = {
  _id: string;
  name?: string;
  address?: string;
  ownerId?: string;
};

export type AccessRequest = {
  _id: string;
  locationId: AccessLocation | string;
  requesterId: AccessUser | string;
  currentOwnerId: AccessUser | string;
  evidenceFiles: AccessEvidence[];
  status: string;
  timeoutAt: string;
  requestReason?: string;
  responseReason?: string;
  respondedAt?: string;
  createdAt?: string;
  effectiveState: AccessState;
  isExpired: boolean;
  canVerifyTakeover: boolean;
};

type ApiResult = {
  success: boolean;
  message?: string;
};

export type AccessVerificationPurpose = "CREATE" | "TAKEOVER";

export type AccessVerificationResult = ApiResult & {
  sessionId?: string;
  otpRequired?: boolean;
  expiresAt?: string;
  otpVerified?: boolean;
};

export async function startAccessVerification(
  locationId: string,
  purpose: AccessVerificationPurpose,
  requestAccessId?: string,
): Promise<AccessVerificationResult> {
  try {
    const res = await api.post("/request-access/verification/start", {
      locationId,
      purpose,
      ...(requestAccessId ? { requestAccessId } : {}),
    });
    return res.data as AccessVerificationResult;
  } catch (err) {
    const message = getNoticeMessage(err, "Không thể bắt đầu xác minh.");
    return { success: false, message };
  }
}

export async function verifyAccessOtp(
  sessionId: string,
  otp: string,
): Promise<AccessVerificationResult> {
  try {
    const res = await api.post("/request-access/verification/verify-otp", {
      sessionId,
      otp,
    });
    return res.data as AccessVerificationResult;
  } catch (err) {
    const message = getNoticeMessage(err, "Không thể xác minh OTP.");
    return { success: false, message };
  }
}

export async function createAccess(
  locationId: string,
  reason: string | undefined,
  evidenceFiles: AccessEvidence[],
  verificationSessionId: string,
) {
  try {
    const res = await api.post("/request-access", {
      locationId,
      reason,
      evidenceFiles,
      verificationSessionId,
    });
    return res.data as ApiResult & {
      request?: { id: string; status: string; timeoutAt: string };
    };
  } catch (err) {
    const message = getNoticeMessage(
      err,
      "Không thể gửi yêu cầu chuyển quyền.",
    );
    return { success: false, message };
  }
}

export async function listAccess(side: AccessSide) {
  try {
    const res = await api.get("/request-access/mine", { params: { side } });
    return res.data as ApiResult & { items: AccessRequest[] };
  } catch (err) {
    const message = getNoticeMessage(err, "Không thể lấy danh sách yêu cầu.");
    return {
      success: false,
      items: [],
      message,
    };
  }
}

export async function getAccess(id: string) {
  try {
    const res = await api.get(`/request-access/${id}`);
    return res.data as ApiResult & { request?: AccessRequest };
  } catch (err) {
    const message = getNoticeMessage(err, "Không thể lấy yêu cầu.");
    return { success: false, message };
  }
}

export async function respondAccess(
  id: string,
  action: "GRANT" | "REJECT",
  reason?: string,
) {
  try {
    const res = await api.patch(`/request-access/${id}/respond`, {
      action,
      reason,
    });
    return res.data as ApiResult & { canAppeal?: boolean };
  } catch (err) {
    const message = getNoticeMessage(err, "Không thể phản hồi yêu cầu.");
    return { success: false, message };
  }
}

export async function verifyAccess(
  id: string,
  evidenceFiles: AccessEvidence[],
  verificationSessionId: string,
) {
  try {
    const res = await api.patch(`/request-access/${id}/verify-takeover`, {
      evidenceFiles,
      verificationSessionId,
    });
    return res.data as ApiResult;
  } catch (err) {
    const message = getNoticeMessage(err, "Không thể xác minh chuyển quyền.");
    return { success: false, message };
  }
}
