import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View, Keyboard, BackHandler } from "react-native";
import {
  Map,
  Camera,
  NativeUserLocation,
  GeoJSONSource,
  Layer,
  CameraRef,
} from "@maplibre/maplibre-react-native";
import type { StyleSpecification } from "@maplibre/maplibre-react-native";
import { useLocationContext } from "@/contexts/locationContext";
import { getAllLocations, getCurrentLocation } from "@/service/locationService";
import { IconButton, Text, TextInput } from "react-native-paper";
import { useFocusEffect, useRouter } from "expo-router";
import LocationSearchScreen from "../location/LocationSearchScreen";

const MAP_API =
  process.env.EXPO_PUBLIC_MAP_APw ||
  "https://demotiles.maplibre.org/style.json";

type MapStyleLayer = {
  id: string | number;
  type?: string;
  layout?: Record<string, unknown>;
  [key: string]: unknown;
};

type MutableMapStyle = Omit<StyleSpecification, "layers"> & {
  glyphs?: string;
  layers: MapStyleLayer[];
};

export default function MapScreen() {
  const { location, setLocation } = useLocationContext();
  const [mapStyle, setMapStyle] = useState<StyleSpecification | null>(null);
  const [loading, setLoading] = useState(true);
  const [geoJson, setGeoJson] = useState(null);
  const cameraRef = useRef<CameraRef>(null);
  const router = useRouter();
  const searchInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScreen, setSearchScreen] = useState(false);

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
        styleJson.glyphs =
          "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";
        styleJson.layers = styleJson.layers.map((layer) => {
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

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (searchScreen) {
            setSearchScreen(false);
            return true;
          }

          return false;
        },
      );

      return () => subscription.remove();
    }, [searchScreen]),
  );

  const setCurrentLocation = async () => {
    try {
      const currentLocation = await getCurrentLocation();

      console.log("Current location fetched:", currentLocation);

      if (!currentLocation) {
        console.error("Current location is null or undefined");
        return;
      }

      const coords: [number, number] = [
        currentLocation.coords.longitude,
        currentLocation.coords.latitude,
      ];

      setLocation(coords);

      cameraRef.current?.setStop({
        center: [
          currentLocation.coords.longitude,
          currentLocation.coords.latitude,
        ],
        zoom: 15,
        duration: 1000,
        easing: "ease",
      });
    } catch (error) {
      console.error("Error getting current location:", error);
    }
  };

  if (loading || !mapStyle || !location) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        mode="outlined"
        outlineStyle={{ borderRadius: 20 }}
        placeholder="Tìm kiếm..."
        ref={searchInputRef}
        onFocus={() => setSearchScreen(true)}
        left={
          searchScreen ? (
            <TextInput.Icon
              icon="arrow-left"
              onPress={() => setSearchScreen(false)}
            />
          ) : null
        }
        right={
          <TextInput.Icon
            icon={() => (
              <View style={styles.rightIcons}>
                <IconButton icon="magnify" size={20} />
              </View>
            )}
          />
        }
      />

      {searchScreen ? (
        <LocationSearchScreen />
      ) : (
        <View style={styles.container}>
          <Map
            mapStyle={mapStyle}
            style={styles.map}
            onPress={() => {
              searchInputRef.current?.blur();
              Keyboard.dismiss();
            }}
          >
            <Camera
              initialViewState={{ center: location, zoom: 10 }}
              ref={cameraRef}
            />

            <NativeUserLocation />

            <GeoJSONSource
              id="geojson"
              data={geoJson}
              cluster={true}
              clusterRadius={20}
              clusterMaxZoom={14}
              onPress={(e) => {
                const feature = e.nativeEvent.features?.[0];
                if (!feature) return;
                if (!feature.properties.id) return;

                router.push({
                  pathname: "/location/[id]",
                  params: { id: feature.properties.id },
                });
              }}
            />

            <Layer
              id="locations-cluster"
              type="circle"
              source="geojson"
              filter={["has", "point_count"]}
              paint={{
                "circle-radius": 18,
                "circle-color": "#ff5a5f",
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
              }}
            />

            <Layer
              id="locations-cluster-count"
              type="symbol"
              source="geojson"
              filter={["has", "point_count"]}
              layout={{
                "text-field": ["get", "point_count"],
                "text-size": 14,
                "text-anchor": "center",
              }}
              paint={{
                "text-color": "#ffffff",
              }}
            />

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

            <Layer
              id="locations-label"
              type="symbol"
              source="geojson"
              layout={{
                "text-field": ["get", "name"],
                "text-size": 12,
                "text-offset": [0, 1.5],
                "text-anchor": "top",
                "text-allow-overlap": false,
                "text-ignore-placement": false,
              }}
              paint={{
                "text-color": "#111111",
                "text-halo-color": "#ffffff",
                "text-halo-width": 1.5,
              }}
            />
          </Map>

          <View style={styles.buttonGroup}>
            <IconButton
              mode="contained"
              size={35}
              icon="crosshairs-gps"
              onPress={() => {
                setCurrentLocation();
              }}
            />

            <IconButton mode="contained" size={35} icon="plus" />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
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
  buttonGroup: {
    position: "absolute",
    bottom: 20,
    right: 20,
  },
  searchInput: {
    position: "absolute",
    width: "95%",
    height: 40,
    top: 10,
    alignSelf: "center",
    zIndex: 10,
    elevation: 10,
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: 80,
  },
});
