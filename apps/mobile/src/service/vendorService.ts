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
  viewCount: number;
  categoryId: string;
  reviewCount: number;
  avgRating: number;
  updatedAt: string;
}

export interface OwnedLocation {
  _id: string;
  name: string;
  address: string;
  status: string;
  updatedAt?: string;
}

export interface VendorDashboardOverview {
  totalLocations: number;
  totalViews: number;
  totalReviews: number;
  avgRating: number;
}

const getOwnedLocations = async () => {
  try {
    const response = await api.get('/location/owned');
    if (response.data?.success) {
      return {
        success: true,
        data: response.data.data as OwnedLocation[],
      };
    }
    return {
      success: false,
      message: response.data?.message || 'Không thể lấy danh sách địa điểm',
    };
  } catch (error: unknown) {
    console.error('Error fetching owned locations:', error);
    return {
      success: false,
      message: getVendorError(error, 'Không thể lấy danh sách địa điểm'),
    };
  }
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

export { getOwnedLocations, getDashboardOverview, getLocationStats };
