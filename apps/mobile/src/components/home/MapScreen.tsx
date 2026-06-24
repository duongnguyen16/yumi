import React from "react";
import { View } from "react-native";
import { Map, Camera } from "@maplibre/maplibre-react-native";
import { useLocationContext } from "@/contexts/locationContext";

const MAP_API = process.env.EXPO_PUBLIC_MAP_API;
const MAP_URL = `${process.env.EXPO_PUBLIC_MAP_URL}=${MAP_API}`;
export default function MapScreen() {
  const { location, setLocation } = useLocationContext();
  return (
    <View>
      <Map mapStyle={MAP_URL} style={{ flex: 1 }}>
        <Camera initialViewState={{ center: location, zoom: 10 }} />
      </Map>
    </View>
  );
}
