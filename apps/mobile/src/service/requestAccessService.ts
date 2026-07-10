import api from "./aixos";

export type AccessSide = "owner" | "requester";
export type AccessState =
  | "PENDING_OPEN"
  | "PENDING_TIMED_OUT"
  | "GRANTED"
  | "REJECTED"
  | "AUTO_GRANTED";

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

const getMessage = (err: unknown, fallback: string) => {
  if (typeof err === "object" && err !== null && "response" in err) {
    const res = err as { response?: { data?: { message?: string | string[] } } };
    const message = res.response?.data?.message;
    return Array.isArray(message) ? message.join(", ") : message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
};

export async function createAccess(locationId: string, reason?: string) {
  try {
    const res = await api.post("/request-access", { locationId, reason });
    return res.data as ApiResult & {
      request?: { id: string; status: string; timeoutAt: string };
    };
  } catch (err) {
    return { success: false, message: getMessage(err, "Không thể gửi yêu cầu chuyển quyền.") };
  }
}

export async function listAccess(side: AccessSide) {
  try {
    const res = await api.get("/request-access/mine", { params: { side } });
    return res.data as ApiResult & { items: AccessRequest[] };
  } catch (err) {
    return {
      success: false,
      items: [],
      message: getMessage(err, "Không thể lấy danh sách yêu cầu."),
    };
  }
}

export async function getAccess(id: string) {
  try {
    const res = await api.get(`/request-access/${id}`);
    return res.data as ApiResult & { request?: AccessRequest };
  } catch (err) {
    return { success: false, message: getMessage(err, "Không thể lấy yêu cầu.") };
  }
}

export async function respondAccess(
  id: string,
  action: "GRANT" | "REJECT",
  reason?: string,
) {
  try {
    const res = await api.patch(`/request-access/${id}/respond`, { action, reason });
    return res.data as ApiResult & { canAppeal?: boolean };
  } catch (err) {
    return { success: false, message: getMessage(err, "Không thể phản hồi yêu cầu.") };
  }
}

export async function verifyAccess(id: string, evidenceFiles: AccessEvidence[]) {
  try {
    const res = await api.patch(`/request-access/${id}/verify-takeover`, {
      evidenceFiles,
    });
    return res.data as ApiResult;
  } catch (err) {
    return { success: false, message: getMessage(err, "Không thể xác minh chuyển quyền.") };
  }
}
