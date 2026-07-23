import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Keyboard,
  ScrollView,
  View,
  type TextInput,
} from "react-native";
import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  NativeUserLocation,
} from "@maplibre/maplibre-react-native";
import type { StyleSpecification } from "@maplibre/maplibre-react-native";
import {
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from "expo-router";
import { useLocationContext } from "@/contexts/locationContext";
import {
  getMapLocationPreview,
  mapSelectionZoom,
  type MapLocationPreview,
} from "@/common/map-location";
import {
  getAllLocations,
  getCurrentLocation,
  getLocationById,
} from "@/service/locationService";
import { getAllCategories } from "@/service/categoryService";
import { getUnreadCount } from "@/service/notificationService";
import {
  clearExploreLocationAction,
  setExploreLocationAction,
} from "@/navigation/exploreTabAction";
import {
  Chip,
  EmptyState,
  LoadingState,
  MapCanvas,
  MapSearchDock,
} from "@/ui/components";
import { colors, spacing } from "@/ui/tokens";
import LocationSearchScreen from "../location/LocationSearchScreen";
import { MapLocationDrawer } from "./MapLocationDrawer";
import {
  EXPLORE_CATEGORY_BAR_HEIGHT,
  EXPLORE_NEARBY_ZOOM,
} from "./explore-presentation";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MAP_API =
  process.env.EXPO_PUBLIC_MAP_API ||
  "https://demotiles.maplibre.org/style.json";
const emptyGeoJson = { type: "FeatureCollection" as const, features: [] };

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
type CategoryOption = { _id: string; name: string; isActive?: boolean };

export default function MapScreen() {
  const { location, setLocation } = useLocationContext();
  const { locationId } = useLocalSearchParams<{ locationId?: string }>();
  const [mapStyle, setMapStyle] = useState<StyleSpecification | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [geoJson, setGeoJson] = useState(emptyGeoJson);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScreen, setSearchScreen] = useState(false);
  const [searchCategoryId, setSearchCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedLocation, setSelectedLocation] =
    useState<MapLocationPreview | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const cameraRef = useRef<CameraRef>(null);
  const searchInputRef = useRef<TextInput>(null);
  const hasAutoCentered = useRef(false);
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    getAllLocations()
      .then((response) => setGeoJson(response.locations ?? emptyGeoJson))
      .catch((error) => console.error("Error fetching locations:", error));
    getAllCategories()
      .then((response) => {
        if (response.success) {
          setCategories(
            (response.data ?? []).filter(
              (category: CategoryOption) => category.isActive !== false,
            ),
          );
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = () =>
      getUnreadCount().then((response) => {
        if (active && response.success) setUnreadCount(response.count);
      });
    refresh();
    const interval = setInterval(refresh, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const loadStyle = async () => {
      try {
        const response = await fetch(MAP_API);
        if (!response.ok)
          throw new Error(`Map style request failed: ${response.status}`);
        const styleJson = (await response.json()) as MutableMapStyle;
        if (!Array.isArray(styleJson.layers))
          throw new Error("Map style response is missing layers");
        // styleJson.glyphs = styleJson.glyphs || "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";
        styleJson.layers = styleJson.layers.map((layer) => {
          const id = String(layer.id).toLowerCase();
          const shouldHide =
            layer.type === "symbol" &&
            [
              "poi",
              "business",
              "shop",
              "restaurant",
              "cafe",
              "hotel",
              "school",
              "hospital",
              "bank",
              "atm",
              "parking",
            ].some((value) => id.includes(value));
          return shouldHide
            ? {
                ...layer,
                layout: { ...(layer.layout ?? {}), visibility: "none" },
              }
            : layer;
        });
        setMapStyle(styleJson as StyleSpecification);
        setMapError(null);
      } catch (error) {
        setMapError(
          error instanceof Error ? error.message : "Không tải được bản đồ.",
        );
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
    setSearchCategoryId(null);
  }, []);

  const focusLocation = useCallback((preview: MapLocationPreview) => {
    searchInputRef.current?.blur();
    Keyboard.dismiss();
    setSearchQuery("");
    setSearchScreen(false);
    setSelectedLocation(preview);
    cameraRef.current?.setStop({
      center: preview.coordinates,
      duration: 700,
      easing: "ease",
      zoom: mapSelectionZoom,
    });
  }, []);

  const openSearch = useCallback((categoryId?: string) => {
    setSelectedLocation(null);
    setSearchCategoryId(categoryId ?? null);
    setSearchScreen(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!locationId) return;
    let active = true;
    getLocationById(locationId).then((response) => {
      const preview = response?.success
        ? getMapLocationPreview(response.data)
        : null;
      if (active && preview) focusLocation(preview);
    });
    return () => {
      active = false;
    };
  }, [focusLocation, locationId]);

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: selectedLocation ? { display: "none" } : undefined,
    });
    return () => navigation.setOptions({ tabBarStyle: undefined });
  }, [navigation, selectedLocation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (!searchScreen) return false;
          closeSearch();
          return true;
        },
      );
      return () => subscription.remove();
    }, [closeSearch, searchScreen]),
  );
  const setCurrentLocation = useCallback(async () => {
    const currentLocation = await getCurrentLocation();
    if (!currentLocation?.success || !currentLocation.locationData) {
      console.error(
        "Failed to get current location:",
        currentLocation?.message,
      );
      return;
    }
    setSelectedLocation(null);
    const coordinates: [number, number] = [
      currentLocation.locationData.coords.longitude,
      currentLocation.locationData.coords.latitude,
    ];
    setLocation(coordinates);
    cameraRef.current?.setStop({
      center: coordinates,
      zoom: EXPLORE_NEARBY_ZOOM,
      duration: 1000,
      easing: "ease",
    });
  }, [setLocation]);

  const setCameraByLocation = useCallback(async () => {
    if (!selectedLocation) return;
    cameraRef.current?.setStop({
      center: selectedLocation.coordinates,
      zoom: EXPLORE_NEARBY_ZOOM,
      duration: 1000,
      easing: "ease",
      padding: {
        bottom: 300,
      },
    });
  }, [selectedLocation]);

  useEffect(() => {
    if (!mapStyle || !selectedLocation) return;
    setCameraByLocation();
  }, [mapStyle, selectedLocation]);

  useEffect(() => {
    if (!mapStyle || locationId || hasAutoCentered.current) return;
    hasAutoCentered.current = true;
    void setCurrentLocation();
  }, [locationId, mapStyle, setCurrentLocation]);

  useEffect(() => {
    setExploreLocationAction(() => {
      void setCurrentLocation();
    });
    return clearExploreLocationAction;
  }, [setCurrentLocation]);

  if (loading) return <LoadingState label="Đang tải bản đồ" />;
  if (!mapStyle || !location)
    return (
      <EmptyState
        icon="alert-outline"
        title="Không hiện được bản đồ"
        supportingText={mapError || "Không có dữ liệu vị trí hiện tại."}
      />
    );

  return (
    <MapCanvas>
      <MapSearchDock
        inputRef={searchInputRef}
        isSearchOpen={searchScreen}
        notificationCount={unreadCount}
        onChangeText={setSearchQuery}
        onNotifications={() => router.push("/notifications")}
        onSearchClose={closeSearch}
        onSearchOpen={() => openSearch()}
        value={searchQuery}
      />
      {!searchScreen && categories.length > 0 ? (
        <ScrollView
          contentContainerStyle={{
            gap: spacing[2],
            paddingHorizontal: spacing[4],
          }}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{
            height: EXPLORE_CATEGORY_BAR_HEIGHT,
            left: 0,
            position: "absolute",
            right: 0,
            top: insets.top + 68,
            zIndex: 9,
          }}
        >
          {categories.map((category) => (
            <Chip
              key={category._id}
              label={category.name}
              onPress={() => openSearch(category._id)}
            />
          ))}
        </ScrollView>
      ) : null}
      {searchScreen ? (
        <LocationSearchScreen
          initialCategoryId={searchCategoryId}
          onSelectLocation={(item) => {
            const preview = getMapLocationPreview(item);
            if (preview) focusLocation(preview);
            else if (item?._id) router.push(`/location/${item._id}` as never);
          }}
          searchQuery={searchQuery}
        />
      ) : (
        <View style={{ flex: 1 }}>
          <Map mapStyle={mapStyle} style={{ flex: 1 }}>
            <Camera
              initialViewState={{
                center: location,
                zoom: EXPLORE_NEARBY_ZOOM,
              }}
              ref={cameraRef}
            />
            <NativeUserLocation />
            <GeoJSONSource
              cluster
              clusterMaxZoom={12}
              clusterRadius={20}
              data={geoJson}
              id="geojson"
              onPress={(event) => {
                event.stopPropagation();
                const feature = event.nativeEvent.features?.[0];
                const preview = getMapLocationPreview(feature);
                if (preview) focusLocation(preview);
              }}
            >
              <Layer
                filter={["has", "point_count"]}
                id="locations-cluster"
                paint={{
                  "circle-color": colors.textPrimary,
                  "circle-radius": 18,
                  "circle-stroke-color": colors.surfaceBase,
                  "circle-stroke-width": 2,
                }}
                source="geojson"
                type="circle"
              />
              <Layer
                filter={["has", "point_count"]}
                id="locations-cluster-count"
                layout={{
                  "text-anchor": "center",
                  "text-field": ["get", "point_count_abbreviated"],
                  "text-size": 14,
                  "text-font": ["Roboto Regular"],
                }}
                paint={{ "text-color": colors.textInverse }}
                source="geojson"
                type="symbol"
              />
              <Layer
                filter={["!", ["has", "point_count"]]}
                id="locations-circle"
                paint={{
                  "circle-color": colors.accentPrimary,
                  "circle-radius": 8,
                  "circle-stroke-color": colors.surfaceBase,
                  "circle-stroke-width": 2,
                }}
                source="geojson"
                type="circle"
              />
              <Layer
                filter={["!", ["has", "point_count"]]}
                id="locations-label"
                layout={{
                  "text-allow-overlap": false,
                  "text-anchor": "top",
                  "text-field": ["get", "name"],
                  "text-ignore-placement": false,
                  "text-offset": [0, 1.5],
                  "text-size": 12,
                  "text-font": ["Roboto Regular"],
                }}
                paint={{
                  "text-color": colors.textPrimary,
                  "text-halo-color": colors.surfaceBase,
                  "text-halo-width": 1.5,
                }}
                source="geojson"
                type="symbol"
              />
            </GeoJSONSource>
          </Map>
          <View
            pointerEvents="none"
            style={{
              height: insets.top + 144,
              left: 0,
              position: "absolute",
              right: 0,
              top: 0,
              zIndex: 2,
            }}
          >
            {/* <View
              style={{
                backgroundColor: colors.surfaceApp,
                flex: 3,
                opacity: 0.72,
              }}
            />
            <View
              style={{
                backgroundColor: colors.surfaceApp,
                flex: 2,
                opacity: 0.36,
              }}
            />
            <View
              style={{
                backgroundColor: colors.surfaceApp,
                flex: 1,
                opacity: 0.12,
              }}
            /> */}
          </View>
          <View
            pointerEvents="none"
            style={{
              bottom: 0,
              height: 156,
              left: 0,
              position: "absolute",
              right: 0,
              zIndex: 2,
            }}
          >
            {/* <View
              style={{
                backgroundColor: colors.surfaceApp,
                flex: 1,
                opacity: 0.1,
              }}
            />
            <View
              style={{
                backgroundColor: colors.surfaceApp,
                flex: 2,
                opacity: 0.34,
              }}
            />
            <View
              style={{
                backgroundColor: colors.surfaceApp,
                flex: 3,
                opacity: 0.7,
              }}
            /> */}
          </View>
          {selectedLocation ? (
            <MapLocationDrawer
              key={selectedLocation.id}
              location={selectedLocation}
              onDismiss={() => setSelectedLocation(null)}
            />
          ) : null}
        </View>
      )}
    </MapCanvas>
  );
}
