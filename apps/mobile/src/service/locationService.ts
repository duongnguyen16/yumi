import * as Location from "expo-location";

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

export { getCurrentLocation, checkPermission };
