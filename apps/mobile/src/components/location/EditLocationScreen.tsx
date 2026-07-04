import { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  ScrollView,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Chip,
  Icon,
  Text,
  TextInput,
  Searchbar,
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { getAllCategories, getSubCategory } from "@/service/categoryService";
import { TimePickerModal } from "react-native-paper-dates";
import CustomMap from "./ui/CustomMap";
import GetNewLocation from "./modals/GetNewLocation";
import { updateLocation } from "@/service/locationService";

export default function EditLocationScreen({
  selectedChip,
  setSelectedChip,
  data,
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [openHours, setOpenHours] = useState({});
  const [closeHours, setCloseHours] = useState({});
  const [openingHours, setOpeningHours] = useState(null);
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
  const [pickerMode, setPickerMode] = useState("start");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async () => {
    setLoading(true);
    if (selectedChip.includes("name")) {
      if (!assets || assets.length === 0) {
        Alert.alert("Vui lòng thêm bằng chứng");
        setLoading(false);
        return;
      }
    }
    if (selectedChip.includes("address")) {
      if (!coordinates) {
        Alert.alert("Vui lòng xác thực lại vị trí");
        setLoading(false);
        return;
      }
      if (!assets) {
        Alert.alert("Vui lòng thêm bằng chứng");
        setLoading(false);
        return;
      }
    }
    if (!selectedCategory) return;
    const submitData = {
      name: selectedChip.includes("name") ? name : undefined,
      address: selectedChip.includes("address") ? address : undefined,
      openingHours: selectedChip.includes("openingHours")
        ? openingHours
        : undefined,
      description: selectedChip.includes("description")
        ? description
        : undefined,
      phone: selectedChip.includes("phone") ? phone : undefined,
      categoryId: selectedChip.includes("category")
        ? selectedCategory
        : undefined,
      subCategoryIds: selectedChip.includes("category")
        ? selectedSubCategory[selectedCategory] || []
        : undefined,
      coordinates: selectedChip.includes("coordinates")
        ? coordinates
        : undefined,
    };
    const formData = new FormData();
    formData.append("data", JSON.stringify(submitData));
    assets.forEach((asset) => {
      formData.append("media", {
        uri: asset.uri,
        type:
          asset.mimeType ||
          (asset.type === "video" ? "video/mp4" : "image/jpeg"),
        name:
          asset.fileName ||
          `media-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`,
      } as any);
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

  const handleClockConfirm = ({ hours, minutes }) => {
    if (pickerMode === "start") {
      setOpenHours({ hours, minutes });
      setPickerMode("end");
    }
    if (pickerMode === "end") {
      setCloseHours({ hours, minutes });
      setPickerMode("start");
      setClockVisible(false);
      setOpeningHours(
        `${openHours.hours}:${openHours.minutes}-${hours}:${minutes}`,
      );
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
      setCoordinates(data.geo?.coordinates || null);
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
          <Chip
            onPress={() => setSelectedChip("name")}
            selected={selectedChip.includes("name")}
          >
            Tên địa điểm
          </Chip>

          <Chip
            onPress={() => setSelectedChip("address")}
            selected={selectedChip.includes("address")}
          >
            Địa chỉ
          </Chip>

          <Chip
            onPress={() => setSelectedChip("openingHours")}
            selected={selectedChip.includes("openingHours")}
          >
            Giờ mở cửa
          </Chip>

          <Chip
            onPress={() => setSelectedChip("description")}
            selected={selectedChip.includes("description")}
          >
            Mô tả
          </Chip>
          <Chip
            onPress={() => setSelectedChip("phone")}
            selected={selectedChip.includes("phone")}
          >
            Số điện thoại
          </Chip>
          <Chip
            onPress={() => setSelectedChip("category")}
            selected={selectedChip.includes("category")}
          >
            Danh mục
          </Chip>
        </View>
      </ScrollView>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={{ marginTop: 12 }}>
          {selectedChip.includes("name") && (
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

          {selectedChip.includes("address") && (
            <View style={{ marginBottom: 12 }}>
              <Text>Địa chỉ</Text>
              <TextInput
                placeholder="Hãy nhập địa chỉ"
                mode="outlined"
                value={address}
                style={{ marginBottom: 10 }}
                onChangeText={setAddress}
              />
              {coordinates && (
                <CustomMap
                  coordinates={coordinates}
                  setCoordinates={setCoordinates}
                  previewMode={true}
                />
              )}
              {selectedChip.length !== 0 &&
                selectedChip.includes("address") && (
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
            </View>
          )}

          {selectedChip.includes("openingHours") && (
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

          {selectedChip.includes("description") && (
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
          {selectedChip.includes("phone") && (
            <View style={{ marginBottom: 12 }}>
              <Text>Số điện thoại</Text>
              <TextInput
                placeholder="Hãy nhập số điện thoại"
                mode="outlined"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          )}
          {selectedChip.includes("category") && (
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
        </View>
        {selectedChip.length !== 0 &&
          selectedChip.includes("name") &&
          !selectedChip.includes("address") && (
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
          disabled={loading}
        >
          Lưu
        </Button>
      </View>
      <GetNewLocation
        coordinates={coordinates}
        setCoordinates={setCoordinates}
        setVisible={setVisible}
        visible={visible}
      />
    </View>
  );
}
