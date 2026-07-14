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
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { TimePickerModal } from "react-native-paper-dates";
import {
  analyzeLocationDraft,
  submitCustomerContribution,
  submitVendorRegistration,
  validateContributionPosition,
  type CustomerContributionPayload,
  type PendingVendorEvidenceFile,
} from "@/service/contributePlaceService";
import { getAllCategories, getSubCategory } from "@/service/categoryService";
import { getSystemCode } from "@/service/locationService";
import Option from "@/components/ui/Option";

const MAP_STYLE_URL =
  process.env.EXPO_PUBLIC_MAP_API ||
  "https://demotiles.maplibre.org/style.json";

const MAX_IMAGES = 5;
const MAX_VIDEOS = 2;
const MAX_LICENSES = 3;

type SelectedImage = {
  id: string;
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

type SelectedEvidenceFile = PendingVendorEvidenceFile & {
  id: string;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type TimeValue = {
  hours: number;
  minutes: number;
};

type TimePickerMode = "start" | "end";

type DuplicateDecision = "continue";

type CategoryOption = {
  _id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
};

type SubCategoryOption = {
  _id: string;
  name: string;
  isActive?: boolean;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error as {
      response?: { data?: { message?: string } };
    };
    if (response.response?.data?.message) {
      return response.response.data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const formatFileSize = (fileSize: number) => {
  if (fileSize >= 1024 * 1024) {
    return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(fileSize / 1024))} KB`;
};

const getFirstParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const formatTimeValue = ({ hours, minutes }: TimeValue) =>
  `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

const stepLabels = [
  "1. Thông tin + danh mục",
  "2. Vị trí",
  "3. Hình ảnh",
  "4. Xác nhận",
];

const registerStepLabels = [
  "1. Thông tin + danh mục",
  "2. Vị trí",
  "3. Bằng chứng xác thực",
  "4. Xác nhận",
];

export default function ContributePlaceScreen() {
  const router = useRouter();
  const mapRef = useRef<MapRef>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mapStyle, setMapStyle] = useState<StyleSpecification | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryOption[]>([]);
  const [subCategoryLoading, setSubCategoryLoading] = useState(false);
  const [subCategoryError, setSubCategoryError] = useState("");
  const [draftAnalysisError, setDraftAnalysisError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [openHours, setOpenHours] = useState<TimeValue | null>(null);
  const [closeHours, setCloseHours] = useState<TimeValue | null>(null);
  const [clockVisible, setClockVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<TimePickerMode>("start");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState<
    string[]
  >([]);
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
  const [videos, setVideos] = useState<SelectedEvidenceFile[]>([]);
  const [licenseFiles, setLicenseFiles] = useState<SelectedEvidenceFile[]>([]);
  const [systemCode, setSystemCode] = useState<string | null>(null);
  const [duplicateOptionVisible, setDuplicateOptionVisible] = useState(false);
  const [duplicateDecision, setDuplicateDecision] =
    useState<DuplicateDecision | null>(null);
  const { type } = useLocalSearchParams();
  const contributionType = getFirstParamValue(type);
  const isVendorRegistration = contributionType === "register";
  const activeStepLabels = isVendorRegistration
    ? registerStepLabels
    : stepLabels;
  const displaySystemCode = systemCode ?? "Đang tạo mã";
  const selectedCategory = useMemo(
    () => categories.find((item) => item._id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );
  const selectedSubCategories = useMemo(
    () =>
      subCategories.filter((item) => selectedSubCategoryIds.includes(item._id)),
    [selectedSubCategoryIds, subCategories],
  );

  const duplicateWarning = similarLocations.length > 0;
  const nearestSimilarLocation = similarLocations[0];
  const resolvedAddress = manualAddress.trim() || autoAddress.trim();
  const duplicateOptionMessage = nearestSimilarLocation
    ? `Tìm thấy địa điểm gần tên "${nearestSimilarLocation.name}" trong bán kính 50m. Bạn muốn huỷ hay tiếp tục đăng địa điểm riêng?`
    : "Tìm thấy địa điểm tương tự trong bán kính 50m. Bạn muốn huỷ hay tiếp tục đăng địa điểm riêng?";

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [optionsResponse, styleResponse] = await Promise.all([
          getAllCategories(),
          fetch(MAP_STYLE_URL),
        ]);
        const styleJson = await styleResponse.json();

        if (!optionsResponse.success) {
          throw new Error(
            optionsResponse.message || "Không tải được danh mục.",
          );
        }
        if (isVendorRegistration) {
          const response = await getSystemCode();
          if (response.success) {
            setSystemCode(response.code);
          } else {
            Alert.alert(
              "Không tạo được mã",
              response.message || "Không lấy được mã xác thực đăng ký.",
            );
          }
        }
        setCategories(
          (optionsResponse.data ?? []).filter(
            (category: CategoryOption) => category.isActive !== false,
          ),
        );
        setMapStyle(styleJson);
      } catch (error) {
        console.log("Error bootstrapping contribute place:", error);
        Alert.alert("Lỗi", "Không tải được dữ liệu đóng góp địa điểm.");
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [isVendorRegistration]);

  useEffect(() => {
    if (!selectedCategoryId) {
      return;
    }

    let active = true;
    const loadSubCategories = async () => {
      setSubCategoryLoading(true);
      setSubCategoryError("");

      try {
        const response = await getSubCategory(selectedCategoryId);
        if (!active) {
          return;
        }

        if (response.success) {
          setSubCategories(
            (response.data ?? []).filter(
              (item: SubCategoryOption) => item.isActive !== false,
            ),
          );
        } else {
          setSubCategories([]);
          setSubCategoryError(
            response.message || "Không tải được danh mục con.",
          );
        }
      } catch (error) {
        console.log("Error loading sub categories:", error);
        if (active) {
          setSubCategories([]);
          setSubCategoryError("Không tải được danh mục con.");
        }
      } finally {
        if (active) {
          setSubCategoryLoading(false);
        }
      }
    };

    loadSubCategories();

    return () => {
      active = false;
    };
  }, [selectedCategoryId]);

  useEffect(() => {
    if (step !== 1 || deviceCoords) {
      return;
    }

    const loadLocation = async () => {
      try {
        const permission =
          await ExpoLocation.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          Alert.alert(
            "Cần quyền vị trí",
            "Hãy cấp quyền vị trí để đóng góp địa điểm.",
          );
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
      const timeout = setTimeout(() => {
        setSimilarLocations([]);
      }, 0);

      return () => clearTimeout(timeout);
    }

    const timeout = setTimeout(async () => {
      try {
        const analysis = await analyzeLocationDraft(
          name.trim(),
          selectedCategoryId || undefined,
        );
        if (!analysis.success) {
          throw new Error("Không thể kiểm tra địa điểm trùng lặp.");
        }
        setSimilarLocations(analysis.similarLocations ?? []);
        setDraftAnalysisError("");
      } catch (error) {
        console.log("Error analyzing draft:", error);
        setSimilarLocations([]);
        setDraftAnalysisError("Không thể kiểm tra địa điểm trùng lặp.");
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [name, selectedCategoryId]);

  const toggleSubCategory = (subCategoryId: string) => {
    setSelectedSubCategoryIds((current) =>
      current.includes(subCategoryId)
        ? current.filter((item) => item !== subCategoryId)
        : [...current, subCategoryId],
    );
  };

  const handleClockDismiss = () => {
    setClockVisible(false);
    setPickerMode("start");
  };

  const handleClockConfirm = ({ hours, minutes }: TimeValue) => {
    if (pickerMode === "start") {
      setOpenHours({ hours, minutes });
      setPickerMode("end");
      return;
    }

    const start = openHours ?? { hours: 7, minutes: 0 };
    const end = { hours, minutes };

    setCloseHours(end);
    setPickerMode("start");
    setClockVisible(false);
    setOpeningHours(`${formatTimeValue(start)}-${formatTimeValue(end)}`);
  };

  const handlePickImages = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert("Đã đủ 5 ảnh", "Bạn chỉ được chọn tối đa 5 ảnh.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.8,
      exif: true,
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
      capturedAt:
        asset.exif?.DateTimeOriginal ||
        asset.exif?.DateTimeDigitized ||
        asset.exif?.DateTime ||
        null,
    }));

    setImages((current) => [...current, ...newImages].slice(0, MAX_IMAGES));
  };

  const handlePickVideos = async () => {
    if (videos.length >= MAX_VIDEOS) {
      Alert.alert("Đã đủ video", "Bạn chỉ được chọn tối đa 2 video.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_VIDEOS - videos.length,
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    const newVideos = result.assets.map((asset, index) => ({
      id: `video-${Date.now()}-${index}`,
      uri: asset.uri,
      fileName: asset.fileName ?? `verification-${Date.now()}-${index}.mp4`,
      mimeType: asset.mimeType ?? "video/mp4",
      fileSize: asset.fileSize ?? 1024,
    }));

    setVideos((current) => [...current, ...newVideos].slice(0, MAX_VIDEOS));
  };

  const handlePickLicenseFiles = async () => {
    if (licenseFiles.length >= MAX_LICENSES) {
      Alert.alert(
        "Đã đủ giấy phép",
        "Bạn chỉ được chọn tối đa 3 ảnh giấy phép.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_LICENSES - licenseFiles.length,
      quality: 0.8,
      exif: true,
    });

    if (result.canceled) {
      return;
    }

    const newLicenseFiles = result.assets.map((asset, index) => ({
      id: `license-${Date.now()}-${index}`,
      uri: asset.uri,
      fileName: asset.fileName ?? `license-${Date.now()}-${index}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
      fileSize: asset.fileSize ?? 1024,
      capturedAt:
        asset.exif?.DateTimeOriginal ||
        asset.exif?.DateTimeDigitized ||
        asset.exif?.DateTime ||
        null,
    }));

    setLicenseFiles((current) =>
      [...current, ...newLicenseFiles].slice(0, MAX_LICENSES),
    );
  };

  const buildCustomerContributionPayload = (): CustomerContributionPayload => {
    if (!pinCoords || !deviceCoords) {
      throw new Error("Không đủ dữ liệu vị trí để gửi duyệt.");
    }

    return {
      name: name.trim(),
      description: description.trim(),
      openingHours: openingHours.trim() || undefined,
      categoryId: selectedCategoryId,
      tagIds: selectedSubCategoryIds,
      address: resolvedAddress,
      latitude: pinCoords.latitude,
      longitude: pinCoords.longitude,
      deviceLatitude: deviceCoords.latitude,
      deviceLongitude: deviceCoords.longitude,
      accuracyMeters,
      suspectedDuplicateLocationIds: similarLocations.map((item) => item.id),
    };
  };

  const toPendingEvidenceFiles = (
    files: SelectedEvidenceFile[],
  ): PendingVendorEvidenceFile[] =>
    files.map(({ uri, fileName, mimeType, fileSize, capturedAt }) => ({
      uri,
      fileName,
      mimeType,
      fileSize,
      capturedAt,
    }));

  const submitCustomerDataToBackend = async () => {
    await submitCustomerContribution(
      buildCustomerContributionPayload(),
      toPendingEvidenceFiles(images),
    );
  };

  const submitVendorRegistrationDataToBackend = async () => {
    if (!systemCode) {
      alert("Không thể gửi đăng ký vendor khi chưa có mã xác thực.");
      return;
    }
    try {
      const response = await submitVendorRegistration({
        ...buildCustomerContributionPayload(),
        systemCode,
        isPotentialDuplicate: similarLocations.length > 0,
        videoFiles: toPendingEvidenceFiles(videos),
        licenseFiles: toPendingEvidenceFiles(licenseFiles),
        imageFiles: toPendingEvidenceFiles(images),
      });
      if (response?.success === false) {
        setImages([]);
        setVideos([]);
        setLicenseFiles([]);
        alert(
          response?.message ||
            "Không thể gửi đăng ký vendor. Vui lòng thử lại.",
        );
        return;
      }
    } catch (error) {
      console.error("Error submitting vendor registration:", error);
      Alert.alert(
        "Gửi đăng ký thất bại",
        "Có lỗi xảy ra khi gửi đăng ký vendor. Vui lòng thử lại.",
      );
    } finally {
      setImages([]);
      setVideos([]);
      setLicenseFiles([]);
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

      let checkingDuplicates = false;
      try {
        setSaving(true);
        const validatePosition = await validateContributionPosition({
          pinLatitude: pinCoords.latitude,
          pinLongitude: pinCoords.longitude,
          deviceLatitude: deviceCoords.latitude,
          deviceLongitude: deviceCoords.longitude,
          accuracyMeters,
          address: resolvedAddress,
        });
        if (!validatePosition.success) {
          Alert.alert(
            "Vị trí không hợp lệ",
            validatePosition?.message ||
              "Bạn phải đứng trong phạm vi 50m mới được tạo địa điểm.",
          );
          return;
        }
        if (!validatePosition.withinRange) {
          Alert.alert(
            "Ngoài phạm vi",
            "Bạn phải đứng trong phạm vi 50m mới được tạo địa điểm.",
          );
          return;
        }
        checkingDuplicates = true;
        const analysis = await analyzeLocationDraft(
          name.trim(),
          selectedCategoryId || undefined,
          pinCoords.latitude,
          pinCoords.longitude,
        );
        if (!analysis.success) {
          throw new Error("Không thể kiểm tra địa điểm trùng lặp.");
        }
        const duplicates = analysis.similarLocations ?? [];
        setSimilarLocations(duplicates);

        if (duplicates.length > 0) {
          setDuplicateDecision(null);
          setDuplicateOptionVisible(true);
          return;
        }

        setStep(2);
      } catch (error: unknown) {
        Alert.alert(
          checkingDuplicates
            ? "Không thể kiểm tra trùng lặp"
            : "Không thể kiểm tra vị trí",
          getErrorMessage(
            error,
            checkingDuplicates
              ? "Không thể kiểm tra địa điểm trùng lặp. Vui lòng thử lại."
              : "Không thể kiểm tra vị trí. Vui lòng thử lại.",
          ),
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    if (step === 2) {
      if (isVendorRegistration && !systemCode) {
        Alert.alert(
          "Thiếu mã xác thực",
          "Không thể gửi đăng ký vendor khi chưa có mã xác thực.",
        );
        return;
      }

      if (isVendorRegistration && videos.length < 1) {
        Alert.alert(
          "Thiếu video",
          "Hãy thêm ít nhất 1 video có chứa mã xác thực.",
        );
        return;
      }
      if (!isVendorRegistration && images.length < 1) {
        Alert.alert("Thiếu ảnh", "Hãy chọn ít nhất 1 ảnh.");
        return;
      }

      setStep(3);
      return;
    }

    if (step === 3) {
      try {
        setSaving(true);
        if (isVendorRegistration) {
          await submitVendorRegistrationDataToBackend();
        } else {
          await submitCustomerDataToBackend();
        }

        Alert.alert(
          isVendorRegistration ? "Đã gửi đăng ký" : "Đã gửi để duyệt",
          isVendorRegistration
            ? "Hồ sơ vendor của bạn đang chờ phê duyệt."
            : "Địa điểm của bạn đang chờ phê duyệt.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/(tabs)/home"),
            },
          ],
        );
      } catch (error: unknown) {
        Alert.alert(
          isVendorRegistration ? "Gửi đăng ký thất bại" : "Gửi thất bại",
          getErrorMessage(
            error,
            isVendorRegistration
              ? "Không thể gửi đăng ký vendor."
              : "Không thể gửi địa điểm để duyệt.",
          ),
        );
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDuplicateDecision = (decision: DuplicateDecision) => {
    setDuplicateDecision(decision);
    setStep(2);
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

  const renderSubCategoryChips = (
    items: SubCategoryOption[],
    activeIds: string[],
    accentColor = "#ff5a1f",
  ) => (
    <View style={styles.chipWrap}>
      {items.map((item) => {
        const active = activeIds.includes(item._id);
        return (
          <Pressable
            key={item._id}
            style={[
              styles.chip,
              active && {
                backgroundColor: accentColor,
                borderColor: accentColor,
              },
            ]}
            onPress={() => toggleSubCategory(item._id)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {item.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderEvidenceFileList = (
    files: SelectedEvidenceFile[],
    options: {
      addLabel: string;
      emptyLabel: string;
      iconName: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
      maxCount: number;
      onAdd: () => void;
      onRemove: (id: string) => void;
    },
  ) => (
    <View style={styles.fileList}>
      {files.map((file) => (
        <View key={file.id} style={styles.fileRow}>
          <View style={styles.fileIcon}>
            <MaterialCommunityIcons
              name={options.iconName}
              size={20}
              color="#ff5a1f"
            />
          </View>
          <View style={styles.fileTextWrap}>
            <Text numberOfLines={1} style={styles.fileName}>
              {file.fileName}
            </Text>
            <Text style={styles.fileMeta}>{formatFileSize(file.fileSize)}</Text>
          </View>
          <Pressable
            style={styles.removeFileButton}
            onPress={() => options.onRemove(file.id)}
          >
            <MaterialCommunityIcons name="close" size={16} color="#6b7280" />
          </Pressable>
        </View>
      ))}

      {files.length < options.maxCount ? (
        <Pressable style={styles.addFileButton} onPress={options.onAdd}>
          <MaterialCommunityIcons name="plus" size={18} color="#ff5a1f" />
          <Text style={styles.addFileText}>
            {files.length > 0 ? options.addLabel : options.emptyLabel}
          </Text>
        </Pressable>
      ) : null}
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
          {draftAnalysisError ? (
            <Text style={styles.fieldHint}>{draftAnalysisError}</Text>
          ) : null}

          <Text style={styles.label}>Mô tả ngắn</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Mô tả ngắn về địa điểm..."
            multiline
            style={[styles.input, styles.multilineInput]}
          />

          <Text style={styles.label}>Giờ mở cửa</Text>
          <Pressable
            style={[styles.input, styles.timeInput]}
            onPress={() => setClockVisible(true)}
          >
            <Text
              style={[
                styles.timeInputText,
                !openingHours && styles.timePlaceholderText,
              ]}
            >
              {openingHours || "Chọn giờ mở cửa"}
            </Text>
            <MaterialCommunityIcons
              name="clock-outline"
              size={20}
              color="#a34a22"
            />
          </Pressable>
          <TimePickerModal
            visible={clockVisible}
            onDismiss={handleClockDismiss}
            onConfirm={handleClockConfirm}
            hours={
              pickerMode === "start"
                ? (openHours?.hours ?? 7)
                : (closeHours?.hours ?? 8)
            }
            minutes={
              pickerMode === "start"
                ? (openHours?.minutes ?? 0)
                : (closeHours?.minutes ?? 0)
            }
            locale="en"
            use24HourClock
            label={
              pickerMode === "start" ? "Chọn giờ mở cửa" : "Chọn giờ đóng cửa"
            }
            cancelLabel="Hủy"
            confirmLabel={pickerMode === "start" ? "Tiếp theo" : "Xác nhận"}
          />

          <View style={styles.fieldHeader}>
            <Text style={styles.label}>Danh mục</Text>
            <Text style={styles.fieldHint}>Chọn 1 danh mục phù hợp</Text>
          </View>
          {categories.length > 0 ? (
            <View style={styles.categoryGrid}>
              {categories.map((category) => {
                const active = category._id === selectedCategoryId;
                return (
                  <Pressable
                    key={category._id}
                    style={[
                      styles.categoryOption,
                      active && styles.categoryOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedCategoryId(category._id);
                      setSelectedSubCategoryIds([]);
                      setSubCategories([]);
                      setSubCategoryError("");
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
              <MaterialCommunityIcons
                name="shape-outline"
                size={22}
                color="#9ca3af"
              />
              <Text style={styles.emptyStateText}>
                Chưa có danh mục để chọn.
              </Text>
            </View>
          )}

          <Text style={styles.label}>Danh mục con</Text>
          {selectedCategory ? (
            <>
              {subCategoryLoading ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator color="#ff5a1f" />
                  <Text style={styles.emptyStateText}>
                    Đang tải danh mục con...
                  </Text>
                </View>
              ) : subCategoryError ? (
                <Text style={styles.helperText}>{subCategoryError}</Text>
              ) : subCategories.length > 0 ? (
                renderSubCategoryChips(subCategories, selectedSubCategoryIds)
              ) : (
                <Text style={styles.helperText}>
                  Danh mục này chưa có danh mục con.
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.helperText}>
              Chọn danh mục để hiện danh mục con phù hợp.
            </Text>
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
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={20}
              color="#ff5a1f"
            />
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
          {isVendorRegistration ? (
            <View style={styles.codeNotice}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={20}
                color="#a34a22"
              />
              <Text style={styles.codeNoticeText}>
                Đảm bảo trong hình ảnh hoặc video có chứa mã sau:{" "}
                <Text style={styles.codeNoticeValue}>{displaySystemCode}</Text>
              </Text>
            </View>
          ) : (
            <Text style={styles.helperText}>
              Thêm 1-5 hình để người khác hình dung được chỗ này.
            </Text>
          )}

          <View style={styles.evidenceHeader}>
            <View>
              <Text style={styles.evidenceTitle}>Hình ảnh</Text>
              <Text style={styles.evidenceHint}>
                Bắt buộc, tối đa {MAX_IMAGES} ảnh
              </Text>
            </View>
            <Text style={styles.evidenceCount}>
              {images.length}/{MAX_IMAGES}
            </Text>
          </View>
          <View style={styles.imageGrid}>
            {Array.from({ length: MAX_IMAGES }).map((_, index) => {
              const image = images[index];
              if (image) {
                return (
                  <View key={image.id} style={styles.imageTile}>
                    <Image
                      source={image.uri}
                      style={styles.imagePreview}
                      contentFit="cover"
                      alt="Ảnh địa điểm đã chọn"
                    />
                    {index === 0 && (
                      <View style={styles.coverBadge}>
                        <Text style={styles.coverBadgeText}>Ảnh chính</Text>
                      </View>
                    )}
                    <Pressable
                      style={styles.removeImageButton}
                      onPress={() =>
                        setImages((current) =>
                          current.filter((item) => item.id !== image.id),
                        )
                      }
                    >
                      <MaterialCommunityIcons
                        name="close"
                        size={16}
                        color="#fff"
                      />
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
                  <MaterialCommunityIcons
                    name="image-plus"
                    size={28}
                    color="#9ca3af"
                  />
                  <Text style={styles.emptyImageText}>Thêm ảnh</Text>
                </Pressable>
              );
            })}
          </View>

          {isVendorRegistration ? (
            <>
              <View style={styles.evidenceHeader}>
                <View>
                  <Text style={styles.evidenceTitle}>Video xác thực</Text>
                  <Text style={styles.evidenceHint}>
                    Bắt buộc cho vendor, tối đa {MAX_VIDEOS} video
                  </Text>
                </View>
                <Text style={styles.evidenceCount}>
                  {videos.length}/{MAX_VIDEOS}
                </Text>
              </View>
              {renderEvidenceFileList(videos, {
                addLabel: "Thêm video khác",
                emptyLabel: "Thêm video",
                iconName: "play-circle-outline",
                maxCount: MAX_VIDEOS,
                onAdd: handlePickVideos,
                onRemove: (id) =>
                  setVideos((current) =>
                    current.filter((item) => item.id !== id),
                  ),
              })}

              <View style={styles.evidenceHeader}>
                <View>
                  <Text style={styles.evidenceTitle}>Giấy phép</Text>
                  <Text style={styles.evidenceHint}>
                    Tùy chọn, tối đa {MAX_LICENSES} ảnh
                  </Text>
                </View>
                <Text style={styles.evidenceCount}>
                  {licenseFiles.length}/{MAX_LICENSES}
                </Text>
              </View>
              {renderEvidenceFileList(licenseFiles, {
                addLabel: "Thêm giấy phép khác",
                emptyLabel: "Thêm giấy phép",
                iconName: "file-document-outline",
                maxCount: MAX_LICENSES,
                onAdd: handlePickLicenseFiles,
                onRemove: (id) =>
                  setLicenseFiles((current) =>
                    current.filter((item) => item.id !== id),
                  ),
              })}
            </>
          ) : null}
        </View>
      );
    }

    const previewImage = images[0]?.uri;

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
                Một chỗ tương tự đã tồn tại gần đây. Bạn có muốn tiếp tục đăng
                riêng không?
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
            <Image
              source={previewImage}
              style={styles.summaryImage}
              contentFit="cover"
              alt="Ảnh xem trước địa điểm"
            />
          ) : null}
          <View style={styles.summaryBody}>
            <Text style={styles.summaryCategory}>
              {selectedCategory?.name || "Danh mục"}
            </Text>
            <Text style={styles.summaryName}>{name.trim()}</Text>
            <Text style={styles.summaryDescription}>{description.trim()}</Text>
            {openingHours ? (
              <View style={styles.addressRow}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={16}
                  color="#6b7280"
                />
                <Text style={styles.summaryAddress}>{openingHours}</Text>
              </View>
            ) : null}
            <View style={styles.chipWrap}>
              {selectedSubCategories.map((subCategory) => (
                <View key={subCategory._id} style={styles.summaryTag}>
                  <Text style={styles.summaryTagText}>{subCategory.name}</Text>
                </View>
              ))}
            </View>
            <View style={styles.addressRow}>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={16}
                color="#6b7280"
              />
              <Text style={styles.summaryAddress}>{resolvedAddress}</Text>
            </View>
            {isVendorRegistration ? (
              <View style={styles.vendorSummaryBox}>
                <View style={styles.vendorSummaryItem}>
                  <Text style={styles.vendorSummaryLabel}>Mã xác thực</Text>
                  <Text style={styles.vendorSummaryValue}>{systemCode}</Text>
                </View>
                <View style={styles.vendorSummaryItem}>
                  <Text style={styles.vendorSummaryLabel}>Video</Text>
                  <Text style={styles.vendorSummaryValue}>
                    {videos.length} tệp
                  </Text>
                </View>
                <View style={styles.vendorSummaryItem}>
                  <Text style={styles.vendorSummaryLabel}>Giấy phép</Text>
                  <Text style={styles.vendorSummaryValue}>
                    {licenseFiles.length > 0
                      ? `${licenseFiles.length} tệp`
                      : "Không có"}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
        <Text style={styles.noteText}>
          {isVendorRegistration
            ? "Hồ sơ đăng ký vendor sẽ được kiểm tra trước khi kích hoạt quyền quản lý địa điểm."
            : "Địa điểm sẽ được duyệt trong khoảng 24h trước khi hiển thị trên bản đồ."}
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
          <View style={styles.titleRow}>
            <Text style={styles.title}>
              {isVendorRegistration ? "Đăng ký địa điểm" : "Đóng góp địa điểm"}
            </Text>
            {isVendorRegistration ? (
              <Text selectable style={styles.headerSystemCode}>
                Mã: {displaySystemCode}
              </Text>
            ) : null}
          </View>
          <Text style={styles.subtitle}>
            Bước {step + 1}/4 - {activeStepLabels[step]}
          </Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        {activeStepLabels.map((_, index) => (
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
            saving && styles.primaryButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {step === 3
                ? isVendorRegistration
                  ? "Gửi đăng ký"
                  : "Gửi để duyệt"
                : "Tiếp tục"}
            </Text>
          )}
        </Pressable>
      </View>

      <Option<DuplicateDecision>
        visible={duplicateOptionVisible}
        setVisible={setDuplicateOptionVisible}
        title="Có thể bị trùng"
        message={duplicateOptionMessage}
        options={[
          {
            label: "Tiếp tục đăng",
            value: "continue",
            icon: "check-circle-outline",
          },
        ]}
        option={duplicateDecision}
        setOption={setDuplicateDecision}
        cancelLabel="Huỷ"
        onDismiss={handleDuplicateDecision}
      />
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
  titleRow: {
    flexDirection: "column",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    flexShrink: 1,
  },
  headerSystemCode: {
    color: "#8a8178",
    fontSize: 12,
    fontWeight: "700",
    backgroundColor: "#f7f1ea",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
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
  timeInput: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  timeInputText: {
    flex: 1,
    color: "#111827",
    fontSize: 15,
    fontWeight: "600",
  },
  timePlaceholderText: {
    color: "#9ca3af",
    fontWeight: "500",
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  codeNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f0d6c9",
    backgroundColor: "#fff7f3",
    padding: 12,
  },
  codeNoticeText: {
    flex: 1,
    color: "#6b4b3a",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },
  codeNoticeValue: {
    color: "#a34a22",
    fontWeight: "800",
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
  evidenceHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  evidenceTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800",
  },
  evidenceHint: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  evidenceCount: {
    color: "#8a8178",
    fontSize: 12,
    fontWeight: "800",
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
  fileList: {
    gap: 10,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    padding: 12,
  },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff1eb",
  },
  fileTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  fileMeta: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  removeFileButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  addFileButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#e7d9cd",
    backgroundColor: "#fffdf9",
    paddingHorizontal: 12,
  },
  addFileText: {
    color: "#a34a22",
    fontSize: 14,
    fontWeight: "800",
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
  vendorSummaryBox: {
    gap: 8,
    borderRadius: 16,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
  },
  vendorSummaryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  vendorSummaryLabel: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
  },
  vendorSummaryValue: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "800",
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
