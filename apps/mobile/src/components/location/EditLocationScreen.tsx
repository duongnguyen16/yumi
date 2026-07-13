import { useContext, useEffect, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { Button, Chip, Text, TextInput, Searchbar } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { getAllCategories, getSubCategory } from "@/service/categoryService";
import { TimePickerModal } from "react-native-paper-dates";
import CustomMap from "./ui/CustomMap";
import GetNewLocation from "./modals/GetNewLocation";
import {
  getCurrentLocation,
  sentUpdatePhoneOtp,
  updateLocation,
  verifyUpdatePhoneOtp,
} from "@/service/locationService";
import {
  EditSuggestionChange,
  EditSuggestionFlag,
  submitEditSuggestion,
} from "@/service/editSuggestionService";
import { userContext } from "@/contexts/userContext";
import { set } from "zod/v3";

type TimeValue = {
  hours: number;
  minutes: number;
};

type TimePickerMode = "start" | "end";

const formatTimeValue = ({ hours, minutes }: TimeValue) =>
  `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

type EditChip =
  | "name"
  | "address"
  | "openingHours"
  | "description"
  | "phone"
  | "flag"
  | "category";

const OWNER_CHIPS: EditChip[] = [
  "name",
  "address",
  "openingHours",
  "description",
  "phone",
  "category",
];

const NON_OWNER_CHIPS: EditChip[] = [
  "address",
  "openingHours",
  "phone",
  "flag",
];

const CHIP_LABELS: Record<EditChip, string> = {
  name: "Tên địa điểm",
  address: "Vị trí",
  openingHours: "Giờ mở cửa",
  description: "Mô tả",
  phone: "Số điện thoại",
  flag: "Cờ trạng thái",
  category: "Danh mục",
};

export default function EditLocationScreen({
  selectedChip,
  setSelectedChip,
  data,
}) {
  const { user } = useContext(userContext);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [openHours, setOpenHours] = useState<TimeValue | null>(null);
  const [closeHours, setCloseHours] = useState<TimeValue | null>(null);
  const [openingHours, setOpeningHours] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState([]);
  const [subCategory, setSubCategory] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState();
  const [selectedSubCategory, setSelectedSubCategory] = useState<
    Record<string, string[]>
  >({});
  const [assets, setAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [coordinates, setCoordinates] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [clockVisible, setClockVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<TimePickerMode>("start");
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
  const allowedChips = isOwner ? OWNER_CHIPS : NON_OWNER_CHIPS;
  const selectedChips = selectedChip.filter((chip): chip is EditChip =>
    allowedChips.includes(chip as EditChip),
  );

  const uploadMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Cần quyền truy cập thư viện ảnh");
      return;
    }
    if (assets.length > 0) {
      setAssets([]);
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (result.canceled) {
      return;
    }

    setAssets(result.assets);
  };

  // const handleDismissModal = async () => {
  //   setVisible(false);
  //   try{
  //     const response = await analyzeLocationDraft()
  //   }
  // }

  const sentOtp = async () => {
    try {
      const response = await sentUpdatePhoneOtp(data._id, phone);
      if (response.success) {
        setOtpSent(true);
        Alert.alert("Gửi mã OTP thành công");
      }
      if (!response.success) {
        Alert.alert("Gửi mã OTP thất bại");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      Alert.alert("Gửi mã OTP thất bại");
    }
  };

  const verifyOtp = async () => {
    try {
      const response = await verifyUpdatePhoneOtp(data._id, otp);
      console.log(response);
      if (response.success) {
        setOtpVerified(true);
        Alert.alert("Mã OTP xác nhận thành công");
      }
      if (!response.success) {
        Alert.alert("Mã OTP xác nhận thất bại");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      Alert.alert("Xác nhận mã OTP thất bại");
    } finally {
      setOtp("");
      setOtpSent(false);
      setOtpVerified(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    if (!isOwner) {
      await handleSubmitSuggestion();
      return;
    }
    if (selectedChips.includes("name")) {
      if (!assets || assets.length === 0) {
        Alert.alert("Vui lòng thêm bằng chứng");
        setLoading(false);
        return;
      }
    }
    if (selectedChips.includes("address")) {
      if (!coordinates) {
        Alert.alert("Vui lòng xác thực lại vị trí");
        setLoading(false);
        return;
      }
      if (!assets || assets.length === 0) {
        Alert.alert("Vui lòng thêm bằng chứng");
        setLoading(false);
        return;
      }
    }
    if (selectedChips.includes("phone") && !otpVerified) {
      Alert.alert("Vui lòng xác nhận số điện thoại");
      setLoading(false);
      return;
    }
    if (!selectedCategory) return;
    let deviceLocation = null;
    if (selectedChip.includes("address")) {
      const result = await getCurrentLocation();
      deviceLocation = [result.coords.longitude, result.coords.latitude];
    }
    const submitData = {
      name: selectedChips.includes("name") ? name : undefined,
      address: selectedChips.includes("address") ? address : undefined,
      openingHours: selectedChips.includes("openingHours")
        ? openingHours
        : undefined,
      description: selectedChips.includes("description")
        ? description
        : undefined,
      phone: selectedChips.includes("phone") ? phone : undefined,
      categoryId: selectedChips.includes("category")
        ? selectedCategory
        : undefined,
      subCategoryIds: selectedChips.includes("category")
        ? selectedSubCategory[selectedCategory] || []
        : undefined,
      pinLongitude: selectedChips.includes("address")
        ? (pinLocation?.longitude ?? coordinates[0])
        : undefined,
      pinLatitude: selectedChips.includes("address")
        ? (pinLocation?.latitude ?? coordinates[1])
        : undefined,
      deviceLongitude: selectedChip.includes("address")
        ? deviceLocation?.[0]
        : undefined,
      deviceLatitude: selectedChip.includes("address")
        ? deviceLocation?.[1]
        : undefined,
    };
    console.log(submitData);
    const formData = new FormData();
    formData.append("data", JSON.stringify(submitData));
    assets.forEach((asset) => {
      const mediaFile = {
        uri: asset.uri,
        type:
          asset.mimeType ||
          (asset.type === "video" ? "video/mp4" : "image/jpeg"),
        name:
          asset.fileName ||
          `media-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`,
      } as unknown as Blob;

      formData.append("media", mediaFile);
    });
    try {
      const response = await updateLocation(formData, data._id);
      if (response.success) {
        Alert.alert("Cập nhật địa điểm thành công");
      }
    } catch (error) {
      console.error("Error updating location:", error);
    } finally {
      setLoading(false);
      setAssets([]);
      setOtp("");
      setOtpSent(false);
      setOtpVerified(false);
    }
  };

  const handleSubmitSuggestion = async () => {
    if (!data?._id) {
      Alert.alert("Không tìm thấy địa điểm");
      setLoading(false);
      return;
    }
    const changes: EditSuggestionChange[] = [];

    if (selectedChips.includes("openingHours")) {
      if (!openingHours.trim()) {
        Alert.alert("Vui long nhap gio mo cua");
        setLoading(false);
        return;
      }
      changes.push({
        fieldName: "openingHours",
        textValue: openingHours.trim(),
      });
    }

    if (selectedChips.includes("phone")) {
      if (!phone.trim()) {
        Alert.alert("Vui long nhap so dien thoai");
        setLoading(false);
        return;
      }
      changes.push({ fieldName: "phone", textValue: phone.trim() });
    }

    if (selectedChips.includes("address")) {
      const longitude = pinLocation?.longitude ?? coordinates?.[0];
      const latitude = pinLocation?.latitude ?? coordinates?.[1];
      if (latitude === undefined || longitude === undefined) {
        Alert.alert("Vui long chon vi tri de xuat");
        setLoading(false);
        return;
      }
      changes.push({
        fieldName: "geo",
        geoValue: { latitude, longitude },
      });
    }

    if (selectedChips.includes("flag")) {
      changes.push({ fieldName: "flag", flagValue });
    }

    if (changes.length === 0) {
      Alert.alert("Vui long chon it nhat mot thong tin de de xuat");
      setLoading(false);
      return;
    }

    try {
      const response = await submitEditSuggestion(data._id, {
        changes,
        note: suggestionNote.trim() || undefined,
      });
      if (response.success) {
        Alert.alert("Da gui de xuat chinh sua");
        setSuggestionNote("");
      } else {
        Alert.alert(response.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSubCategory = (subCategoryId: string) => {
    if (!selectedCategory) return;
    setSelectedSubCategory((prev) => {
      if (prev[selectedCategory]?.includes(subCategoryId)) {
        return {
          ...prev,
          [selectedCategory]: prev[selectedCategory].filter(
            (id) => id !== subCategoryId,
          ),
        };
      } else {
        return {
          ...prev,
          [selectedCategory]: [
            ...(prev[selectedCategory] || []),
            subCategoryId,
          ],
        };
      }
    });
  };

  const handleClockConfirm = ({ hours, minutes }: TimeValue) => {
    if (pickerMode === "start") {
      setOpenHours({ hours, minutes });
      setPickerMode("end");
    }
    if (pickerMode === "end") {
      const start = openHours ?? { hours: 7, minutes: 0 };
      const end = { hours, minutes };

      setCloseHours({ hours, minutes });
      setPickerMode("start");
      setClockVisible(false);
      setOpeningHours(`${formatTimeValue(start)}-${formatTimeValue(end)}`);
    }
  };

  const searchCategory = () => {
    return category.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  };

  useEffect(() => {
    const fetchSubcategoryData = async () => {
      if (selectedCategory) {
        const response = await getSubCategory(selectedCategory);
        setSubCategory(response.data || []);
        setSelectedSubCategory((prev) => {
          return {
            ...prev,
            [selectedCategory]: prev[selectedCategory] || [],
          };
        });
      }
    };
    fetchSubcategoryData();
  }, [selectedCategory]);

  useEffect(() => {
    if (!data) return;
    const fetchCategoryData = async () => {
      const response = await getAllCategories();
      setName(data.name || "");
      setAddress(data.address || "");
      setOpeningHours(data.openingHours || "");
      setDescription(data.description || "");
      setPhone(data.phone || "");
      setCategory(response.data || "");
      setSelectedCategory(data.categoryId._id || "");
      const locationCoordinates =
        data.geo?.coordinates || data.pinLocation?.coordinates || null;
      setCoordinates(data.geo?.coordinates || null);
      setPinLocation(
        locationCoordinates
          ? {
              longitude: locationCoordinates[0],
              latitude: locationCoordinates[1],
            }
          : null,
      );
      setSelectedSubCategory({
        [data.categoryId._id]:
          data.subCategoryIds?.map((subCategory) => subCategory._id) || [],
      });
    };
    fetchCategoryData();
  }, [data]);
  return (
    <View style={{ flex: 1, padding: 10 }}>
      <ScrollView
        style={{ flexGrow: 0, marginBottom: 10 }}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <View style={{ gap: 2, flexDirection: "row" }}>
          {isOwner ? (
            <Chip
              onPress={() => setSelectedChip("name")}
              selected={selectedChips.includes("name")}
            >
              Tên địa điểm
            </Chip>
          ) : null}

          <Chip
            onPress={() => setSelectedChip("address")}
            selected={selectedChips.includes("address")}
          >
            Địa chỉ
          </Chip>

          <Chip
            onPress={() => setSelectedChip("openingHours")}
            selected={selectedChips.includes("openingHours")}
          >
            Giờ mở cửa
          </Chip>

          {isOwner ? (
            <Chip
              onPress={() => setSelectedChip("description")}
              selected={selectedChips.includes("description")}
            >
              Mô tả
            </Chip>
          ) : null}
          <Chip
            onPress={() => setSelectedChip("phone")}
            selected={selectedChips.includes("phone")}
          >
            Số điện thoại
          </Chip>
          {!isOwner ? (
            <Chip
              onPress={() => setSelectedChip("flag")}
              selected={selectedChips.includes("flag")}
            >
              Co trang thai
            </Chip>
          ) : null}
          {isOwner ? (
            <Chip
              onPress={() => setSelectedChip("category")}
              selected={selectedChips.includes("category")}
            >
              Danh mục
            </Chip>
          ) : null}
        </View>
      </ScrollView>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={{ marginTop: 12 }}>
          {selectedChips.includes("name") && (
            <View style={{ marginBottom: 12 }}>
              <Text>Tên địa điểm</Text>
              <TextInput
                placeholder="Hãy nhập tên địa điểm"
                mode="outlined"
                value={name}
                onChangeText={setName}
              />
            </View>
          )}

          {selectedChips.includes("address") && (
            <View style={{ marginBottom: 12 }}>
              <Text>Địa chỉ</Text>
              <TextInput
                placeholder="Hãy nhập địa chỉ"
                mode="outlined"
                value={address}
                editable={isOwner}
                style={{ marginBottom: 10 }}
                onChangeText={setAddress}
              />
              {coordinates && (
                <CustomMap
                  coordinates={coordinates}
                  setCoordinates={setCoordinates}
                  previewMode={true}
                  pinLocation={pinLocation}
                  setPinLocation={setPinLocation}
                />
              )}
              {selectedChips.length !== 0 &&
                isOwner &&
                selectedChips.includes("address") && (
                  <View
                    style={{ marginTop: 10, gap: 10, flexDirection: "row" }}
                  >
                    <Button
                      icon={"refresh"}
                      mode="outlined"
                      style={{ alignSelf: "flex-start" }}
                      onPress={() => setVisible(true)}
                    >
                      Lấy vị trí mới
                    </Button>
                    <Button
                      icon={"plus"}
                      mode="outlined"
                      style={{ alignSelf: "flex-start" }}
                      onPress={() => uploadMedia()}
                    >
                      {assets.length > 0
                        ? `Thêm bằng chứng (${assets.length})`
                        : "Thêm bằng chứng"}
                    </Button>
                  </View>
                )}
              {!isOwner && (
                <Button
                  icon="map-marker"
                  mode="outlined"
                  style={{ alignSelf: "flex-start", marginTop: 10 }}
                  onPress={() => setVisible(true)}
                >
                  Kéo pin vị trí
                </Button>
              )}
            </View>
          )}

          {selectedChips.includes("openingHours") && (
            <View style={{ marginBottom: 12 }}>
              <Text>Giờ mở cửa</Text>
              <TextInput
                placeholder="Hãy nhập giờ mở cửa"
                mode="outlined"
                value={openingHours}
                editable={false}
                onChangeText={setOpeningHours}
                right={
                  <TextInput.Icon
                    icon="clock-outline"
                    onPress={() => setClockVisible(true)}
                  />
                }
              />
              <TimePickerModal
                visible={clockVisible}
                onDismiss={() => setClockVisible(false)}
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
                  pickerMode === "start"
                    ? "Chọn giờ mở cửa"
                    : "Chọn giờ đóng cửa"
                }
                cancelLabel="Hủy"
                confirmLabel={pickerMode === "start" ? "Tiếp theo" : "Xác nhận"}
              />
            </View>
          )}

          {selectedChips.includes("description") && (
            <View style={{ marginBottom: 12 }}>
              <Text>Mô tả</Text>
              <TextInput
                placeholder="Hãy nhập mô tả"
                mode="outlined"
                multiline
                value={description}
                onChangeText={setDescription}
              />
            </View>
          )}
          {selectedChips.includes("phone") && (
            <View style={{ marginBottom: 12 }}>
              <Text>Số điện thoại</Text>
              <View
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <TextInput
                  placeholder="Hãy nhập số điện thoại"
                  mode="outlined"
                  value={phone}
                  onChangeText={setPhone}
                  style={{ flex: 1, marginRight: 10 }}
                />
                <Button
                  mode="contained"
                  disabled={!isOwner}
                  style={{ borderRadius: 4, paddingVertical: 6 }}
                  onPress={(e) => {
                    e.stopPropagation();
                    sentOtp();
                  }}
                >
                  Gửi mã
                </Button>
              </View>
              {isOwner && otpSent && (
                <View style={{ marginBottom: 12 }}>
                  <Text>Nhập mã xác nhận</Text>

                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <TextInput
                      placeholder="Hãy nhập mã xác nhận"
                      mode="outlined"
                      value={otp}
                      onChangeText={setOtp}
                      style={{ flex: 1, marginRight: 10 }}
                    />

                    <Button
                      mode="contained"
                      style={{ borderRadius: 4, paddingVertical: 6 }}
                      onPress={(e) => {
                        e.stopPropagation();
                        verifyOtp();
                      }}
                      disabled={otpVerified}
                    >
                      Xác nhận
                    </Button>
                  </View>
                </View>
              )}
            </View>
          )}
          {!isOwner && selectedChips.includes("flag") && (
            <View style={{ marginBottom: 12 }}>
              <Text>Co trang thai</Text>
              <View style={{ gap: 8, marginTop: 8 }}>
                <Chip
                  selected={flagValue === "PERMANENTLY_CLOSED"}
                  onPress={() => setFlagValue("PERMANENTLY_CLOSED")}
                >
                  Da dong cua
                </Chip>
                <Chip
                  selected={flagValue === "DUPLICATE"}
                  onPress={() => setFlagValue("DUPLICATE")}
                >
                  Trung lap
                </Chip>
                <Chip
                  selected={flagValue === "NON_EXISTENT"}
                  onPress={() => setFlagValue("NON_EXISTENT")}
                >
                  Không tồn tại
                </Chip>
              </View>
            </View>
          )}
          {selectedChips.includes("category") && (
            <View style={{ marginBottom: 12 }}>
              <Text>Danh mục</Text>
              <Searchbar
                placeholder="Tìm kiếm danh mục"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <View>
                {searchCategory().map((item, index) => (
                  <View key={index} style={{ marginTop: 5 }}>
                    <Chip
                      selected={item._id === selectedCategory}
                      onPress={() => setSelectedCategory(item._id)}
                      textStyle={{ lineHeight: 40 }}
                    >
                      {item.name}
                    </Chip>
                  </View>
                ))}
              </View>
              {selectedCategory && (
                <View style={{ marginTop: 10 }}>
                  <Text>Danh mục con</Text>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 5,
                      marginTop: 5,
                    }}
                  >
                    {subCategory.map((item, index) => (
                      <Chip
                        key={index}
                        selected={selectedSubCategory[
                          selectedCategory
                        ]?.includes(item._id)}
                        onPress={() => handleSelectSubCategory(item._id)}
                        style={{ alignSelf: "flex-start" }}
                      >
                        {item.name}
                      </Chip>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
          {!isOwner && selectedChips.length !== 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text>Ghi chu</Text>
              <TextInput
                placeholder="Thêm mô tả ngắn cho người duyệt"
                mode="outlined"
                multiline
                value={suggestionNote}
                onChangeText={setSuggestionNote}
              />
            </View>
          )}
        </View>
        {selectedChips.length !== 0 &&
          isOwner &&
          selectedChips.includes("name") &&
          !selectedChips.includes("address") && (
            <View>
              <Button
                icon={"plus"}
                mode="outlined"
                style={{ alignSelf: "flex-start" }}
                onPress={() => uploadMedia()}
              >
                {assets.length > 0
                  ? `Thêm bằng chứng (${assets.length})`
                  : "Thêm bằng chứng"}
              </Button>
            </View>
          )}
      </ScrollView>
      <View style={{ marginVertical: 10 }}>
        <Button
          mode="contained"
          icon="file-document-edit-outline"
          onPress={() => handleSubmit()}
          disabled={loading || selectedChips.length === 0}
        >
          Lưu
        </Button>
      </View>
      <GetNewLocation
        coordinates={coordinates}
        setCoordinates={setCoordinates}
        setVisible={setVisible}
        visible={visible}
        pinLocation={pinLocation}
        setPinLocation={setPinLocation}
      />
    </View>
  );
}
