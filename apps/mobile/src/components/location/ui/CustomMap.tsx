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
import { View } from "react-native";
import { EmptyState, IconButton, LoadingState, NoticeSnackbar } from "@/ui/components";
import { getNoticeMessage } from "@/ui/feedback";
import { colors, radius, spacing } from "@/ui/tokens";

const MAP_API =
  process.env.EXPO_PUBLIC_MAP_API ||
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

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
  const [message, setMessage] = useState("");
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
        // styleJson.glyphs =
        //   styleJson.glyphs ||
        //   "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";
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
      if (!response.success || !response.locationData) {
        setMessage(response.message || "Không thể lấy vị trí hiện tại.");
        return;
      }
      cameraRef.current?.setStop({
        center: [
          response.locationData.coords.longitude,
          response.locationData.coords.latitude,
        ],
        zoom: 15,
        duration: 1000,
        easing: "ease",
      });
      setPinLocation({
        longitude: response.locationData.coords.longitude,
        latitude: response.locationData.coords.latitude,
      });
    } catch (error) {
      setMessage(getNoticeMessage(error, "Không thể lấy vị trí hiện tại."));
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
      <View style={{ height: 300 }}>
        <LoadingState label="Đang tải bản đồ" />
      </View>
    );
  }

  if (mapError || !mapStyle) {
    return (
      <View style={{ height: 300 }}>
        <EmptyState
          icon="alert-outline"
          supportingText={mapError || "Không có map style"}
          title="Không thể tải bản đồ"
        />
      </View>
    );
  }
  return (
    <View
      style={{
        height: 300,
        borderRadius: radius.large,
        overflow: "hidden",
        backgroundColor: colors.canvasMap,
        position: "relative",
      }}
    >
      <Map
        mapStyle={mapStyle}
        ref={mapRef}
        style={{ flex: 1 }}
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
        <MaterialCommunityIcons
          name="map-marker"
          size={42}
          color={colors.accentPrimary}
        />
      </View>
      {!previewMode && (
        <View
          style={{
            bottom: spacing[2],
            position: "absolute",
            right: spacing[2],
          }}
        >
          <IconButton
            icon="crosshairs-gps"
            label="Vị trí hiện tại"
            onPress={getLocation}
          />
        </View>
      )}
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </View>
  );
}

export default forwardRef<CustomMapHandle, CustomMapProps>(CustomMap);
