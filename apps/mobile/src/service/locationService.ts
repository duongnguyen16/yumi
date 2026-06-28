import * as Location from "expo-location";
import api from "./aixos";

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
    console.log("Fetched locations:", response.data);
    return response.data;
  } catch (error) {
    console.log("Error fetching locations:", error);
    return {
      success: false,
      locations: [],
      message: error?.response?.data?.message || "Lỗi khi lấy dữ liệu vị trí.",
    };
  }
};

const getLocationById = async (id: string) => {
  try {
    const response = await api.get(`/location/${id}`);
    return response.data;
  } catch (error) {
    console.log("Error while getLocationById: ", error);
    return {
      success: false,
      message: error?.response?.data.message || "Lỗi khi lấy dữ liệu",
    };
  }
};

export {
  getCurrentLocation,
  checkPermission,
  getAllLocations,
  getLocationById,
};
