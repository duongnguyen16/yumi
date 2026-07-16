import type { WorkflowTone } from "@/components/workflow/status";

const statuses: Record<string, { label: string; tone: WorkflowTone }> = {
  PUBLISHED: { label: "Đang hoạt động", tone: "success" },
  SUBMITTED: { label: "Đang chờ duyệt", tone: "warning" },
  PENDING_RE_APPROVAL: { label: "Đang chờ duyệt lại", tone: "warning" },
  REJECTED: { label: "Đã bị từ chối", tone: "danger" },
  HIDDEN: { label: "Đã ẩn", tone: "neutral" },
};

export function getLocationStatus(status?: string | null): { label: string; tone: WorkflowTone } {
  if (!status) return { label: "Chưa xác định", tone: "neutral" };
  return statuses[status] ?? { label: status.replaceAll("_", " ").toLocaleLowerCase("vi-VN"), tone: "neutral" };
}
