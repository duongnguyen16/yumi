import axios from "axios";
import api from "./aixos";

const getVendorError = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") return error.response.data.message;
  return fallback;
};

export interface VendorLocation {
  _id: string;
  name: string;
  address: string;
  status: string;
  viewCount: number;
  categoryId: string;
  reviewCount: number;
  avgRating: number;
  updatedAt: string;
}

export interface VendorDashboardOverview {
  totalLocations: number;
  totalViews: number;
  totalReviews: number;
  avgRating: number;
}

export type VendorReviewMutationResult = {
  success: boolean;
  message: string;
};

const getDashboardOverview = async () => {
  try {
    const response = await api.get('/vendor/dashboard/overview');
    if (response.data?.success) {
      return {
        success: true,
        data: response.data.data as VendorDashboardOverview,
      };
    }
    return {
      success: false,
      message: response.data?.message || 'Không thể tải tổng quan',
    };
  } catch (error: unknown) {
    console.error('Error fetching dashboard overview:', error);
    return {
      success: false,
      message: getVendorError(error, 'Không thể tải tổng quan'),
    };
  }
};

const getLocationStats = async (days?: number) => {
  try {
    const params = days ? { days } : {};
    const response = await api.get('/vendor/dashboard/locations', { params });
    if (response.data?.success) {
      return {
        success: true,
        data: response.data.data as VendorLocation[],
      };
    }
    return {
      success: false,
      message: response.data?.message || 'Không thể tải thống kê',
    };
  } catch (error: unknown) {
    console.error('Error fetching location stats:', error);
    return {
      success: false,
      message: getVendorError(error, 'Không thể tải thống kê'),
    };
  }
};

const replyReview = async (
  reviewId: string,
  content: string,
): Promise<VendorReviewMutationResult> => {
  try {
    const response = await api.post("/location/reply", {
      data: { reviewId, content },
    });
    return {
      success: response.data?.success !== false,
      message: response.data?.message || "Đã gửi phản hồi.",
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getVendorError(error, "Không thể gửi phản hồi lúc này."),
    };
  }
};

const editReviewReply = async (
  reviewId: string,
  content: string,
): Promise<VendorReviewMutationResult> => {
  try {
    const response = await api.patch("/location/reply/edit", {
      data: { reviewId, content },
    });
    return {
      success: response.data?.success !== false,
      message: response.data?.message || "Đã cập nhật phản hồi.",
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getVendorError(error, "Không thể cập nhật phản hồi lúc này."),
    };
  }
};

export { editReviewReply, getDashboardOverview, getLocationStats, replyReview };
