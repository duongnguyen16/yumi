export type WorkflowTone = "neutral" | "info" | "success" | "warning" | "danger";

const statuses: Record<string, { label: string; tone: WorkflowTone }> = {
  PENDING: { label: "Đang chờ xử lý", tone: "warning" },
  PENDING_OPEN: { label: "Đang chờ phản hồi", tone: "warning" },
  PENDING_TIMED_OUT: { label: "Đã quá hạn phản hồi", tone: "warning" },
  OPEN: { label: "Đang xử lý", tone: "info" },
  ESCALATED: { label: "Đã mở tranh chấp", tone: "info" },
  GRANTED: { label: "Đã chuyển quyền", tone: "success" },
  AUTO_GRANTED: { label: "Đã tự động chuyển quyền", tone: "success" },
  APPROVED: { label: "Đã chấp thuận", tone: "success" },
  REJECTED: { label: "Đã từ chối", tone: "danger" },
  EXPIRED: { label: "Đã hết hạn", tone: "neutral" },
  RESOLVED: { label: "Đã giải quyết", tone: "success" },
};

export function getWorkflowStatus(status?: string | null) {
  if (!status) return { label: "Chưa xác định", tone: "neutral" as const };
  return statuses[status] ?? { label: status.replaceAll("_", " ").toLocaleLowerCase("vi-VN"), tone: "neutral" as const };
}
