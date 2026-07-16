import LocationBasicFields from "@/components/location-form/location-basic-fields";
import LocationCategoryFields from "@/components/location-form/location-category-fields";
import LocationContactFields from "@/components/location-form/location-contact-fields";
import LocationScheduleFields from "@/components/location-form/location-schedule-fields";
import { type EditField } from "@/components/location-form/edit-location-model";
import {
  useEditLocationForm,
  type EditableLocation,
} from "@/components/location-form/use-edit-location-form";
import {
  AppText,
  Button,
  Chip,
  FormSection,
  MediaPicker,
  PageContent,
  Stack,
  TextArea,
  TextField,
} from "@/ui/components";
import { colors, spacing } from "@/ui/tokens";
import { useState } from "react";
import { ScrollView } from "react-native";
import { TimePickerModal } from "react-native-paper-dates";
import GetNewLocation from "./modals/GetNewLocation";
import CustomMap from "./ui/CustomMap";

type TimeValue = { hours: number; minutes: number };

const labels: Record<EditField, string> = {
  name: "Tên địa điểm",
  address: "Vị trí",
  openingHours: "Giờ mở cửa",
  description: "Mô tả",
  phone: "Số điện thoại",
  flag: "Trạng thái",
  category: "Danh mục",
};

const formatTime = ({ hours, minutes }: TimeValue) =>
  `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

export default function EditLocationScreen({
  selectedChip,
  setSelectedChip,
  data,
}: {
  selectedChip: string[];
  setSelectedChip: (field: string) => void;
  data: EditableLocation;
}) {
  const form = useEditLocationForm({ selectedChip, data });
  const [pickerMode, setPickerMode] = useState<"start" | "end">("start");
  const [openTime, setOpenTime] = useState<TimeValue | null>(null);
  const handleClockConfirm = (value: TimeValue) => {
    if (pickerMode === "start") {
      setOpenTime(value);
      setPickerMode("end");
      return;
    }
    form.setOpeningHours(
      `${formatTime(openTime ?? { hours: 7, minutes: 0 })}-${formatTime(value)}`,
    );
    setPickerMode("start");
    form.setClockVisible(false);
  };

  return (
    <PageContent>
      <Stack gap={spacing[2]}>
        <AppText variant="title1">Chỉnh sửa địa điểm</AppText>
        <AppText style={{ color: colors.textSecondary }} variant="subhead">
          Chọn các nhóm thông tin cần cập nhật. Thay đổi của người dùng không
          phải chủ sở hữu sẽ được gửi duyệt.
        </AppText>
      </Stack>

      <ScrollView
        contentContainerStyle={{ gap: spacing[2] }}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {form.selectedFields.map((field) => (
          <Chip
            key={field}
            label={labels[field]}
            onPress={() => setSelectedChip(field)}
            selected
          />
        ))}
        {(
          [
            "name",
            "address",
            "openingHours",
            "description",
            "phone",
            "flag",
            "category",
          ] as EditField[]
        )
          .filter(
            (field) =>
              !form.selectedFields.includes(field) &&
              (form.isOwner ||
                ["address", "openingHours", "phone", "flag"].includes(field)),
          )
          .map((field) => (
            <Chip
              key={field}
              label={labels[field]}
              onPress={() => setSelectedChip(field)}
            />
          ))}
      </ScrollView>

      {form.selectedFields.includes("name") ||
      form.selectedFields.includes("description") ? (
        <LocationBasicFields
          description={form.description}
          name={form.name}
          onDescriptionChange={form.setDescription}
          onNameChange={form.setName}
          nameEditable={form.selectedFields.includes("name")}
          showDescription={form.selectedFields.includes("description")}
        />
      ) : null}

      {form.selectedFields.includes("address") ? (
        <FormSection title="Vị trí">
          <TextField
            editable={form.isOwner}
            label="Địa chỉ"
            onChangeText={form.setAddress}
            value={form.address}
          />
          {form.coordinates ? (
            <CustomMap
              coordinates={form.coordinates}
              pinLocation={form.pinLocation}
              previewMode
              setCoordinates={form.setCoordinates}
              setPinLocation={form.setPinLocation}
            />
          ) : null}
          <Button
            icon="map-marker-outline"
            label={form.isOwner ? "Lấy vị trí mới" : "Kéo pin vị trí"}
            onPress={() => form.setVisible(true)}
            variant="secondary"
            width="full"
          />
        </FormSection>
      ) : null}

      {form.selectedFields.includes("openingHours") ? (
        <LocationScheduleFields
          onOpenPicker={() => form.setClockVisible(true)}
          openingHours={form.openingHours}
        />
      ) : null}

      {form.selectedFields.includes("phone") ? (
        <LocationContactFields
          canVerify={form.isOwner}
          onOtpChange={form.setOtp}
          onPhoneChange={form.setPhone}
          onSendOtp={form.sendOtp}
          onVerifyOtp={form.verifyOtp}
          otp={form.otp}
          otpSent={form.otpSent}
          otpVerified={form.otpVerified}
          phone={form.phone}
        />
      ) : null}

      {form.selectedFields.includes("flag") && !form.isOwner ? (
        <FormSection title="Trạng thái địa điểm">
          <Stack>
            {[
              { value: "PERMANENTLY_CLOSED", label: "Đã đóng cửa" },
              { value: "DUPLICATE", label: "Trùng lặp" },
              { value: "NON_EXISTENT", label: "Không tồn tại" },
            ].map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                onPress={() =>
                  form.setFlagValue(option.value as typeof form.flagValue)
                }
                selected={form.flagValue === option.value}
              />
            ))}
          </Stack>
        </FormSection>
      ) : null}

      {form.selectedFields.includes("category") ? (
        <LocationCategoryFields
          categories={form.categories}
          onCategoryChange={form.setSelectedCategory}
          onSearchChange={form.setSearchQuery}
          onToggleSubCategory={form.toggleSubCategory}
          searchQuery={form.searchQuery}
          selectedCategoryId={form.selectedCategory}
          selectedSubCategoryIds={
            form.selectedSubCategories[form.selectedCategory] || []
          }
          subCategories={form.subCategories}
        />
      ) : null}

      {!form.isOwner && form.selectedFields.length > 0 ? (
        <FormSection title="Ghi chú">
          <TextArea
            label="Ghi chú cho người duyệt"
            onChangeText={form.setSuggestionNote}
            value={form.suggestionNote}
          />
        </FormSection>
      ) : null}

      {form.isOwner &&
      (form.selectedFields.includes("name") ||
        form.selectedFields.includes("address")) ? (
        <MediaPicker
          addLabel="Thêm bằng chứng"
          items={form.assets.map((asset) => ({
            id: asset.assetId || asset.uri,
            name: asset.fileName || "Bằng chứng",
            uri: asset.uri,
          }))}
          maxCount={10}
          onAdd={form.pickMedia}
          onRemove={(id) =>
            form.setAssets((current) =>
              current.filter((asset) => (asset.assetId || asset.uri) !== id),
            )
          }
          supportingText="Ảnh hoặc video chứng minh thay đổi."
          title="Bằng chứng"
        />
      ) : null}

      <Button
        disabled={form.loading || form.selectedFields.length === 0}
        icon="content-save-outline"
        label={form.isOwner ? "Lưu thay đổi" : "Gửi đề xuất"}
        loading={form.loading}
        onPress={form.submit}
        width="full"
      />

      <TimePickerModal
        cancelLabel="Hủy"
        confirmLabel={pickerMode === "start" ? "Tiếp theo" : "Xác nhận"}
        hours={7}
        label={pickerMode === "start" ? "Chọn giờ mở cửa" : "Chọn giờ đóng cửa"}
        locale="en"
        minutes={0}
        onConfirm={handleClockConfirm}
        onDismiss={() => form.setClockVisible(false)}
        use24HourClock
        visible={form.clockVisible}
      />
      <GetNewLocation
        coordinates={form.coordinates}
        pinLocation={form.pinLocation}
        setCoordinates={form.setCoordinates}
        setPinLocation={form.setPinLocation}
        setVisible={form.setVisible}
        visible={form.visible}
      />
    </PageContent>
  );
}
