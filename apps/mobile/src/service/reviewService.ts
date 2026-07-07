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

export { getReviewsByLocation };
