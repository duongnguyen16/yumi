import api from "./aixos";

export type AppealEvidence = {
  url: string;
  fileType: "IMAGE" | "VIDEO" | "DOCUMENT";
  capturedAt?: string;
};

export type AppealItem = {
  _id: string;
  type: string;
  targetId: string;
  argument: string;
  additionalEvidenceFiles: AppealEvidence[];
  status: string;
  originalDecisionReason?: string;
  appealDeadline: string;
  createdAt?: string;
};

type Result = { success: boolean; message?: string };

function getMessage(err: unknown, fallback: string) {
  if (typeof err === "object" && err !== null && "response" in err) {
    const res = err as { response?: { data?: { message?: string | string[] } } };
    const value = res.response?.data?.message;
    return Array.isArray(value) ? value.join(", ") : value || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

export async function submitAppeal(data: {
  type: string;
  targetId: string;
  argument: string;
  additionalEvidenceFiles: AppealEvidence[];
}) {
  try {
    const res = await api.post("/appeals", data);
    return res.data as Result & { appeal?: { id: string; status: string } };
  } catch (err) {
    return { success: false, message: getMessage(err, "Không thể gửi kháng cáo.") };
  }
}

export async function listAppeals() {
  try {
    const res = await api.get("/appeals/mine");
    return res.data as Result & { items: AppealItem[] };
  } catch (err) {
    return { success: false, items: [], message: getMessage(err, "Không thể lấy kháng cáo.") };
  }
}

export async function getAppeal(id: string) {
  try {
    const res = await api.get(`/appeals/${id}`);
    return res.data as Result & { appeal?: AppealItem; disputeId?: string | null };
  } catch (err) {
    return { success: false, message: getMessage(err, "Không thể lấy kháng cáo.") };
  }
}
