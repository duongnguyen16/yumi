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

export type VendorEditSuggestion = {
  id: string;
  locationId: string;
  location: {
    id: string;
    name?: string;
    address?: string;
    status?: string;
    ownerId?: string | null;
  } | null;
  user:
    | string
    | {
        _id?: string;
        id?: string;
        fullName?: string;
        email?: string;
        avatarUrl?: string;
      };
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
  status: string;
  routingTarget: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewReason?: string;
};

export type EditSuggestionReviewResult = {
  success: boolean;
  message: string;
  suggestion?: VendorEditSuggestion;
  result?: {
    action?: string;
    message?: string;
  };
};

const getEditSuggestionError = (error: unknown, fallback: string) => {
  const item = error as { response?: { data?: { message?: string | string[] } } };
  const message = item.response?.data?.message;
  if (Array.isArray(message)) return message.join(", ");
  return message || fallback;
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

const getVendorEditSuggestions = async () => {
  try {
    const response = await api.get("/edit-suggestions/vendor/inbox");
    return {
      success: response.data?.success !== false,
      suggestions: (response.data?.suggestions ?? []) as VendorEditSuggestion[],
      message: response.data?.message || "",
    };
  } catch (error: unknown) {
    return {
      success: false,
      suggestions: [] as VendorEditSuggestion[],
      message: getEditSuggestionError(
        error,
        "Không thể tải đề xuất chỉnh sửa lúc này.",
      ),
    };
  }
};

const applyVendorEditSuggestion = async (
  suggestionId: string,
): Promise<EditSuggestionReviewResult> => {
  try {
    const response = await api.patch(`/edit-suggestions/${suggestionId}/apply`, {});
    return {
      success: response.data?.success !== false,
      message: response.data?.message || "Đã áp dụng đề xuất.",
      suggestion: response.data?.suggestion,
      result: response.data?.result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getEditSuggestionError(error, "Không thể áp dụng đề xuất."),
    };
  }
};

const discardVendorEditSuggestion = async (
  suggestionId: string,
  reason?: string,
): Promise<EditSuggestionReviewResult> => {
  try {
    const response = await api.patch(`/edit-suggestions/${suggestionId}/discard`, {
      reason,
    });
    return {
      success: response.data?.success !== false,
      message: response.data?.message || "Đã bỏ qua đề xuất.",
      suggestion: response.data?.suggestion,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getEditSuggestionError(error, "Không thể bỏ qua đề xuất."),
    };
  }
};

export {
  applyVendorEditSuggestion,
  discardVendorEditSuggestion,
  getVendorEditSuggestions,
  submitEditSuggestion,
};
