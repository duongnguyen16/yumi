import type { LocationReportReason } from "@/service/locationReportService";

type ReportActionInput = {
  locationId?: string;
  ownerId?: string;
  userId?: string;
};

type ReportValidationInput = {
  reason: LocationReportReason;
  description: string;
  evidenceCount: number;
};

const reportReasons: Array<{
  label: string;
  value: LocationReportReason;
}> = [
  { label: "Sai thông tin", value: "INCORRECT_INFORMATION" },
  { label: "Spam", value: "SPAM" },
  { label: "Đã đóng cửa", value: "PERMANENTLY_CLOSED" },
  { label: "Khác", value: "OTHER" },
];

export function getLocationReportAction({
  locationId,
  ownerId,
  userId,
}: ReportActionInput) {
  if (!locationId || (ownerId && ownerId === userId)) return "hidden" as const;
  return userId ? ("compose" as const) : ("authenticate" as const);
}

export function getLocationReportReasons(hasOwner: boolean) {
  if (!hasOwner) return reportReasons;
  return [
    ...reportReasons.slice(0, 3),
    { label: "Chủ sở hữu sai", value: "WRONG_OWNER" as const },
    reportReasons[3],
  ];
}

export function validateLocationReport({
  reason,
  description,
  evidenceCount,
}: ReportValidationInput) {
  const length = description.trim().length;
  if (length < 10 || length > 1000)
    return "Mô tả báo cáo cần từ 10 đến 1000 ký tự.";
  if (reason === "WRONG_OWNER" && evidenceCount === 0)
    return "Báo cáo chủ sở hữu sai cần ít nhất 1 ảnh bằng chứng.";
  return null;
}
