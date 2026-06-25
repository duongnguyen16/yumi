import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Map,
  Camera,
  NativeUserLocation,
  GeoJSONSource,
  Layer,
} from "@maplibre/maplibre-react-native";
import { useLocationContext } from "@/contexts/locationContext";
import { getAllLocations } from "@/service/locationService";

const MAP_API = process.env.EXPO_PUBLIC_MAP_API;
export default function MapScreen() {
  const { location, setLocation } = useLocationContext();
  const [mapStyle, setMapStyle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [geoJson, setGeoJson] = useState(null);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const response = await getAllLocations();
        if (response.success) {
          setGeoJson(response.locations);
        }
      } catch (error) {
        console.error("Error fetching locations:", error);
      }
    };
    fetchLocation();
  }, []);

  useEffect(() => {
    const loadStyle = async () => {
      try {
        console.log("Loading map style from API:", MAP_API);
        const response = await fetch(MAP_API);
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
        setLoading(false);
      } catch (error) {
        console.error("Error loading map style:", error);
        setLoading(false);
      }
    };
    loadStyle();
  }, []);
  if (loading || !mapStyle || !location) {
    return <View style={styles.container} />;
  }
  return (
    <View style={styles.container}>
      <Map mapStyle={mapStyle} style={styles.map}>
        <Camera initialViewState={{ center: location, zoom: 10 }} />
        <NativeUserLocation />
        <GeoJSONSource id="geojson" data={geoJson} />
        <Layer
          id="locations-circle"
          type="circle"
          source="geojson"
          paint={{
            "circle-radius": 8,
            "circle-color": "#ff5a5f",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          }}
        />
      </Map>
    </View>
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
