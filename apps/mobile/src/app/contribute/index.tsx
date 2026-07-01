import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ExpoLocation from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Camera,
  Map,
  MapRef,
  NativeUserLocation,
} from "@maplibre/maplibre-react-native";
import type { StyleSpecification } from "@maplibre/maplibre-react-native";
import {
  analyzeLocationDraft,
  ContributionCategory,
  getContributionOptions,
  submitContribution,
  uploadContributionImage,
  validateContributionPosition,
} from "@/service/contributePlaceService";

const MAP_STYLE_URL =
  process.env.EXPO_PUBLIC_MAP_API || "https://demotiles.maplibre.org/style.json";

type SelectedImage = {
  id: string;
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedUrl?: string;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

const stepLabels = [
  "1. Thong tin + AI tag",
  "2. Vi tri",
  "3. Hinh anh",
  "4. Xac nhan",
];

export default function ContributePlaceScreen() {
  const router = useRouter();
  const mapRef = useRef<MapRef>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mapStyle, setMapStyle] = useState<StyleSpecification | null>(null);
  const [categories, setCategories] = useState<ContributionCategory[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [suggestedTagIds, setSuggestedTagIds] = useState<string[]>([]);
  const [similarLocations, setSimilarLocations] = useState<
    Array<{
      id: string;
      name: string;
      address: string;
      distanceMeters?: number | null;
      status: string;
    }>
  >([]);
  const [deviceCoords, setDeviceCoords] = useState<Coordinates | null>(null);
  const [pinCoords, setPinCoords] = useState<Coordinates | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | undefined>();
  const [autoAddress, setAutoAddress] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [images, setImages] = useState<SelectedImage[]>([]);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const duplicateWarning = similarLocations.length > 0;
  const resolvedAddress = manualAddress.trim() || autoAddress.trim();

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [optionsResponse, styleResponse] = await Promise.all([
          getContributionOptions(),
          fetch(MAP_STYLE_URL),
        ]);

        const styleJson = await styleResponse.json();
        setCategories(optionsResponse.categories ?? []);
        setMapStyle(styleJson);
      } catch (error) {
        console.log("Error bootstrapping contribute place:", error);
        Alert.alert("Loi", "Khong tai duoc du lieu dong gop dia diem.");
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (step !== 1 || deviceCoords) {
      return;
    }

    const loadLocation = async () => {
      try {
        const permission = await ExpoLocation.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          Alert.alert("Can quyen vi tri", "Hay cap quyen vi tri de dong gop dia diem.");
          return;
        }

        const currentLocation = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.High,
        });

        const coords = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        };

        setDeviceCoords(coords);
        setPinCoords(coords);
        setAccuracyMeters(currentLocation.coords.accuracy ?? undefined);

        const reverse = await ExpoLocation.reverseGeocodeAsync(coords);
        if (reverse[0]) {
          const address = [
            reverse[0].name,
            reverse[0].street,
            reverse[0].district,
            reverse[0].city,
          ]
            .filter(Boolean)
            .join(", ");
          setAutoAddress(address);
        }
      } catch (error) {
        console.log("Error loading device location:", error);
        Alert.alert("Loi", "Khong lay duoc vi tri hien tai.");
      }
    };

    loadLocation();
  }, [deviceCoords, step]);

  useEffect(() => {
    if (name.trim().length < 3) {
      setSuggestedTagIds([]);
      setSimilarLocations([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const analysis = await analyzeLocationDraft(
          name.trim(),
          selectedCategoryId || undefined,
        );
        setSuggestedTagIds(analysis.aiSuggestedTags.map((item) => item.id));
        setSimilarLocations(analysis.similarLocations ?? []);
      } catch (error) {
        console.log("Error analyzing draft:", error);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [name, selectedCategoryId]);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((item) => item !== tagId)
        : [...current, tagId],
    );
  };

  const handlePickImages = async () => {
    if (images.length >= 5) {
      Alert.alert("Da du 5 anh", "Ban chi duoc chon toi da 5 anh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    const newImages = result.assets.map((asset, index) => ({
      id: `${Date.now()}-${index}`,
      uri: asset.uri,
      fileName: asset.fileName ?? `place-${Date.now()}-${index}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
      fileSize: asset.fileSize ?? 1024,
    }));

    setImages((current) => [...current, ...newImages].slice(0, 5));
  };

  const handleUploadImages = async () => {
    if (images.length < 1) {
      Alert.alert("Thieu anh", "Hay chon it nhat 1 anh.");
      return false;
    }

    setUploading(true);
    try {
      const uploadedImages: SelectedImage[] = [];

      for (const image of images) {
        if (image.uploadedUrl) {
          uploadedImages.push(image);
          continue;
        }

        const uploadedUrl = await uploadContributionImage({
          uri: image.uri,
          fileName: image.fileName,
          mimeType: image.mimeType,
          fileSize: image.fileSize,
        });

        uploadedImages.push({
          ...image,
          uploadedUrl,
        });
      }

      setImages(uploadedImages);
      return true;
    } catch (error: any) {
      console.log("Error uploading contribution images:", error);
      Alert.alert(
        "Upload that bai",
        error?.message || "Khong the upload anh len Supabase. Thu lai giup minh.",
      );
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleContinue = async () => {
    if (step === 0) {
      if (!name.trim() || !description.trim() || !selectedCategoryId) {
        Alert.alert("Thieu thong tin", "Hay nhap ten, mo ta va chon danh muc.");
        return;
      }
      setStep(1);
      return;
    }

    if (step === 1) {
      if (!pinCoords || !deviceCoords) {
        Alert.alert("Thieu vi tri", "Khong lay duoc vi tri de kiem tra 50m.");
        return;
      }

      try {
        setSaving(true);
        await validateContributionPosition({
          pinLatitude: pinCoords.latitude,
          pinLongitude: pinCoords.longitude,
          deviceLatitude: deviceCoords.latitude,
          deviceLongitude: deviceCoords.longitude,
          accuracyMeters,
          address: resolvedAddress,
        });
        setStep(2);
      } catch (error: any) {
        Alert.alert(
          "Ngoai pham vi",
          error?.response?.data?.message ||
            "Ban phai dung trong pham vi 50m moi duoc tao dia diem.",
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    if (step === 2) {
      const ok = await handleUploadImages();
      if (ok) {
        setStep(3);
      }
      return;
    }

    if (step === 3) {
      if (!pinCoords || !deviceCoords) {
        Alert.alert("Loi", "Khong du du lieu vi tri de gui duyet.");
        return;
      }

      try {
        setSaving(true);
        const uploadedUrls = images.map((item) => item.uploadedUrl).filter(Boolean);
        await submitContribution({
          name: name.trim(),
          description: description.trim(),
          categoryId: selectedCategoryId,
          tagIds: selectedTagIds,
          address: resolvedAddress,
          latitude: pinCoords.latitude,
          longitude: pinCoords.longitude,
          deviceLatitude: deviceCoords.latitude,
          deviceLongitude: deviceCoords.longitude,
          accuracyMeters,
          imageUrls: uploadedUrls as string[],
          suspectedDuplicateLocationIds: similarLocations.map((item) => item.id),
        });

        Alert.alert(
          "Da gui de duyet",
          "Dia diem cua ban dang cho phe duyet.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/(tabs)/home"),
            },
          ],
        );
      } catch (error: any) {
        Alert.alert(
          "Gui that bai",
          error?.response?.data?.message || "Khong the gui dia diem de duyet.",
        );
      } finally {
        setSaving(false);
      }
    }
  };

  const handleMapRegionChange = async () => {
    const center = await mapRef.current?.getCenter();
    if (!center) {
      return;
    }

    setPinCoords({
      longitude: center[0],
      latitude: center[1],
    });
  };

  const renderChips = (
    items: Array<{ id: string; name: string }>,
    activeIds: string[],
    accentColor = "#ff5a1f",
  ) => (
    <View style={styles.chipWrap}>
      {items.map((item) => {
        const active = activeIds.includes(item.id);
        return (
          <Pressable
            key={item.id}
            style={[
              styles.chip,
              active && { backgroundColor: accentColor, borderColor: accentColor },
            ]}
            onPress={() => toggleTag(item.id)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {item.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderStepContent = () => {
    if (step === 0) {
      return (
        <View style={styles.section}>
          <Text style={styles.label}>Ten dia diem</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Com tam Co Ba"
            style={styles.input}
          />

          <Text style={styles.label}>Mo ta ngan</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Mo ta ngan ve dia diem..."
            multiline
            style={[styles.input, styles.multilineInput]}
          />

          <Text style={styles.label}>Tag mo ta</Text>
          {suggestedTagIds.length > 0 && selectedCategory && (
            <View style={styles.suggestionBox}>
              <Text style={styles.suggestionTitle}>AI goi y dua tren ten</Text>
              {renderChips(
                selectedCategory.tags.filter((item) => suggestedTagIds.includes(item.id)),
                selectedTagIds,
                "#ff8c66",
              )}
            </View>
          )}
          {selectedCategory ? (
            renderChips(selectedCategory.tags, selectedTagIds)
          ) : (
            <Text style={styles.helperText}>Chon danh muc de hien tag phu hop.</Text>
          )}

          <Text style={styles.label}>Danh muc</Text>
          <View style={styles.chipWrap}>
            {categories.map((category) => {
              const active = category.id === selectedCategoryId;
              return (
                <Pressable
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    active && styles.categoryChipActive,
                  ]}
                  onPress={() => {
                    setSelectedCategoryId(category.id);
                    setSelectedTagIds([]);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      active && styles.categoryChipTextActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    if (step === 1) {
      return (
        <View style={styles.section}>
          <Text style={styles.mapHint}>Keo ban do de chon vi tri</Text>
          <View style={styles.mapCard}>
            {mapStyle && pinCoords ? (
              <View style={styles.mapContainer}>
                <Map
                  ref={mapRef}
                  mapStyle={mapStyle}
                  style={styles.map}
                  onRegionDidChange={handleMapRegionChange}
                >
                  <Camera
                    initialViewState={{
                      center: [pinCoords.longitude, pinCoords.latitude],
                      zoom: 17,
                    }}
                  />
                  <NativeUserLocation />
                </Map>
                <View pointerEvents="none" style={styles.pinOverlay}>
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={42}
                    color="#ff5a1f"
                  />
                </View>
              </View>
            ) : (
              <View style={styles.mapLoading}>
                <ActivityIndicator color="#ff5a1f" />
              </View>
            )}
          </View>

          <Text style={styles.label}>Dia chi tu dong</Text>
          <View style={styles.addressCard}>
            <MaterialCommunityIcons name="map-marker-outline" size={20} color="#ff5a1f" />
            <Text style={styles.addressText}>
              {resolvedAddress || "Dang lay dia chi..."}
            </Text>
          </View>

          <Text style={styles.label}>Chinh sua dia chi (tuy chon)</Text>
          <TextInput
            value={manualAddress}
            onChangeText={setManualAddress}
            placeholder="VD: K54/12 Nguyen Van Cu..."
            style={styles.input}
          />
        </View>
      );
    }

    if (step === 2) {
      return (
        <View style={styles.section}>
          <Text style={styles.helperText}>
            Them 1-5 hinh de nguoi khac hinh dung duoc cho nay.
          </Text>
          <View style={styles.imageGrid}>
            {Array.from({ length: 5 }).map((_, index) => {
              const image = images[index];
              if (image) {
                return (
                  <View key={image.id} style={styles.imageTile}>
                    <Image source={image.uri} style={styles.imagePreview} contentFit="cover" />
                    {index === 0 && (
                      <View style={styles.coverBadge}>
                        <Text style={styles.coverBadgeText}>Anh chinh</Text>
                      </View>
                    )}
                    <Pressable
                      style={styles.removeImageButton}
                      onPress={() =>
                        setImages((current) => current.filter((item) => item.id !== image.id))
                      }
                    >
                      <MaterialCommunityIcons name="close" size={16} color="#fff" />
                    </Pressable>
                  </View>
                );
              }

              return (
                <Pressable
                  key={`empty-${index}`}
                  style={styles.emptyImageTile}
                  onPress={handlePickImages}
                >
                  <MaterialCommunityIcons name="image-plus" size={28} color="#9ca3af" />
                  <Text style={styles.emptyImageText}>Them anh</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    const previewImage = images[0]?.uploadedUrl || images[0]?.uri;

    return (
      <View style={styles.section}>
        {duplicateWarning && (
          <View style={styles.warningBox}>
            <View style={styles.warningIconWrap}>
              <MaterialCommunityIcons name="alert" size={18} color="#b7791f" />
            </View>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>
                Co ve trung voi {similarLocations[0]?.name}
              </Text>
              <Text style={styles.warningText}>
                Mot cho tuong tu da ton tai gan day. Ban co muon tiep tuc dang rieng khong?
              </Text>
              <View style={styles.warningActions}>
                <Pressable
                  style={[styles.warningButton, styles.warningButtonLight]}
                  onPress={() => {
                    if (similarLocations[0]?.id) {
                      router.push(`/location/${similarLocations[0].id}`);
                    }
                  }}
                >
                  <Text style={styles.warningButtonLightText}>Xem cho cu</Text>
                </Pressable>
                <View style={styles.warningButton}>
                  <Text style={styles.warningButtonText}>Tiep tuc dang</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.summaryCard}>
          {previewImage ? (
            <Image source={previewImage} style={styles.summaryImage} contentFit="cover" />
          ) : null}
          <View style={styles.summaryBody}>
            <Text style={styles.summaryCategory}>
              {selectedCategory?.name || "Danh muc"}
            </Text>
            <Text style={styles.summaryName}>{name.trim()}</Text>
            <Text style={styles.summaryDescription}>{description.trim()}</Text>
            <View style={styles.chipWrap}>
              {selectedCategory?.tags
                .filter((tag) => selectedTagIds.includes(tag.id))
                .map((tag) => (
                  <View key={tag.id} style={styles.summaryTag}>
                    <Text style={styles.summaryTagText}>{tag.name}</Text>
                  </View>
                ))}
            </View>
            <View style={styles.addressRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color="#6b7280" />
              <Text style={styles.summaryAddress}>{resolvedAddress}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.noteText}>
          Dia diem se duoc duyet trong khoang 24h truoc khi hien thi tren ban do.
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator color="#ff5a1f" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#111827" />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Dong gop dia diem</Text>
          <Text style={styles.subtitle}>Buoc {step + 1}/4 - {stepLabels[step]}</Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        {stepLabels.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressSegment,
              index <= step && styles.progressSegmentActive,
            ]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderStepContent()}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.primaryButton,
            (saving || uploading) && styles.primaryButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={saving || uploading}
        >
          {saving || uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {step === 3 ? "Gui de duyet" : "Tiep tuc"}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fffaf5",
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fffaf5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f7f1ea",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  progressRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
  },
  progressSegmentActive: {
    backgroundColor: "#ff5a1f",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 120,
  },
  section: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: "#ffffff",
    color: "#111827",
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  suggestionBox: {
    backgroundColor: "#fff1eb",
    borderWidth: 1,
    borderColor: "#ffd4c2",
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ff5a1f",
  },
  helperText: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
  },
  chipText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#ffffff",
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#f0d6c9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#fff7f3",
  },
  categoryChipActive: {
    backgroundColor: "#ff5a1f",
    borderColor: "#ff5a1f",
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#a34a22",
  },
  categoryChipTextActive: {
    color: "#ffffff",
  },
  mapHint: {
    alignSelf: "center",
    backgroundColor: "#5f513f",
    color: "#ffffff",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: "700",
  },
  mapCard: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#eadfd7",
    backgroundColor: "#f8f5f0",
  },
  mapContainer: {
    height: 330,
  },
  map: {
    flex: 1,
  },
  pinOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
  },
  mapLoading: {
    height: 330,
    alignItems: "center",
    justifyContent: "center",
  },
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 14,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  imageTile: {
    width: "47%",
    aspectRatio: 1,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#fee4d9",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  emptyImageTile: {
    width: "47%",
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#e7d9cd",
    backgroundColor: "#fffdf9",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyImageText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  coverBadge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    backgroundColor: "#ff5a1f",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  coverBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  removeImageButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(17,24,39,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  warningBox: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#f1c56b",
    backgroundColor: "#fff7df",
    padding: 14,
  },
  warningIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffe9ae",
    alignItems: "center",
    justifyContent: "center",
  },
  warningContent: {
    flex: 1,
    gap: 8,
  },
  warningTitle: {
    color: "#8a5b00",
    fontSize: 14,
    fontWeight: "700",
  },
  warningText: {
    color: "#8a5b00",
    fontSize: 13,
    lineHeight: 18,
  },
  warningActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  warningButton: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: "#b08a2c",
    paddingVertical: 10,
    alignItems: "center",
  },
  warningButtonLight: {
    backgroundColor: "#fff4cf",
  },
  warningButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  warningButtonLightText: {
    color: "#8a5b00",
    fontSize: 13,
    fontWeight: "700",
  },
  summaryCard: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f1ddd2",
    backgroundColor: "#ffffff",
  },
  summaryImage: {
    width: "100%",
    height: 190,
    backgroundColor: "#fee4d9",
  },
  summaryBody: {
    padding: 16,
    gap: 10,
  },
  summaryCategory: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#ffede5",
    color: "#ff5a1f",
    fontSize: 12,
    fontWeight: "700",
  },
  summaryName: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
  },
  summaryDescription: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 22,
  },
  summaryTag: {
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  summaryTagText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "700",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryAddress: {
    flex: 1,
    fontSize: 14,
    color: "#4b5563",
  },
  noteText: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 20,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: "#fffaf5",
  },
  primaryButton: {
    borderRadius: 18,
    backgroundColor: "#111111",
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
