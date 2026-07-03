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
  "1. Thông tin + AI tag",
  "2. Vị trí",
  "3. Hình ảnh",
  "4. Xác nhận",
];

const fallbackTags = [
  { id: "fallback-good-price", name: "Giá tốt" },
  { id: "fallback-clean", name: "Sạch sẽ" },
  { id: "fallback-easy-find", name: "Dễ tìm" },
  { id: "fallback-group", name: "Phù hợp nhóm" },
  { id: "fallback-worth-trying", name: "Đáng thử" },
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
  const visibleTags = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }

    return selectedCategory.tags.length > 0 ? selectedCategory.tags : fallbackTags;
  }, [selectedCategory]);

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
        Alert.alert("Lỗi", "Không tải được dữ liệu đóng góp địa điểm.");
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
          Alert.alert("Cần quyền vị trí", "Hãy cấp quyền vị trí để đóng góp địa điểm.");
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
        Alert.alert("Lỗi", "Không lấy được vị trí hiện tại.");
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
        setSuggestedTagIds((analysis.aiSuggestedTags ?? []).map((item) => item.id));
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
      Alert.alert("Đã đủ 5 ảnh", "Bạn chỉ được chọn tối đa 5 ảnh.");
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
      Alert.alert("Thiếu ảnh", "Hãy chọn ít nhất 1 ảnh.");
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
        "Upload thất bại",
        error?.message || "Không thể upload ảnh lên Supabase. Thử lại giúp mình.",
      );
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleContinue = async () => {
    if (step === 0) {
      if (!name.trim() || !description.trim() || !selectedCategoryId) {
        Alert.alert("Thiếu thông tin", "Hãy nhập tên, mô tả và chọn danh mục.");
        return;
      }
      setStep(1);
      return;
    }

    if (step === 1) {
      if (!pinCoords || !deviceCoords) {
        Alert.alert("Thiếu vị trí", "Không lấy được vị trí để kiểm tra 50m.");
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
          "Ngoài phạm vi",
          error?.response?.data?.message ||
            "Bạn phải đứng trong phạm vi 50m mới được tạo địa điểm.",
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
        Alert.alert("Lỗi", "Không đủ dữ liệu vị trí để gửi duyệt.");
        return;
      }

      try {
        setSaving(true);
        const realTagIds = selectedCategory?.tags
          .filter((tag) => selectedTagIds.includes(tag.id))
          .map((tag) => tag.id) ?? [];
        const uploadedUrls = images.map((item) => item.uploadedUrl).filter(Boolean);
        await submitContribution({
          name: name.trim(),
          description: description.trim(),
          categoryId: selectedCategoryId,
          tagIds: realTagIds,
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
          "Đã gửi để duyệt",
          "Địa điểm của bạn đang chờ phê duyệt.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/(tabs)/home"),
            },
          ],
        );
      } catch (error: any) {
        Alert.alert(
          "Gửi thất bại",
          error?.response?.data?.message || "Không thể gửi địa điểm để duyệt.",
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
          <Text style={styles.label}>Tên địa điểm</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Com tam Co Ba"
            style={styles.input}
          />

          <Text style={styles.label}>Mô tả ngắn</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Mô tả ngắn về địa điểm..."
            multiline
            style={[styles.input, styles.multilineInput]}
          />

          <View style={styles.fieldHeader}>
            <Text style={styles.label}>Danh mục</Text>
            <Text style={styles.fieldHint}>Chọn 1 danh mục phù hợp</Text>
          </View>
          {categories.length > 0 ? (
            <View style={styles.categoryGrid}>
              {categories.map((category) => {
                const active = category.id === selectedCategoryId;
                return (
                  <Pressable
                    key={category.id}
                    style={[
                      styles.categoryOption,
                      active && styles.categoryOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedCategoryId(category.id);
                      setSelectedTagIds([]);
                    }}
                  >
                    <View
                      style={[
                        styles.categoryIcon,
                        active && styles.categoryIconActive,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={active ? "check" : "shape-outline"}
                        size={18}
                        color={active ? "#ffffff" : "#a34a22"}
                      />
                    </View>
                    <View style={styles.categoryTextWrap}>
                      <Text
                        style={[
                          styles.categoryName,
                          active && styles.categoryNameActive,
                        ]}
                      >
                        {category.name}
                      </Text>
                      {category.description ? (
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.categoryDescription,
                            active && styles.categoryDescriptionActive,
                          ]}
                        >
                          {category.description}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="shape-outline" size={22} color="#9ca3af" />
              <Text style={styles.emptyStateText}>Chưa có danh mục để chọn.</Text>
            </View>
          )}

          <Text style={styles.label}>Tag mô tả</Text>
          {suggestedTagIds.length > 0 && selectedCategory && (
            <View style={styles.suggestionBox}>
              <Text style={styles.suggestionTitle}>AI gợi ý dựa trên tên</Text>
              {renderChips(
                selectedCategory.tags.filter((item) => suggestedTagIds.includes(item.id)),
                selectedTagIds,
                "#ff8c66",
              )}
            </View>
          )}
          {selectedCategory ? (
            <>
              {selectedCategory.tags.length === 0 ? (
                <Text style={styles.helperText}>
                  Chưa có tag riêng cho danh mục này, bạn có thể chọn tag gợi ý bên dưới.
                </Text>
              ) : null}
              {renderChips(visibleTags, selectedTagIds)}
            </>
          ) : (
            <Text style={styles.helperText}>Chọn danh mục để hiện tag phù hợp.</Text>
          )}
        </View>
      );
    }

    if (step === 1) {
      return (
        <View style={styles.section}>
          <Text style={styles.mapHint}>Kéo bản đồ để chọn vị trí</Text>
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

          <Text style={styles.label}>Địa chỉ tự động</Text>
          <View style={styles.addressCard}>
            <MaterialCommunityIcons name="map-marker-outline" size={20} color="#ff5a1f" />
            <Text style={styles.addressText}>
              {resolvedAddress || "Đang lấy địa chỉ..."}
            </Text>
          </View>

          <Text style={styles.label}>Chỉnh sửa địa chỉ (tùy chọn)</Text>
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
            Thêm 1-5 hình để người khác hình dung được chỗ này.
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
                        <Text style={styles.coverBadgeText}>Ảnh chính</Text>
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
                  <Text style={styles.emptyImageText}>Thêm ảnh</Text>
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
                Có vẻ trùng với {similarLocations[0]?.name}
              </Text>
              <Text style={styles.warningText}>
                Một chỗ tương tự đã tồn tại gần đây. Bạn có muốn tiếp tục đăng riêng không?
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
                  <Text style={styles.warningButtonLightText}>Xem chỗ cũ</Text>
                </Pressable>
                <View style={styles.warningButton}>
                  <Text style={styles.warningButtonText}>Tiếp tục đăng</Text>
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
              {selectedCategory?.name || "Danh mục"}
            </Text>
            <Text style={styles.summaryName}>{name.trim()}</Text>
            <Text style={styles.summaryDescription}>{description.trim()}</Text>
            <View style={styles.chipWrap}>
              {visibleTags
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
          Địa điểm sẽ được duyệt trong khoảng 24h trước khi hiển thị trên bản đồ.
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
          <Text style={styles.title}>Đóng góp địa điểm</Text>
          <Text style={styles.subtitle}>Bước {step + 1}/4 - {stepLabels[step]}</Text>
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
              {step === 3 ? "Gửi để duyệt" : "Tiếp tục"}
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
  fieldHeader: {
    gap: 4,
  },
  fieldHint: {
    fontSize: 12,
    color: "#6b7280",
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
  categoryGrid: {
    gap: 10,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#f0d6c9",
    padding: 12,
    backgroundColor: "#ffffff",
  },
  categoryOptionActive: {
    backgroundColor: "#fff1eb",
    borderColor: "#ff5a1f",
  },
  categoryIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff7f3",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIconActive: {
    backgroundColor: "#ff5a1f",
  },
  categoryTextWrap: {
    flex: 1,
    gap: 3,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#a34a22",
  },
  categoryNameActive: {
    color: "#111827",
  },
  categoryDescription: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 17,
  },
  categoryDescriptionActive: {
    color: "#6b4b3a",
  },
  emptyState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    padding: 14,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
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
