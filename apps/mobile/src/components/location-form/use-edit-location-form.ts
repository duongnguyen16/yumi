import { userContext } from "@/contexts/userContext";
import { getAllCategories, getSubCategory } from "@/service/categoryService";
import {
  submitEditSuggestion,
  type EditSuggestionFlag,
} from "@/service/editSuggestionService";
import {
  getCurrentLocation,
  sentUpdatePhoneOtp,
  updateLocation,
  verifyUpdatePhoneOtp,
} from "@/service/locationService";
import * as ImagePicker from "expo-image-picker";
import { useContext, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import {
  buildSuggestionChanges,
  getAllowedEditFields,
  validateEditLocationSubmission,
  validatePhoneOtpRequest,
  validatePhoneOtpVerification,
  type EditField,
} from "./edit-location-model";
import type { LocationCategoryOption } from "./location-category-fields";

export type EditableLocation = {
  _id: string;
  name?: string;
  address?: string;
  openingHours?: string;
  description?: string;
  phone?: string;
  ownerId?: string | { _id?: string };
  categoryId?: { _id?: string };
  subCategoryIds?: Array<{ _id: string }>;
  geo?: { coordinates?: [number, number] };
  pinLocation?: { coordinates?: [number, number] };
};

export function useEditLocationForm({
  selectedChip,
  data,
}: {
  selectedChip: string[];
  data: EditableLocation;
}) {
  const { user } = useContext(userContext);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [categories, setCategories] = useState<LocationCategoryOption[]>([]);
  const [subCategories, setSubCategories] = useState<LocationCategoryOption[]>(
    [],
  );
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategories, setSelectedSubCategories] = useState<
    Record<string, string[]>
  >({});
  const [assets, setAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [clockVisible, setClockVisible] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pinLocation, setPinLocation] = useState<{
    longitude: number;
    latitude: number;
  } | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [flagValue, setFlagValue] =
    useState<EditSuggestionFlag>("PERMANENTLY_CLOSED");
  const [suggestionNote, setSuggestionNote] = useState("");
  const isOwner = Boolean(
    user?._id && data?.ownerId && String(user._id) === String(data.ownerId),
  );
  const selectedFields = useMemo(
    () =>
      selectedChip.filter((field): field is EditField =>
        getAllowedEditFields(isOwner).includes(field as EditField),
      ),
    [isOwner, selectedChip],
  );

  useEffect(() => {
    if (!selectedCategory) return;
    getSubCategory(selectedCategory).then((response) => {
      setSubCategories(response.data || []);
      setSelectedSubCategories((current) => ({
        ...current,
        [selectedCategory]: current[selectedCategory] || [],
      }));
    });
  }, [selectedCategory]);

  useEffect(() => {
    if (!data) return;
    getAllCategories().then((response) => {
      setCategories(response.data || []);
      setName(data.name || "");
      setAddress(data.address || "");
      setOpeningHours(data.openingHours || "");
      setDescription(data.description || "");
      setPhone(data.phone || "");
      const categoryId = data.categoryId?._id || "";
      setSelectedCategory(categoryId);
      const nextCoordinates =
        data.geo?.coordinates || data.pinLocation?.coordinates || null;
      setCoordinates(nextCoordinates);
      setPinLocation(
        nextCoordinates
          ? { longitude: nextCoordinates[0], latitude: nextCoordinates[1] }
          : null,
      );
      setSelectedSubCategories({
        [categoryId]:
          data.subCategoryIds?.map((item: { _id: string }) => item._id) || [],
      });
    });
  }, [data]);

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Cần quyền truy cập thư viện ảnh");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (!result.canceled) setAssets(result.assets);
  };

  const sendOtp = async () => {
    const phoneResult = validatePhoneOtpRequest(phone);
    if (!phoneResult.isValid || !phoneResult.phone) {
      Alert.alert(phoneResult.message);
      return;
    }

    const response = await sentUpdatePhoneOtp(data._id, phoneResult.phone);
    if (response.success) setOtpSent(true);
    Alert.alert(response.success ? "Đã gửi mã OTP" : "Gửi mã OTP thất bại");
  };

  const verifyOtp = async () => {
    const otpResult = validatePhoneOtpVerification(otp);
    if (!otpResult.isValid || !otpResult.otp) {
      Alert.alert(otpResult.message);
      return;
    }

    const response = await verifyUpdatePhoneOtp(data._id, otpResult.otp);
    if (response.success) setOtpVerified(true);
    Alert.alert(
      response.success
        ? "Xác minh số điện thoại thành công"
        : "Mã OTP không hợp lệ",
    );
    setOtp("");
  };

  const toggleSubCategory = (id: string) => {
    if (!selectedCategory) return;
    setSelectedSubCategories((current) => {
      const values = current[selectedCategory] || [];
      return {
        ...current,
        [selectedCategory]: values.includes(id)
          ? values.filter((value) => value !== id)
          : [...values, id],
      };
    });
  };

  const submitSuggestion = async () => {
    const selectedCoordinates: [number, number] | null = pinLocation
      ? [pinLocation.longitude, pinLocation.latitude]
      : coordinates;
    const changes = buildSuggestionChanges({
      selectedFields,
      openingHours,
      phone,
      coordinates: selectedCoordinates,
      flag: flagValue,
    });
    if (changes.length === 0) {
      Alert.alert("Chọn ít nhất một thông tin hợp lệ để đề xuất");
      return;
    }
    const response = await submitEditSuggestion(data._id, {
      changes,
      note: suggestionNote.trim() || undefined,
    });
    Alert.alert(
      response.success ? "Đã gửi đề xuất chỉnh sửa" : response.message,
    );
    if (response.success) setSuggestionNote("");
  };

  const submitOwnerUpdate = async () => {
    const selectedCoordinates: [number, number] | null = pinLocation
      ? [pinLocation.longitude, pinLocation.latitude]
      : coordinates;
    const validation = validateEditLocationSubmission({
      selectedFields,
      name,
      address,
      openingHours,
      description,
      phone,
      selectedCategory,
      coordinates: selectedCoordinates,
      assets,
      otpVerified,
    });
    if (!validation.isValid) {
      Alert.alert(validation.message);
      return;
    }
    const device = selectedFields.includes("address")
      ? await getCurrentLocation()
      : null;
    const payload = {
      name: selectedFields.includes("name") ? name : undefined,
      address: selectedFields.includes("address") ? address : undefined,
      openingHours: selectedFields.includes("openingHours")
        ? openingHours
        : undefined,
      description: selectedFields.includes("description")
        ? description
        : undefined,
      phone: selectedFields.includes("phone") ? phone : undefined,
      categoryId: selectedFields.includes("category")
        ? selectedCategory
        : undefined,
      subCategoryIds: selectedFields.includes("category")
        ? selectedSubCategories[selectedCategory] || []
        : undefined,
      pinLongitude: selectedFields.includes("address")
        ? (pinLocation?.longitude ?? coordinates?.[0])
        : undefined,
      pinLatitude: selectedFields.includes("address")
        ? (pinLocation?.latitude ?? coordinates?.[1])
        : undefined,
      deviceLongitude: device?.coords.longitude,
      deviceLatitude: device?.coords.latitude,
    };
    const formData = new FormData();
    formData.append("data", JSON.stringify(payload));
    assets.forEach((asset) =>
      formData.append("media", {
        uri: asset.uri,
        type:
          asset.mimeType ||
          (asset.type === "video" ? "video/mp4" : "image/jpeg"),
        name:
          asset.fileName ||
          `media-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`,
      } as unknown as Blob),
    );
    const response = await updateLocation(formData, data._id);
    Alert.alert(
      response.success
        ? "Cập nhật địa điểm thành công"
        : response.message || "Không thể cập nhật địa điểm",
    );
    if (response.success) setAssets([]);
  };

  const submit = async () => {
    setLoading(true);
    try {
      if (isOwner) await submitOwnerUpdate();
      else await submitSuggestion();
    } finally {
      setLoading(false);
    }
  };

  return {
    isOwner,
    selectedFields,
    name,
    setName,
    address,
    setAddress,
    openingHours,
    setOpeningHours,
    description,
    setDescription,
    phone,
    setPhone,
    categories,
    subCategories,
    selectedCategory,
    setSelectedCategory,
    selectedSubCategories,
    toggleSubCategory,
    searchQuery,
    setSearchQuery,
    assets,
    setAssets,
    pickMedia,
    coordinates,
    setCoordinates,
    pinLocation,
    setPinLocation,
    visible,
    setVisible,
    clockVisible,
    setClockVisible,
    otp,
    setOtp,
    otpSent,
    otpVerified,
    sendOtp,
    verifyOtp,
    flagValue,
    setFlagValue,
    suggestionNote,
    setSuggestionNote,
    loading,
    submit,
  };
}
