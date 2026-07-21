import api from "./aixos";
import { getNoticeMessage } from "@/ui/feedback";

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
    const message = getNoticeMessage(err, "Không thể gửi kháng cáo.");
    return { success: false, message };
  }
}

export async function listAppeals() {
  try {
    const res = await api.get("/appeals/mine");
    return res.data as Result & { items: AppealItem[] };
  } catch (err) {
    const message = getNoticeMessage(err, "Không thể lấy kháng cáo.");
    return { success: false, items: [], message };
  }
}

export async function getAppeal(id: string) {
  try {
    const res = await api.get(`/appeals/${id}`);
    return res.data as Result & {
      appeal?: AppealItem;
      disputeId?: string | null;
    };
  } catch (err) {
    const message = getNoticeMessage(err, "Không thể lấy kháng cáo.");
    return { success: false, message };
  }
}
