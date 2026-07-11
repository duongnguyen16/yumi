import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
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
import {
  ActivityIndicator,
  IconButton,
  Text,
  TextInput,
} from "react-native-paper";
import { useFocusEffect, useRouter } from "expo-router";
import LocationSearchScreen from "../location/LocationSearchScreen";
import Option from "../ui/Option";
import Dialog from "../ui/Dialog";
import { userContext } from "@/contexts/userContext";

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

export default function MapScreen() {
  const { location, setLocation } = useLocationContext();
  const { user } = useContext(userContext);
  const [mapStyle, setMapStyle] = useState<StyleSpecification | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [geoJson, setGeoJson] = useState(emptyGeoJson);
  const cameraRef = useRef<CameraRef>(null);
  const router = useRouter();
  const searchInputRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScreen, setSearchScreen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [phoneDialogVisible, setPhoneDialogVisible] = useState(false);
  const [option, setOption] = useState(null);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const response = await getAllLocations();
        setGeoJson(response.locations ?? emptyGeoJson);
      } catch (error) {
        console.error("Error fetching locations:", error);
      }
    };
    fetchLocation();
  }, []);

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
  const closeSearch = () => {
    searchInputRef.current?.blur();
    Keyboard.dismiss();
    setSearchQuery("");
    setSearchScreen(false);
  };

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (searchScreen) {
            closeSearch();
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

  const handleOptionSelect = (selectedOption) => {
    console.log("Selected option:", selectedOption);
    if (selectedOption === "add-location") {
      router.push({ pathname: "/contribute", params: { type: "add" } });
    }
    if (selectedOption === "register-location") {
      if (user?.phoneVerified !== true) {
        setPhoneDialogVisible(true);
        return;
      }
      router.push({ pathname: "/contribute", params: { type: "register" } });
    }
  };

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" />
        <Text>Đang tải bản đồ...</Text>
      </View>
    );
  }

  if (!mapStyle || !location) {
    return (
      <View style={styles.centerState}>
        <Text variant="titleMedium">Không hiện được bản đồ</Text>
        <Text style={styles.stateText}>
          {mapError || "Không có dữ liệu vị trí hiện tại."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        mode="outlined"
        outlineStyle={{ borderRadius: 20 }}
        placeholder="Tìm kiếm..."
        ref={searchInputRef}
        onChangeText={(text) => setSearchQuery(text)}
        onFocus={() => {
          setSearchScreen(true);
        }}
        left={
          searchScreen ? (
            <TextInput.Icon
              icon="arrow-left"
              forceTextInputFocus={false}
              onPress={() => {
                closeSearch();
              }}
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
        <LocationSearchScreen
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchRef={searchInputRef}
        />
      ) : (
        <View style={styles.container}>
          <Map mapStyle={mapStyle} style={styles.map}>
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
                e.stopPropagation();
                const feature = e.nativeEvent.features?.[0];

                if (!feature) return;
                if (!feature.properties.id) return;

                router.push({
                  pathname: "/location/[id]",
                  params: { id: feature.properties.id },
                });
              }}
            >
              <Layer
                id="locations-cluster"
                type="circle"
                source="geojson"
                filter={["has", "point_count"]}
                paint={{
                  "circle-radius": 18,
                  "circle-color": "#070707",
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
                  "text-field": ["get", "point_count_abbreviated"],
                  // "text-font": ["Roboto Regular"],
                  "text-size": 14,
                  "text-anchor": "center",
                }}
                paint={{
                  "text-color": "#ffffff",
                }}
              />

              {/* <Layer
                id="locations-marker"
                type="symbol"
                source="geojson"
                filter={["!", ["has", "point_count"]]}
                layout={{
                  "icon-image": "border-dot-13",
                  "icon-size": 2,
                  "icon-anchor": "bottom",
                  "icon-allow-overlap": true,
                }}
              /> */}

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
                filter={["!", ["has", "point_count"]]}
              />

              <Layer
                id="locations-label"
                type="symbol"
                source="geojson"
                filter={["!", ["has", "point_count"]]}
                layout={{
                  "text-field": ["get", "name"],
                  // "text-font": ["Roboto Regular"],
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
            </GeoJSONSource>
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

            <IconButton
              mode="contained"
              size={35}
              icon="plus"
              onPress={() => {
                // router.push("/contribute" as never);
                setVisible(true);
              }}
            />
          </View>
          <Option
            visible={visible}
            setVisible={setVisible}
            title="Bạn muốn làm gì?"
            options={[
              {
                label: "Đăng ký địa điểm",
                value: "register-location",
                icon: "file-document-edit-outline",
              },
              {
                label: "Đóng góp địa điểm",
                value: "add-location",
                icon: "plus",
              },
            ]}
            option={option}
            setOption={setOption}
            onDismiss={(selectedOption) => handleOptionSelect(selectedOption)}
          />
          <Dialog
            visible={phoneDialogVisible}
            setVisible={setPhoneDialogVisible}
            title="Cần xác minh số điện thoại"
            message="Bạn cần xác minh số điện thoại trước khi đăng ký địa điểm."
            option
            confirmLabel="Đến Profile"
            cancelLabel="Để sau"
            result={(confirmed) => {
              if (confirmed) {
                router.push("/profile");
              }
            }}
          />
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
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: "#fff",
  },
  stateText: {
    textAlign: "center",
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
