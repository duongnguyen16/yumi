import api from "./aixos";

export type ReviewUser = {
  id?: string;
  fullName?: string;
  avatarUrl?: string | null;
};

export type ReviewReply = {
  vendorId: string;
  content: string;
  createdAt: string;
};

export type LocationReview = {
  id: string;
  rating: number;
  comment: string;
  images: Array<{ url: string; isCover?: boolean; uploadedAt?: string }>;
  reply?: ReviewReply | null;
  createdAt: string;
  updatedAt?: string;
  user?: ReviewUser | null;
};

export type ReviewSummary = {
  avgRating: number;
  reviewCount: number;
};

export type CreateReviewPayload = {
  locationId: string;
  rating: number;
  comment: string;
  imageUrls?: string[];
  deviceLatitude?: number;
  deviceLongitude?: number;
  accuracyMeters?: number;
};

export type UpdateReviewPayload = {
  rating?: number;
  comment?: string;
  imageUrls?: string[];
};

const emptySummary: ReviewSummary = {
  avgRating: 0,
  reviewCount: 0,
};

const getReviewsByLocation = async (locationId: string) => {
  try {
    const response = await api.get(`/reviews/location/${locationId}`);
    return {
      success: true,
      summary: response.data?.summary ?? emptySummary,
      reviews: response.data?.reviews ?? [],
    };
  } catch (error) {
    console.log("Error fetching reviews:", error);
    return {
      success: false,
      summary: emptySummary,
      reviews: [],
      message:
        error?.response?.data?.message || "Không thể tải danh sách đánh giá.",
    };
  }
};

const createReview = async (payload: CreateReviewPayload) => {
  try {
    const response = await api.post("/reviews", payload);
    return {
      success: true,
      review: response.data?.review,
      message: response.data?.message || "Đã gửi đánh giá.",
    };
  } catch (error) {
    console.log("Error creating review:", error);
    return {
      success: false,
      message:
        error?.response?.data?.message || "Không thể gửi đánh giá lúc này.",
    };
  }
};

const updateReview = async (reviewId: string, payload: UpdateReviewPayload) => {
  try {
    const response = await api.patch(`/reviews/${reviewId}`, payload);
    return {
      success: true,
      review: response.data?.review,
      message: response.data?.message || "Đã cập nhật đánh giá.",
    };
  } catch (error) {
    console.log("Error updating review:", error);
    return {
      success: false,
      message:
        error?.response?.data?.message ||
        "Không thể cập nhật đánh giá lúc này.",
    };
  }
};

const deleteReview = async (reviewId: string) => {
  try {
    const response = await api.delete(`/reviews/${reviewId}`);
    return {
      success: true,
      message: response.data?.message || "Đã xóa đánh giá.",
    };
  } catch (error) {
    console.log("Error deleting review:", error);
    return {
      success: false,
      message:
        error?.response?.data?.message || "Không thể xóa đánh giá lúc này.",
    };
  }
};

export { createReview, deleteReview, getReviewsByLocation, updateReview };
