import * as Location from "expo-location";
import api from "./aixos";
import { success } from "zod";

const emptyLocations = {
  type: "FeatureCollection" as const,
  features: [],
};

const getCurrentLocation = async () => {
  try {
    const hasPermission = await checkPermission();
    if (!hasPermission) {
      throw new Error("Permission to access location was denied");
    }
    const locationWatch = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return locationWatch;
  } catch (error) {
    console.error("Error starting location watch:", error);
  }
};

const checkPermission = async () => {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== "granted") {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return false;
    }
  }
  return true;
};

const getAllLocations = async () => {
  try {
    const response = await api.get("/location");
    return response.data;
  } catch (error) {
    console.log("Error fetching locations:", error);
    return {
      success: false,
      locations: emptyLocations,
      message: error?.response?.data?.message || "Lỗi khi lấy dữ liệu vị trí.",
    };
  }
};

const getLocationById = async (id: string) => {
  try {
    const response = await api.get(`/location/${id}`);
    if (response.data?.success) {
      return { success: true, data: response.data.location };
    }
  } catch (error) {
    console.log("Error while getLocationById: ", error);
    return {
      success: false,
      message: error?.response?.data?.message || "Lỗi khi lấy dữ liệu",
    };
  }
};

const viewCount = async (locationId: string) => {
  try {
    await api.post(`/location/view-count/${locationId}`);
  } catch (error) {
    console.log("Error while viewCount: ", error);
  }
};

const searchLocation = async (
  keyword: string,
  categoryId: string,
  subCategoryId = [],
  page: number,
  limit = 10,
  lng: number,
  lat: number,
) => {
  try {
    const response = await api.get("/location/search", {
      params: {
        keyword: keyword?.trim() || undefined,
        categoryId: categoryId || undefined,
        subCategoryId:
          subCategoryId.length > 0 ? subCategoryId.join(",") : undefined,
        limit,
        page,
        lat,
        lng,
      },
    });
    return response.data;
  } catch (error) {
    return {
      success: false,
      message: error?.response?.data?.message || "Đã có lỗi xảy ra",
    };
  }
};

const updateLocation = async (formData: FormData, locationId: string) => {
  try {
    console.log("Submitting formData for updateLocation:", formData);
    const response = await api.post(
      `/location/update/${locationId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error updating location:", error);
    return {
      success: false,
      message: error?.response?.data?.message || "Đã có lỗi xảy ra",
    };
  }
};

const getSystemCode = async () => {
  try {
    const response = await api.get("/location/register/code");
    return { code: response.data.code, success: true };
  } catch (error) {
    console.error("Error getting system code:", error);
    return {
      success: false,
      message: error?.response?.data?.message || "Đã có lỗi xảy ra",
    };
  }
};

const sentUpdatePhoneOtp = async (locationId: string, newPhone: string) => {
  try {
    const response = await api.post(`/location/update/send-otp`, {
      newPhone: newPhone,
      locationId: locationId,
    });

    return response.data;
  } catch (error) {
    console.error("Error sending update phone OTP:", error.response?.data);
    return {
      success: false,
      message: error?.response?.data?.message || "Đã có lỗi xảy ra",
    };
  }
};

const verifyUpdatePhoneOtp = async (locationId: string, otp: string) => {
  try {
    const response = await api.post(`/location/update/verify-otp`, {
      locationId: locationId,
      otp: otp,
    });
    console.log("verifyUpdatePhoneOtp response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error verifying update phone OTP:", error);
    return {
      success: false,
      message: error?.response?.data?.message || "Đã có lỗi xảy ra",
    };
  }
};

export {
  getCurrentLocation,
  checkPermission,
  getAllLocations,
  getLocationById,
  viewCount,
  searchLocation,
  updateLocation,
  sentUpdatePhoneOtp,
  verifyUpdatePhoneOtp,
  getSystemCode,
};
