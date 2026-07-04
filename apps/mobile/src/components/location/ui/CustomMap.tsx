import { useLocationContext } from "@/contexts/locationContext";
import { getCurrentLocation } from "@/service/locationService";
import {
  Camera,
  CameraRef,
  Map,
  StyleSpecification,
  ViewAnnotation,
} from "@maplibre/maplibre-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { IconButton, Text } from "react-native-paper";

const MAP_API =
  process.env.EXPO_PUBLIC_MAP_APu ||
  "https://demotiles.maplibre.org/style.json";

const emptyGeoJson = {
  type: "FeatureCollection" as const,
  features: [],
};

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

export default function CustomMap({
  coordinates,
  setCoordinates,
  previewMode,
}) {
  const [mapStyle, setMapStyle] = useState<StyleSpecification | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const loadStyle = async () => {
      try {
        const response = await fetch(MAP_API);
        if (!response.ok) {
          throw new Error(`Map style request failed: ${response.status}`);
        }
        const styleJson = (await response.json()) as MutableMapStyle;
        if (!Array.isArray(styleJson.layers)) {
          throw new Error("Map style response is missing layers");
        }
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
        setMapStyle(styleJson as StyleSpecification);
        setMapError(null);
        setLoading(false);
      } catch (error) {
        console.error("Error loading map style:", error);
        setMapError(
          error instanceof Error ? error.message : "Không tải được bản đồ.",
        );
        setLoading(false);
      }
    };
    loadStyle();
  }, []);

  const getLocation = async () => {
    try {
      const response = await getCurrentLocation();
      cameraRef.current?.setStop({
        center: [response.coords.longitude, response.coords.latitude],
        zoom: 15,
        duration: 1000,
        easing: "ease",
      });
      setCoordinates([response.coords.longitude, response.coords.latitude]);
    } catch (error) {
      console.error("Error fetching current location:", error);
    }
  };

  useEffect(() => {
    if (!coordinates || !previewMode) return;

    cameraRef.current?.setStop({
      center: [coordinates[0], coordinates[1]],
      zoom: 15,
      duration: 1000,
      easing: "ease",
    });
  }, [coordinates]);
  if (loading) {
    return (
      <View
        style={{
          height: 300,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "white",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  if (mapError || !mapStyle) {
    return (
      <View
        style={{
          height: 300,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#eee",
        }}
      >
        <Text>{mapError || "Không có map style"}</Text>
      </View>
    );
  }
  return (
    <View
      style={{
        height: 300,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "white",
        position: "relative",
      }}
    >
      <Map
        mapStyle={mapStyle}
        ref={mapRef}
        style={{ flex: 1 }}
        onDidFinishLoadingMap={() => {
          console.log("Map loaded");
        }}
        onDidFailLoadingMap={() => {
          console.log("Map load failed");
        }}
        dragPan={previewMode ? false : true}
        touchZoom={previewMode ? false : true}
        doubleTapZoom={previewMode ? false : true}
        doubleTapHoldZoom={previewMode ? false : true}
        touchRotate={previewMode ? false : true}
        touchPitch={previewMode ? false : true}
        androidView="texture"
        onRegionDidChange={async () => {
          if (previewMode) return;
          const center = await mapRef.current?.getCenter();
          if (center) {
            setCoordinates([center[0], center[1]]);
          }
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: coordinates,
            zoom: 16,
          }}
        />
        {/* <ViewAnnotation
          id="picked-location"
          lngLat={coordinates}
          draggable
          anchor="bottom"
          onDragEnd={(event) => {
            const nextLngLat = event.nativeEvent.lngLat as [number, number];
            setCoordinates(nextLngLat);

            console.log("longitude:", nextLngLat[0]);
            console.log("latitude:", nextLngLat[1]);
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: "red",
              borderWidth: 3,
              borderColor: "white",
            }}
          />
        </ViewAnnotation> */}
      </Map>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 28,
          height: 28,
          marginLeft: -14,
          marginTop: -28,
          borderRadius: 14,
          backgroundColor: "red",
          borderWidth: 3,
          borderColor: "white",
        }}
      ></View>
      {!previewMode && (
        <IconButton
          icon="crosshairs-gps"
          mode="outlined"
          size={24}
          onPress={getLocation}
          style={{
            position: "absolute",
            right: 10,
            bottom: 10,
            backgroundColor: "white",
          }}
        />
      )}
    </View>
  );
}
