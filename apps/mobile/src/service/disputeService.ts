import api from "./aixos";
import type {
  AccessEvidence,
  AccessLocation,
  AccessUser,
} from "./requestAccessService";
import { getNoticeMessage } from "@/ui/feedback";

export type DisputeItem = {
  _id: string;
  locationId: AccessLocation | string;
  vendorAId: AccessUser | string;
  vendorBId: AccessUser | string;
  evidenceA: AccessEvidence[];
  evidenceB: AccessEvidence[];
  status: string;
  adminDecision?: { reason?: string; decidedAt?: string };
  createdAt?: string;
};

type Result = { success: boolean; message?: string };

export async function listDisputes() {
  try {
    const res = await api.get("/disputes/mine");
    return res.data as Result & { items: DisputeItem[] };
  } catch (err) {
    const message = getNoticeMessage(err, "Không thể lấy tranh chấp.");
    return { success: false, items: [], message };
  }
}

export async function getDispute(id: string) {
  try {
    const res = await api.get(`/disputes/${id}`);
    return res.data as Result & { dispute?: DisputeItem };
  } catch (err) {
    const message = getNoticeMessage(err, "Không thể lấy tranh chấp.");
    return { success: false, message };
  }
}
