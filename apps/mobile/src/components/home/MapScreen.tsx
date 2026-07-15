import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { BackHandler, Keyboard, View, type TextInput } from "react-native";
import { Camera, type CameraRef, GeoJSONSource, Layer, Map, NativeUserLocation } from "@maplibre/maplibre-react-native";
import type { StyleSpecification } from "@maplibre/maplibre-react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useLocationContext } from "@/contexts/locationContext";
import { userContext } from "@/contexts/userContext";
import { getAllLocations, getCurrentLocation } from "@/service/locationService";
import { ActionSheet, EmptyState, LoadingState, MapCanvas, MapControls, MapSearchDock } from "@/ui/components";
import { colors } from "@/ui/tokens";
import LocationSearchScreen from "../location/LocationSearchScreen";

const MAP_API = process.env.EXPO_PUBLIC_MAP_APu || "https://demotiles.maplibre.org/style.json";
const emptyGeoJson = { type: "FeatureCollection" as const, features: [] };

type MapStyleLayer = { id: string | number; type?: string; layout?: Record<string, unknown>; [key: string]: unknown };
type MutableMapStyle = Omit<StyleSpecification, "layers"> & { glyphs?: string; layers: MapStyleLayer[] };

export default function MapScreen() {
  const { location, setLocation } = useLocationContext();
  const { user } = useContext(userContext);
  const [mapStyle, setMapStyle] = useState<StyleSpecification | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [geoJson, setGeoJson] = useState(emptyGeoJson);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScreen, setSearchScreen] = useState(false);
  const [actionVisible, setActionVisible] = useState(false);
  const [phoneSheetVisible, setPhoneSheetVisible] = useState(false);
  const cameraRef = useRef<CameraRef>(null);
  const searchInputRef = useRef<TextInput>(null);
  const router = useRouter();

  useEffect(() => {
    getAllLocations()
      .then((response) => setGeoJson(response.locations ?? emptyGeoJson))
      .catch((error) => console.error("Error fetching locations:", error));
  }, []);

  useEffect(() => {
    const loadStyle = async () => {
      try {
        const response = await fetch(MAP_API);
        if (!response.ok) throw new Error(`Map style request failed: ${response.status}`);
        const styleJson = (await response.json()) as MutableMapStyle;
        if (!Array.isArray(styleJson.layers)) throw new Error("Map style response is missing layers");
        styleJson.glyphs = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";
        styleJson.layers = styleJson.layers.map((layer) => {
          const id = String(layer.id).toLowerCase();
          const shouldHide = layer.type === "symbol" && ["poi", "business", "shop", "restaurant", "cafe", "hotel", "school", "hospital", "bank", "atm", "parking"].some((value) => id.includes(value));
          return shouldHide ? { ...layer, layout: { ...(layer.layout ?? {}), visibility: "none" } } : layer;
        });
        setMapStyle(styleJson as StyleSpecification);
        setMapError(null);
      } catch (error) {
        setMapError(error instanceof Error ? error.message : "Không tải được bản đồ.");
      } finally {
        setLoading(false);
      }
    };
    loadStyle();
  }, []);

  const closeSearch = useCallback(() => {
    searchInputRef.current?.blur();
    Keyboard.dismiss();
    setSearchQuery("");
    setSearchScreen(false);
  }, []);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!searchScreen) return false;
      closeSearch();
      return true;
    });
    return () => subscription.remove();
  }, [closeSearch, searchScreen]));

  const setCurrentLocation = async () => {
    const currentLocation = await getCurrentLocation();
    if (!currentLocation) return;
    const coordinates: [number, number] = [currentLocation.coords.longitude, currentLocation.coords.latitude];
    setLocation(coordinates);
    cameraRef.current?.setStop({ center: coordinates, zoom: 15, duration: 1000, easing: "ease" });
  };

  const openContribution = (type: "add" | "register") => {
    setActionVisible(false);
    if (type === "register" && user?.phoneVerified !== true) {
      setPhoneSheetVisible(true);
      return;
    }
    router.push({ pathname: "/contribute", params: { type } });
  };

  if (loading) return <LoadingState label="Đang tải bản đồ" />;
  if (!mapStyle || !location) return <EmptyState icon="alert-outline" title="Không hiện được bản đồ" supportingText={mapError || "Không có dữ liệu vị trí hiện tại."} />;

  return (
    <MapCanvas>
      <MapSearchDock inputRef={searchInputRef} onBack={searchScreen ? closeSearch : undefined} onChangeText={setSearchQuery} onFocus={() => setSearchScreen(true)} value={searchQuery} />
      {searchScreen ? (
        <LocationSearchScreen searchQuery={searchQuery} />
      ) : (
        <View style={{ flex: 1 }}>
          <Map mapStyle={mapStyle} style={{ flex: 1 }}>
            <Camera initialViewState={{ center: location, zoom: 10 }} ref={cameraRef} />
            <NativeUserLocation />
            <GeoJSONSource
              cluster
              clusterMaxZoom={14}
              clusterRadius={20}
              data={geoJson}
              id="geojson"
              onPress={(event) => {
                event.stopPropagation();
                const feature = event.nativeEvent.features?.[0];
                if (feature?.properties.id) router.push({ pathname: "/location/[id]", params: { id: feature.properties.id } });
              }}
            >
              <Layer filter={["has", "point_count"]} id="locations-cluster" paint={{ "circle-color": colors.textPrimary, "circle-radius": 18, "circle-stroke-color": colors.surfaceBase, "circle-stroke-width": 2 }} source="geojson" type="circle" />
              <Layer filter={["has", "point_count"]} id="locations-cluster-count" layout={{ "text-anchor": "center", "text-field": ["get", "point_count_abbreviated"], "text-size": 14 }} paint={{ "text-color": colors.textInverse }} source="geojson" type="symbol" />
              <Layer filter={["!", ["has", "point_count"]]} id="locations-circle" paint={{ "circle-color": colors.accentPrimary, "circle-radius": 8, "circle-stroke-color": colors.surfaceBase, "circle-stroke-width": 2 }} source="geojson" type="circle" />
              <Layer filter={["!", ["has", "point_count"]]} id="locations-label" layout={{ "text-allow-overlap": false, "text-anchor": "top", "text-field": ["get", "name"], "text-ignore-placement": false, "text-offset": [0, 1.5], "text-size": 12 }} paint={{ "text-color": colors.textPrimary, "text-halo-color": colors.surfaceBase, "text-halo-width": 1.5 }} source="geojson" type="symbol" />
            </GeoJSONSource>
          </Map>
          <MapControls onAdd={() => setActionVisible(true)} onLocate={setCurrentLocation} />
        </View>
      )}
      <ActionSheet
        actions={[
          { icon: "file-document-edit-outline", label: "Đăng ký địa điểm", onPress: () => openContribution("register") },
          { icon: "map-marker-plus-outline", label: "Đóng góp địa điểm", onPress: () => openContribution("add") },
        ]}
        onDismiss={() => setActionVisible(false)}
        title="Bạn muốn làm gì?"
        visible={actionVisible}
      />
      <ActionSheet
        actions={[
          { icon: "account-check-outline", label: "Đến tài khoản", onPress: () => { setPhoneSheetVisible(false); router.push("/profile"); } },
          { icon: "close", label: "Để sau", onPress: () => setPhoneSheetVisible(false) },
        ]}
        message="Bạn cần xác minh số điện thoại trước khi đăng ký địa điểm."
        onDismiss={() => setPhoneSheetVisible(false)}
        title="Cần xác minh số điện thoại"
        visible={phoneSheetVisible}
      />
    </MapCanvas>
  );
}
