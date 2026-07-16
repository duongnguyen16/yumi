import { getCurrentLocation } from "@/service/locationService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Camera,
  CameraRef,
  Map,
  MapRef,
  StyleSpecification,
} from "@maplibre/maplibre-react-native";
import {
  forwardRef,
  ForwardedRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { IconButton, Text } from "react-native-paper";

const MAP_API =
  process.env.EXPO_PUBLIC_MAP_API ||
  "https://demotiles.maplibre.org/style.json";

const GLYPH_URL = "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf";
const TEXT_FONT = ["Open Sans Regular"];

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

export type PinLocation = {
  longitude: number;
  latitude: number;
};

export type CustomMapHandle = {
  syncPinToCenter: () => Promise<PinLocation | null>;
};

type Coordinates = [number, number];

type CustomMapProps = {
  coordinates: Coordinates | null;
  setCoordinates?: (coordinates: Coordinates | null) => void;
  previewMode: boolean;
  pinLocation: PinLocation | null;
  setPinLocation: (pinLocation: PinLocation) => void;
};

function CustomMap(
  { coordinates, previewMode, pinLocation, setPinLocation }: CustomMapProps,
  ref: ForwardedRef<CustomMapHandle>,
) {
  const [mapStyle, setMapStyle] = useState<StyleSpecification | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const cameraRef = useRef<CameraRef>(null);
  const mapRef = useRef<MapRef>(null);

  const syncPinToCenter = useCallback(async () => {
    if (previewMode) return pinLocation ?? null;

    const center = await mapRef.current?.getCenter();
    if (!center) return null;

    const nextPinLocation = {
      longitude: center[0],
      latitude: center[1],
    };
    setPinLocation(nextPinLocation);
    return nextPinLocation;
  }, [pinLocation, previewMode, setPinLocation]);

  useImperativeHandle(ref, () => ({ syncPinToCenter }), [syncPinToCenter]);

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
        styleJson.glyphs = GLYPH_URL;
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

          const nextLayer =
            layer.type === "symbol"
              ? {
                  ...layer,
                  layout: {
                    ...(layer.layout ?? {}),
                    "text-font": TEXT_FONT,
                  },
                }
              : layer;

          if (!shouldHide) return nextLayer;

          return {
            ...nextLayer,
            layout: {
              ...(nextLayer.layout ?? {}),
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
      if (!response) {
        Alert.alert(
          "Không thể lấy vị trí thiết bị. Vui lòng kiểm tra quyền truy cập vị trí.",
        );
        setLoading(false);
        return;
      }
      cameraRef.current?.setStop({
        center: [response.coords.longitude, response.coords.latitude],
        zoom: 15,
        duration: 1000,
        easing: "ease",
      });
      setPinLocation({
        longitude: response.coords.longitude,
        latitude: response.coords.latitude,
      });
    } catch (error) {
      console.error("Error fetching current location:", error);
    }
  };

  const previewCenter = useMemo<Coordinates | null>(
    () =>
      pinLocation ? [pinLocation.longitude, pinLocation.latitude] : coordinates,
    [coordinates, pinLocation],
  );

  useEffect(() => {
    if (!pinLocation || !previewMode) return;
    const previewCenter: Coordinates = [
      pinLocation.longitude,
      pinLocation.latitude,
    ];
    cameraRef.current?.setStop({
      center: previewCenter,
      zoom: 15,
      duration: 1000,
      easing: "ease",
    });
  }, [pinLocation, previewMode]);
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
          await syncPinToCenter();
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: previewCenter || [0, 0],
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
          marginLeft: -14,
          marginTop: -28,
        }}
      >
        <MaterialCommunityIcons name="map-marker" size={42} color="#ff5a1f" />
      </View>
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

export default forwardRef<CustomMapHandle, CustomMapProps>(CustomMap);
