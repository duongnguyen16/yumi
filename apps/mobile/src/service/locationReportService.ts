import api from "./aixos";

type LocationReportReason =
  | "INCORRECT_INFORMATION"
  | "SPAM"
  | "PERMANENTLY_CLOSED"
  | "OTHER";

type CreateLocationReportPayload = {
  reason: LocationReportReason;
  description: string;
};

const reportLocation = async (
  locationId: string,
  payload: CreateLocationReportPayload,
) => {
  try {
    const response = await api.post(`/locations/${locationId}/reports`, payload);
    return {
      success: true,
      report: response.data?.report,
      message: response.data?.message || "Đã gửi báo cáo địa điểm.",
    };
  } catch (error) {
    console.log("Error reporting location:", error);
    return {
      success: false,
      message:
        error?.response?.data?.message ||
        "Không thể gửi báo cáo địa điểm lúc này.",
    };
  }
};

export { reportLocation };
export type { CreateLocationReportPayload, LocationReportReason };
