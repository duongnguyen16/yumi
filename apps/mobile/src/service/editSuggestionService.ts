import api from "./aixos";

export type EditSuggestionFlag =
  | "PERMANENTLY_CLOSED"
  | "DUPLICATE"
  | "NON_EXISTENT";

export type EditSuggestionChange =
  | {
      fieldName: "openingHours" | "phone";
      textValue: string;
    }
  | {
      fieldName: "geo";
      geoValue: {
        latitude: number;
        longitude: number;
        accuracyMeters?: number;
      };
    }
  | {
      fieldName: "flag";
      flagValue: EditSuggestionFlag;
    };

export type SubmitEditSuggestionPayload = {
  changes: EditSuggestionChange[];
  note?: string;
};

const submitEditSuggestion = async (
  locationId: string,
  payload: SubmitEditSuggestionPayload,
) => {
  try {
    const response = await api.post(
      `/locations/${locationId}/edit-suggestions`,
      payload,
    );
    return {
      success: true,
      routingTarget: response.data?.routingTarget,
      suggestions: response.data?.suggestions ?? [],
      message: response.data?.message || "Đã gửi đề xuất chỉnh sửa.",
    };
  } catch (error) {
    console.log("Error submitting edit suggestion:", error);
    return {
      success: false,
      message:
        error?.response?.data?.message ||
        "Không thể gửi đề xuất chỉnh sửa lúc này.",
    };
  }
};

export { submitEditSuggestion };
