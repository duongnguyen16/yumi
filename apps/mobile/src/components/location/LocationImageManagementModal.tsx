import {
  canEditImageSelection,
  canSubmitImageUpload,
  getRemainingImageSlots,
  MAX_LOCATION_IMAGE_UPLOAD,
} from "./location-image-management";
import {
  addLocationImages,
  setLocationCoverImage,
} from "@/service/locationService";
import { toAbsoluteUrl } from "@/service/url";
import {
  AppText,
  BottomSheet,
  Button,
  Inline,
  MediaPicker,
  NoticeSnackbar,
  Stack,
} from "@/ui/components";
import { colors, radius, spacing } from "@/ui/tokens";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { Modal, Portal } from "react-native-paper";

type LocationImage = { url?: string; isCover?: boolean };
type SelectedImage = ImagePicker.ImagePickerAsset & { id: string };

export function LocationImageManagementModal({
  visible,
  locationId,
  locationName,
  imageUrls,
  onDismiss,
  onChanged,
}: {
  visible: boolean;
  locationId?: string;
  locationName?: string;
  imageUrls: LocationImage[];
  onDismiss: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const dismiss = () => {
    if (!saving) onDismiss();
  };

  const pickImages = async () => {
    if (saving) return;

    const remainingSlots = getRemainingImageSlots(selectedImages.length);
    if (!remainingSlots) {
      setNotice(`Mỗi lần chỉ được tải lên tối đa ${MAX_LOCATION_IMAGE_UPLOAD} ảnh.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setNotice("Bạn cần cấp quyền thư viện ảnh để thêm ảnh địa điểm.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ["images"],
      quality: 0.8,
      selectionLimit: remainingSlots,
    });
    if (result.canceled) return;

    const selectedAt = Date.now();
    const addedImages = result.assets.slice(0, remainingSlots).map((asset, index) => ({
      ...asset,
      id: asset.assetId ?? `${asset.uri}-${selectedAt}-${index}`,
    }));
    setSelectedImages((current) =>
      [...current, ...addedImages].slice(0, MAX_LOCATION_IMAGE_UPLOAD),
    );
  };

  const uploadImages = async () => {
    if (!locationId || !canSubmitImageUpload({ selectedCount: selectedImages.length, saving })) {
      if (!locationId) setNotice("Không tìm thấy địa điểm.");
      return;
    }

    const formData = new FormData();
    selectedImages.forEach((asset, index) => {
      formData.append(
        "images",
        {
          uri: asset.uri,
          type: asset.mimeType ?? "image/jpeg",
          name: asset.fileName ?? `location-${Date.now()}-${index}.jpg`,
        } as unknown as Blob,
      );
    });

    setSaving(true);
    try {
      const response = await addLocationImages(formData, locationId);
      if (!response?.success) {
        setNotice(response?.message || "Không thể tải ảnh lên.");
        return;
      }

      setSelectedImages([]);
      await onChanged();
      setNotice(response?.message || "Đã tải ảnh lên.");
    } catch {
      setNotice("Không thể tải ảnh lên lúc này.");
    } finally {
      setSaving(false);
    }
  };

  const selectCover = async (imageUrl?: string) => {
    if (saving || !locationId || !imageUrl) return;

    setSaving(true);
    try {
      const response = await setLocationCoverImage(locationId, imageUrl);
      if (!response?.success) {
        setNotice(response?.message || "Không thể đổi ảnh bìa.");
        return;
      }

      await onChanged();
      setNotice(response?.message || "Đã đặt ảnh bìa.");
    } catch {
      setNotice("Không thể đổi ảnh bìa lúc này.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <Modal dismissable={!saving} onDismiss={dismiss} visible={visible}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ justifyContent: "flex-end" }}
        >
          <BottomSheet style={{ marginHorizontal: spacing[4], maxHeight: "88%" }}>
            <Inline style={{ alignItems: "flex-start", justifyContent: "space-between" }}>
              <Stack gap={spacing[1]} style={{ flex: 1 }}>
                <AppText variant="title2">Quản lý hình ảnh</AppText>
                {locationName ? (
                  <AppText style={{ color: colors.textSecondary }} variant="caption">
                    {locationName}
                  </AppText>
                ) : null}
              </Stack>
              <Button
                disabled={saving}
                label="Đóng"
                onPress={dismiss}
                size="small"
                variant="tertiary"
              />
            </Inline>
            <ScrollView
              contentContainerStyle={{ gap: spacing[3], paddingBottom: spacing[3] }}
              keyboardShouldPersistTaps="handled"
            >
              <Stack gap={spacing[2]}>
                <AppText variant="headline">Ảnh hiện có</AppText>
                {imageUrls.length ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
                    {imageUrls.map((image, index) => (
                      <View key={`${image.url ?? "image"}-${index}`} style={{ width: "47%" }}>
                        <Image
                          alt={`Ảnh ${index + 1} của ${locationName ?? "địa điểm"}`}
                          contentFit="cover"
                          source={{ uri: toAbsoluteUrl(image.url) }}
                          style={{
                            backgroundColor: colors.surfaceMedia,
                            borderRadius: radius.medium,
                            height: 112,
                            width: "100%",
                          }}
                        />
                        {image.isCover ? (
                          <AppText style={{ color: colors.accentPrimary }} variant="caption">
                            Ảnh bìa
                          </AppText>
                        ) : (
                          <Button
                            disabled={saving || !image.url}
                            label="Đặt làm ảnh bìa"
                            onPress={() => void selectCover(image.url)}
                            size="small"
                            variant="secondary"
                            width="full"
                          />
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <AppText style={{ color: colors.textSecondary }} variant="subhead">
                    Chưa có ảnh công khai.
                  </AppText>
                )}
              </Stack>
              <MediaPicker
                addLabel="Chọn ảnh"
                disabled={!canEditImageSelection({ saving })}
                items={selectedImages.map((image) => ({
                  id: image.id,
                  metadata: image.mimeType,
                  name: image.fileName ?? "Ảnh địa điểm",
                  uri: image.uri,
                }))}
                maxCount={MAX_LOCATION_IMAGE_UPLOAD}
                onAdd={() => void pickImages()}
                onRemove={(id) =>
                  !saving &&
                  setSelectedImages((current) =>
                    current.filter((image) => image.id !== id),
                  )
                }
                supportingText="Chọn tối đa 5 ảnh JPG hoặc PNG cho mỗi lần tải lên."
                title="Ảnh mới"
              />
            </ScrollView>
            <Inline style={{ justifyContent: "flex-end" }}>
              <Button
                disabled={saving}
                label="Hủy"
                onPress={dismiss}
                variant="tertiary"
              />
              <Button
                disabled={
                  !locationId ||
                  !canSubmitImageUpload({
                    selectedCount: selectedImages.length,
                    saving,
                  })
                }
                icon="upload"
                label="Tải ảnh lên"
                loading={saving}
                onPress={() => void uploadImages()}
              />
            </Inline>
          </BottomSheet>
        </KeyboardAvoidingView>
      </Modal>
      <NoticeSnackbar message={notice} onDismiss={() => setNotice("")} />
    </Portal>
  );
}
