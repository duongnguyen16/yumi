import React, { createContext, useContext, useEffect, useState } from "react";
import * as Location from "expo-location";
import { checkPermission } from "@/service/locationService";
const locationContext = createContext(null);

export default function LocationContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [location, setLocation] = useState([105.83991, 21.028]);
  const [permission, setPermission] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    let watch;
    const watchLocation = async () => {
      try {
        const hasPermission = await checkPermission();
        if (!hasPermission) {
          setLocationError(
            "Ứng dụng chưa được cấp quyền vị trí. Một số tính năng bản đồ sẽ bị hạn chế.",
          );
          return;
        }
        setPermission(true);
        setLocationError("");
        watch = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000,
            distanceInterval: 10,
          },
          (location) =>
            setLocation([location.coords.longitude, location.coords.latitude]),
        );
      } catch (error) {
        console.error("Error starting location watch:", error);
        setLocationError("Không thể theo dõi vị trí hiện tại.");
      }
    };
    watchLocation();
    return () => watch?.remove();
  }, []);
  return (
    <locationContext.Provider
      value={{
        location,
        setLocation,
        permission,
        setPermission,
        locationError,
        clearLocationError: () => setLocationError(""),
      }}
    >
      {children}
    </locationContext.Provider>
  );
}

export const useLocationContext = () => {
  const context = useContext(locationContext);
  return context;
};
