import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Map,
  Camera,
  NativeUserLocation,
} from "@maplibre/maplibre-react-native";
import { useLocationContext } from "@/contexts/locationContext";

const MAP_API = process.env.EXPO_PUBLIC_MAP_API;
const MAP_URL = `${process.env.EXPO_PUBLIC_MAP_URL}=${MAP_API}`;
export default function MapScreen() {
  const { location, setLocation } = useLocationContext();
  const [mapStyle, setMapStyle] = useState(null);
  console.log(MAP_URL);
  useEffect(() => {
    const loadStyle = async () => {
      try {
        const response = await fetch(MAP_URL);
        const styleJson = await response.json();
        styleJson.layers = styleJson.layers.map((layer: any) => {
          const id = String(layer.id).toLowerCase();

          const shouldHide =
            layer.type === "symbol" &&
            (id.includes("poi") ||
              id.includes("business") ||
              id.includes("shop") ||
              id.includes("restaurant") ||
              id.includes("cafe") ||
              id.includes("hotel") ||
              id.includes("school") ||
              id.includes("hospital") ||
              id.includes("bank") ||
              id.includes("atm") ||
              id.includes("parking"));

          if (!shouldHide) return layer;

          return {
            ...layer,
            layout: {
              ...(layer.layout ?? {}),
              visibility: "none",
            },
          };
        });

        setMapStyle(styleJson);
      } catch (error) {
        console.error("Error loading map style:", error);
      }
    };
    loadStyle();
  }, []);
  return (
    <Map
      mapStyle={mapStyle}
      style={styles.map}
      onPress={(e) => console.log("Map pressed at:", e.nativeEvent.coordinate)}
    >
      <Camera initialViewState={{ center: location, zoom: 10 }} />
      <NativeUserLocation />
    </Map>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  markerText: {
    fontSize: 22,
  },
});
