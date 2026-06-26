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

  useEffect(() => {
    let watch;
    const watchLocation = async () => {
      try {
        const hasPermission = await checkPermission();
        if (!hasPermission) {
          throw new Error("Permission to access location was denied");
        }
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
