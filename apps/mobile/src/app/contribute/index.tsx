import React, { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import {
  Stack as RouterStack,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import * as ExpoLocation from "expo-location";
import * as ImagePicker from "expo-image-picker";
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
import LocationBasicFields from "@/components/location-form/location-basic-fields";
import LocationCategoryFields from "@/components/location-form/location-category-fields";
import LocationScheduleFields from "@/components/location-form/location-schedule-fields";
import {
  ActionSheet,
  AppText,
  Button,
  Card,
  Chip,
  FormSection,
  GroupedList,
  ListRow,
  LoadingState,
  MediaPicker,
  NoticeSnackbar,
  Page,
  Stack,
  TextField,
  WizardScreen,
} from "@/ui/components";
import Dialog from "@/ui/components/dialog";
import { colors, radius, spacing } from "@/ui/tokens";
import {
  contributionExitConfirmation,
  getContributionExitAction,
} from "@/navigation/contribution-exit";
import {
  validateContributionBasics,
  validateVendorVideos,
} from "@/common/contribute-validation";

const MAP_STYLE_URL =
  process.env.EXPO_PUBLIC_MAP_API ||
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

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
      response?: { data?: { message?: string | string[] } };
    };
    const apiMessage = response.response?.data?.message;
    if (typeof apiMessage === "string" && apiMessage.trim()) {
      return apiMessage;
    }
    if (Array.isArray(apiMessage)) {
      const text = apiMessage
        .filter((item): item is string => typeof item === "string")
        .join("\n");
      if (text.trim()) return text;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const logContributeError = (stage: string, error: unknown) => {
  console.log(`[Contribute][${stage}]`, error);
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
  const [exitConfirmationVisible, setExitConfirmationVisible] =
    useState(false);
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
  const [notice, setNotice] = useState("");
  const [noticeAction, setNoticeAction] = useState<
    { label: string; onPress: () => void } | undefined
  >();
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
            setSystemCode(response.systemCode);
          } else {
            setNotice(
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
        logContributeError("bootstrap", error);
        setNotice("Không tải được dữ liệu đóng góp địa điểm.");
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
        logContributeError("load-sub-categories", error);
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
          setNotice("Hãy cấp quyền vị trí để đóng góp địa điểm.");
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
        logContributeError("load-device-location", error);
        setNotice("Không lấy được vị trí hiện tại.");
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
        logContributeError("analyze-draft", error);
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
      setNotice("Bạn chỉ được chọn tối đa 5 ảnh.");
      return;
    }

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        setNotice("Bạn cần cấp quyền thư viện ảnh để chọn ảnh.");
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
    } catch (error) {
      logContributeError("pick-images", error);
      setNotice(getErrorMessage(error, "Không thể chọn ảnh. Vui lòng thử lại."));
    }
  };

  const handlePickVideos = async () => {
    if (videos.length >= MAX_VIDEOS) {
      setNotice("Bạn chỉ được chọn tối đa 2 video.");
      return;
    }

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        setNotice("Bạn cần cấp quyền thư viện để chọn video.");
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

      const videoValidation = validateVendorVideos(result.assets);
      if (!videoValidation.isValid) {
        setNotice(videoValidation.message || "Video xác thực không hợp lệ.");
        return;
      }

      const newVideos = result.assets.map((asset, index) => ({
        id: `video-${Date.now()}-${index}`,
        uri: asset.uri,
        fileName: asset.fileName ?? `verification-${Date.now()}-${index}.mp4`,
        mimeType: asset.mimeType ?? "video/mp4",
        fileSize: asset.fileSize as number,
      }));

      setVideos((current) => [...current, ...newVideos].slice(0, MAX_VIDEOS));
    } catch (error) {
      logContributeError("pick-videos", error);
      setNotice(getErrorMessage(error, "Không thể chọn video. Vui lòng thử lại."));
    }
  };

  const handlePickLicenseFiles = async () => {
    if (licenseFiles.length >= MAX_LICENSES) {
      setNotice("Bạn chỉ được chọn tối đa 3 ảnh giấy phép.");
      return;
    }

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        setNotice("Bạn cần cấp quyền thư viện ảnh để chọn giấy phép.");
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
    } catch (error) {
      logContributeError("pick-license-files", error);
      setNotice(
        getErrorMessage(error, "Không thể chọn ảnh giấy phép. Vui lòng thử lại."),
      );
    }
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
    try {
      const payload = buildCustomerContributionPayload();
      console.log("[Contribute][submit-customer] payload", {
        imageCount: images.length,
        payload,
      });
      const response = await submitCustomerContribution(
        payload,
        toPendingEvidenceFiles(images),
      );
      console.log("[Contribute][submit-customer] response", response);
      if (response?.success === false) {
        throw new Error(response.message || "Gửi địa điểm thất bại.");
      }
      return response;
    } catch (error) {
      logContributeError("submit-customer", error);
      throw error;
    }
  };

  const submitVendorRegistrationDataToBackend = async () => {
    if (!systemCode) {
      return {
        success: false,
        message: "Không thể gửi đăng ký vendor khi chưa có mã xác thực.",
      };
    }
    try {
      console.log("[Contribute][submit-vendor] payload", {
        imageCount: images.length,
        licenseCount: licenseFiles.length,
        videoCount: videos.length,
      });
      const response = await submitVendorRegistration({
        ...buildCustomerContributionPayload(),
        systemCode,
        isPotentialDuplicate: similarLocations.length > 0,
        videoFiles: toPendingEvidenceFiles(videos),
        licenseFiles: toPendingEvidenceFiles(licenseFiles),
        imageFiles: toPendingEvidenceFiles(images),
      });
      if (response?.success === false) {
        return {
          success: false,
          message: response?.message || "Đăng ký địa điểm thất bại",
        };
      }
      console.log("[Contribute][submit-vendor] response", response);
      return {
        success: true,
      };
    } catch (error) {
      logContributeError("submit-vendor", error);
      return {
        success: false,
        message: getErrorMessage(error, "Đăng ký địa điểm thất bại"),
      };
    }
  };

  const handleContinue = async () => {
    if (step === 0) {
      const basicValidation = validateContributionBasics({
        name,
        description,
        selectedCategoryId,
        openingHours,
      });
      if (!basicValidation.isValid) {
        logContributeError("step-basic-validation", {
          descriptionLength: description.trim().length,
          message: basicValidation.message,
          nameLength: name.trim().length,
          openingHours,
          selectedCategoryId,
        });
        setNotice(basicValidation.message || "Thông tin địa điểm không hợp lệ.");
        return;
      }
      setStep(1);
      return;
    }

    if (step === 1) {
      if (!pinCoords || !deviceCoords) {
        setNotice("Không lấy được vị trí để kiểm tra 50m.");
        return;
      }

      let checkingDuplicates = false;
      try {
        setSaving(true);
        console.log("[Contribute][continue-validate-position] payload", {
          accuracyMeters,
          deviceCoords,
          pinCoords,
          resolvedAddress,
        });
        const validatePosition = await validateContributionPosition({
          pinLatitude: pinCoords.latitude,
          pinLongitude: pinCoords.longitude,
          deviceLatitude: deviceCoords.latitude,
          deviceLongitude: deviceCoords.longitude,
          accuracyMeters,
          address: resolvedAddress,
        });
        if (!validatePosition.success) {
          setNotice(
            validatePosition?.message ||
              "Bạn phải đứng trong phạm vi 50m mới được tạo địa điểm.",
          );
          return;
        }
        if (!validatePosition.withinRange) {
          setNotice("Bạn phải đứng trong phạm vi 50m mới được tạo địa điểm.");
          return;
        }
        checkingDuplicates = true;
        console.log("[Contribute][continue-check-duplicates] payload", {
          latitude: pinCoords.latitude,
          longitude: pinCoords.longitude,
          name: name.trim(),
          selectedCategoryId,
        });
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
          setDuplicateOptionVisible(true);
          return;
        }

        setStep(2);
      } catch (error: unknown) {
        logContributeError(
          checkingDuplicates ? "continue-check-duplicates" : "continue-validate-position",
          error,
        );
        setNotice(
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
        setNotice("Không thể gửi đăng ký vendor khi chưa có mã xác thực.");
        return;
      }

      if (isVendorRegistration && videos.length < 1) {
        setNotice("Hãy thêm ít nhất 1 video có chứa mã xác thực.");
        return;
      }
      if (!isVendorRegistration && images.length < 1) {
        setNotice("Hãy chọn ít nhất 1 ảnh.");
        return;
      }

      setStep(3);
      return;
    }

    if (step === 3) {
      try {
        setSaving(true);
        console.log("[Contribute][continue-submit] start", {
          imageCount: images.length,
          isVendorRegistration,
          licenseCount: licenseFiles.length,
          videoCount: videos.length,
        });
        if (isVendorRegistration) {
          const response = await submitVendorRegistrationDataToBackend();
          if (response?.success === false) {
            setNotice(
              response?.message ||
                "Không thể gửi đăng ký vendor. Vui lòng thử lại.",
            );
            return;
          }
          setImages([]);
          setVideos([]);
          setLicenseFiles([]);
        } else {
          await submitCustomerDataToBackend();
        }

        setNotice(
          isVendorRegistration
            ? "Hồ sơ vendor của bạn đang chờ phê duyệt."
            : "Địa điểm của bạn đang chờ phê duyệt.",
        );
        setNoticeAction({
          label: "Đóng",
          onPress: () => router.replace("/(tabs)/home"),
        });
      } catch (error: unknown) {
        logContributeError(
          isVendorRegistration ? "continue-submit-vendor" : "continue-submit-customer",
          error,
        );
        setNotice(
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

  const exitContribution = () => {
    if (getContributionExitAction(router.canGoBack()) === "BACK") {
      router.back();
      return;
    }

    router.replace("/(tabs)/home");
  };

  const handleDuplicateDecision = () => {
    setDuplicateOptionVisible(false);
    setStep(2);
  };

  const handleMapRegionChange = async () => {
    try {
      const center = await mapRef.current?.getCenter();
      if (!center) {
        return;
      }

      setPinCoords({
        longitude: center[0],
        latitude: center[1],
      });
    } catch (error) {
      logContributeError("map-region-change", error);
      setNotice("Không thể cập nhật vị trí ghim trên bản đồ.");
    }
  };

  const renderStepContent = () => {
    if (step === 0) {
      return (
        <Stack>
          <LocationBasicFields
            description={description}
            name={name}
            onDescriptionChange={setDescription}
            onNameChange={setName}
          />
          {draftAnalysisError ? (
            <AppText style={{ color: colors.accentRed }} variant="caption">
              {draftAnalysisError}
            </AppText>
          ) : null}
          <LocationScheduleFields
            onOpenPicker={() => setClockVisible(true)}
            openingHours={openingHours}
          />
          <TimePickerModal
            cancelLabel="Hủy"
            confirmLabel={pickerMode === "start" ? "Tiếp theo" : "Xác nhận"}
            hours={
              pickerMode === "start"
                ? (openHours?.hours ?? 7)
                : (closeHours?.hours ?? 8)
            }
            label={
              pickerMode === "start" ? "Chọn giờ mở cửa" : "Chọn giờ đóng cửa"
            }
            locale="en"
            minutes={
              pickerMode === "start"
                ? (openHours?.minutes ?? 0)
                : (closeHours?.minutes ?? 0)
            }
            onConfirm={handleClockConfirm}
            onDismiss={handleClockDismiss}
            use24HourClock
            visible={clockVisible}
          />
          <LocationCategoryFields
            categories={categories}
            error={subCategoryError}
            loading={subCategoryLoading}
            onCategoryChange={(categoryId) => {
              setSelectedCategoryId(categoryId);
              setSelectedSubCategoryIds([]);
              setSubCategories([]);
              setSubCategoryError("");
            }}
            onToggleSubCategory={toggleSubCategory}
            selectedCategoryId={selectedCategoryId}
            selectedSubCategoryIds={selectedSubCategoryIds}
            subCategories={subCategories}
          />
        </Stack>
      );
    }

    if (step === 1) {
      return (
        <Stack>
          <FormSection
            supportingText="Kéo bản đồ để đặt ghim tại vị trí chính xác."
            title="Vị trí trên bản đồ"
          >
            {mapStyle && pinCoords ? (
              <View
                style={{
                  borderRadius: radius.large,
                  height: 330,
                  overflow: "hidden",
                }}
              >
                <Map
                  mapStyle={mapStyle}
                  onRegionDidChange={handleMapRegionChange}
                  ref={mapRef}
                  style={{ flex: 1 }}
                >
                  <Camera
                    initialViewState={{
                      center: [pinCoords.longitude, pinCoords.latitude],
                      zoom: 17,
                    }}
                  />
                  <NativeUserLocation />
                </Map>
                <View
                  pointerEvents="none"
                  style={{
                    alignItems: "center",
                    bottom: 0,
                    justifyContent: "center",
                    left: 0,
                    position: "absolute",
                    right: 0,
                    top: -18,
                  }}
                >
                  <MaterialCommunityIcons
                    color={colors.accentPrimary}
                    name="map-marker"
                    size={42}
                  />
                </View>
              </View>
            ) : (
              <View style={{ height: 330 }}>
                <LoadingState label="Đang tải bản đồ" />
              </View>
            )}
          </FormSection>
          <FormSection
            supportingText={
              autoAddress || "Đang lấy địa chỉ từ vị trí đã chọn."
            }
            title="Địa chỉ"
          >
            <TextField
              label="Chỉnh sửa địa chỉ"
              onChangeText={setManualAddress}
              placeholder="Nhập địa chỉ chính xác"
              value={manualAddress}
            />
          </FormSection>
        </Stack>
      );
    }

    if (step === 2) {
      return (
        <Stack>
          {isVendorRegistration ? (
            <Card>
              <AppText variant="headline">
                Mã xác thực: {displaySystemCode}
              </AppText>
              <AppText
                style={{ color: colors.textSecondary }}
                variant="subhead"
              >
                Mã này cần xuất hiện rõ trong ảnh hoặc video xác thực.
              </AppText>
            </Card>
          ) : null}
          <MediaPicker
            addLabel="Thêm ảnh"
            items={images.map((item) => ({
              id: item.id,
              metadata: formatFileSize(item.fileSize),
              name: item.fileName,
              uri: item.uri,
            }))}
            maxCount={MAX_IMAGES}
            onAdd={handlePickImages}
            onRemove={(id) =>
              setImages((current) => current.filter((item) => item.id !== id))
            }
            supportingText="Bắt buộc, ảnh đầu tiên được dùng làm ảnh chính."
            title="Hình ảnh"
          />

          {isVendorRegistration ? (
            <>
              <MediaPicker
                addLabel="Thêm video"
                icon="play-circle-outline"
                items={videos.map((item) => ({
                  id: item.id,
                  metadata: formatFileSize(item.fileSize),
                  name: item.fileName,
                }))}
                maxCount={MAX_VIDEOS}
                onAdd={handlePickVideos}
                onRemove={(id) =>
                  setVideos((current) =>
                    current.filter((item) => item.id !== id),
                  )
                }
                supportingText="Bắt buộc cho hồ sơ vendor."
                title="Video xác thực"
              />
              <MediaPicker
                addLabel="Thêm giấy phép"
                icon="file-document-outline"
                items={licenseFiles.map((item) => ({
                  id: item.id,
                  metadata: formatFileSize(item.fileSize),
                  name: item.fileName,
                }))}
                maxCount={MAX_LICENSES}
                onAdd={handlePickLicenseFiles}
                onRemove={(id) =>
                  setLicenseFiles((current) =>
                    current.filter((item) => item.id !== id),
                  )
                }
                supportingText="Tùy chọn, tối đa 3 tệp."
                title="Giấy phép"
              />
            </>
          ) : null}
        </Stack>
      );
    }

    return (
      <Stack>
        {duplicateWarning && (
          <Card>
            <AppText style={{ color: colors.accentOrange }} variant="headline">
              Có vẻ trùng với {similarLocations[0]?.name}
            </AppText>
            <AppText style={{ color: colors.textSecondary }} variant="subhead">
              Một địa điểm tương tự đã tồn tại gần đây.
            </AppText>
            <Button
              label="Xem địa điểm cũ"
              onPress={() =>
                similarLocations[0]?.id &&
                router.push(`/location/${similarLocations[0].id}`)
              }
              variant="secondary"
            />
          </Card>
        )}
        <Card>
          <AppText variant="title1">{name.trim()}</AppText>
          <AppText style={{ color: colors.textSecondary }} variant="body">
            {description.trim()}
          </AppText>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}
          >
            <Chip label={selectedCategory?.name || "Danh mục"} selected />
            {selectedSubCategories.map((item) => (
              <Chip key={item._id} label={item.name} />
            ))}
          </View>
        </Card>
        <GroupedList>
          <ListRow
            icon="map-marker-outline"
            label="Địa chỉ"
            showChevron={false}
            supportingText={resolvedAddress}
          />
          <ListRow
            icon="clock-outline"
            label="Giờ hoạt động"
            showChevron={false}
            value={openingHours || "Chưa chọn"}
          />
          <ListRow
            icon="image-outline"
            label="Hình ảnh"
            showChevron={false}
            value={`${images.length} ảnh`}
          />
          {isVendorRegistration ? (
            <ListRow
              icon="shield-check-outline"
              label="Mã xác thực"
              showChevron={false}
              value={systemCode || "Đang tạo"}
            />
          ) : null}
        </GroupedList>
        <AppText style={{ color: colors.textSecondary }} variant="subhead">
          {isVendorRegistration
            ? "Hồ sơ đăng ký vendor sẽ được kiểm tra trước khi kích hoạt quyền quản lý địa điểm."
            : "Địa điểm sẽ được duyệt trong khoảng 24h trước khi hiển thị trên bản đồ."}
        </AppText>
      </Stack>
    );
  };

  if (loading) {
    return (
      <Page>
        <LoadingState label="Đang chuẩn bị biểu mẫu" />
      </Page>
    );
  }

  return (
    <>
      <RouterStack.Screen options={{ headerShown: false }} />
      <WizardScreen
        continueLabel={
          step === 3
            ? isVendorRegistration
              ? "Gửi đăng ký"
              : "Gửi để duyệt"
            : "Tiếp tục"
        }
        currentStep={step}
        loading={saving}
        metadata={isVendorRegistration ? `Mã: ${displaySystemCode}` : undefined}
        onExit={() => setExitConfirmationVisible(true)}
        onStepBack={() => setStep((current) => Math.max(0, current - 1))}
        onContinue={handleContinue}
        showFooterBack={step > 0}
        stepLabels={activeStepLabels.map((label) =>
          label.replace(/^\d+\.\s*/, ""),
        )}
        title={isVendorRegistration ? "Đăng ký địa điểm" : "Đóng góp địa điểm"}
      >
        {renderStepContent()}
      </WizardScreen>

      <Dialog
        {...contributionExitConfirmation}
        option
        result={(confirmed) => {
          if (confirmed) exitContribution();
        }}
        setVisible={setExitConfirmationVisible}
        visible={exitConfirmationVisible}
      />

      <ActionSheet
        actions={[
          {
            icon: "check-circle-outline",
            label: "Tiếp tục đăng",
            onPress: handleDuplicateDecision,
          },
        ]}
        message={duplicateOptionMessage}
        onDismiss={() => setDuplicateOptionVisible(false)}
        title="Có thể bị trùng"
        visible={duplicateOptionVisible}
      />
      <NoticeSnackbar
        action={noticeAction}
        message={notice}
        onDismiss={() => {
          setNotice("");
          setNoticeAction(undefined);
        }}
      />
    </>
  );
}
