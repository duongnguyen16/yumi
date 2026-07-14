import api from "./aixos";
import type { AccessEvidence, AccessLocation, AccessUser } from "./requestAccessService";

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

function getMessage(err: unknown, fallback: string) {
  if (typeof err === "object" && err !== null && "response" in err) {
    const res = err as { response?: { data?: { message?: string | string[] } } };
    const value = res.response?.data?.message;
    return Array.isArray(value) ? value.join(", ") : value || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

export async function listDisputes() {
  try {
    const res = await api.get("/disputes/mine");
    return res.data as Result & { items: DisputeItem[] };
  } catch (err) {
    return { success: false, items: [], message: getMessage(err, "Không thể lấy tranh chấp.") };
  }
}

export async function getDispute(id: string) {
  try {
    const res = await api.get(`/disputes/${id}`);
    return res.data as Result & { dispute?: DisputeItem };
  } catch (err) {
    return { success: false, message: getMessage(err, "Không thể lấy tranh chấp.") };
  }
}

export async function addDisputeEvidence(id: string, evidenceFiles: AccessEvidence[]) {
  try {
    const res = await api.post(`/disputes/${id}/evidence`, { evidenceFiles });
    return res.data as Result;
  } catch (err) {
    return { success: false, message: getMessage(err, "Không thể thêm bằng chứng.") };
  }
}
