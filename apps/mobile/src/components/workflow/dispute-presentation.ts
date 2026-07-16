import type { WorkflowTone } from "./status";

export type DisputeSide = "OWNER_AT_OPEN" | "REQUESTER";
export type DisputeOutcome = { title: string; detail: string; tone: WorkflowTone };

const outcomes: Record<string, DisputeOutcome> = {
  RESOLVED_KEEP: { detail: "Chủ tại thời điểm mở tranh chấp tiếp tục quản lý địa điểm.", title: "Giữ nguyên quyền quản lý", tone: "success" },
  RESOLVED_TRANSFER: { detail: "Quyền quản lý đã được chuyển cho người yêu cầu.", title: "Chuyển quyền quản lý", tone: "success" },
  RESOLVED_REVOKE: { detail: "Địa điểm hiện không còn chủ và có thể được nhận sở hữu lại.", title: "Thu hồi quyền quản lý", tone: "danger" },
};

export function getDisputeOutcome(status?: string | null): DisputeOutcome | null {
  return status ? outcomes[status] ?? null : null;
}

export function getDisputeSide(currentUserId?: string | null, vendorAId?: string | null, vendorBId?: string | null): DisputeSide | null {
  if (currentUserId && currentUserId === vendorAId) return "OWNER_AT_OPEN";
  if (currentUserId && currentUserId === vendorBId) return "REQUESTER";
  return null;
}
