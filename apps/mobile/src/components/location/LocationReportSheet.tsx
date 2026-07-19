import {
  type PendingContributionImage,
  uploadContributionImage,
} from "@/service/contributePlaceService";
import {
  reportLocation,
  type LocationReportReason,
} from "@/service/locationReportService";
import {
  getLocationReportReasons,
  validateLocationReport,
} from "./location-report";
import {
  AppText,
  BottomSheet,
  Button,
  IconButton,
  Inline,
  NoticeSnackbar,
  Stack,
  TextArea,
} from "@/ui/components";
import { radius, spacing } from "@/ui/tokens";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { Modal, Portal, RadioButton } from "react-native-paper";

type SelectedReportImage = PendingContributionImage & { id: string };

const maxReportImages = 5;

export function LocationReportSheet({
  locationId,
  hasOwner,
  visible,
  onDismiss,
}: {
  locationId: string;
  hasOwner: boolean;
  visible: boolean;
  onDismiss: () => void;
}) {
  const [reason, setReason] = useState<LocationReportReason>(
    "INCORRECT_INFORMATION",
  );
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<SelectedReportImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const dismiss = () => {
    if (!submitting) onDismiss();
  };

  const pickImages = async () => {
    if (images.length >= maxReportImages) {
      setNotice(`Tối đa ${maxReportImages} ảnh bằng chứng.`);
      return;
    }

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setNotice("Bạn cần cấp quyền thư viện ảnh để thêm bằng chứng.");
      return;
    }

    const remainingSlots = maxReportImages - images.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ["images"],
      quality: 0.85,
      selectionLimit: remainingSlots,
    });
    if (result.canceled) return;

    const pickedAt = new Date().toISOString();
    const newImages = result.assets.slice(0, remainingSlots).map((asset, index) => ({
      capturedAt: pickedAt,
      fileName: asset.fileName ?? `report-${Date.now()}-${index}.jpg`,
      fileSize: asset.fileSize ?? 1,
      id: `${asset.uri}-${Date.now()}-${index}`,
      mimeType: asset.mimeType ?? "image/jpeg",
      uri: asset.uri,
    }));
    setImages((current) => [...current, ...newImages].slice(0, maxReportImages));
  };

  const submit = async () => {
    const error = validateLocationReport({
      description,
      evidenceCount: images.length,
      reason,
    });
    if (error) {
      setNotice(error);
      return;
    }

    setSubmitting(true);
    try {
      const evidence = await Promise.all(
        images.map(async ({ id: _id, ...image }) => ({
          capturedAt: image.capturedAt,
          fileType: "IMAGE" as const,
          url: await uploadContributionImage(image),
        })),
      );
      const response = await reportLocation(locationId, {
        description: description.trim(),
        evidence,
        reason,
      });
      if (!response.success) {
        setNotice(response.message);
        return;
      }

      setReason("INCORRECT_INFORMATION");
      setDescription("");
      setImages([]);
      onDismiss();
      setNotice(response.message);
    } catch {
      setNotice("Không thể gửi báo cáo địa điểm lúc này.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Portal>
      <Modal dismissable={!submitting} onDismiss={dismiss} visible={visible}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ justifyContent: "flex-end" }}
        >
        <BottomSheet style={{ marginHorizontal: spacing[4], maxHeight: "88%" }}>
          <AppText variant="title2">Báo cáo địa điểm</AppText>
          <ScrollView
            contentContainerStyle={{ paddingBottom: spacing[3] }}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          >
            <Stack gap={spacing[3]}>
              <RadioButton.Group
                onValueChange={(value) =>
                  setReason(value as LocationReportReason)
                }
                value={reason}
              >
                {getLocationReportReasons(hasOwner).map((item) => (
                  <RadioButton.Item
                    key={item.value}
                    label={item.label}
                    value={item.value}
                  />
                ))}
              </RadioButton.Group>
              <TextArea
                disabled={submitting}
                label="Mô tả"
                maxLength={1000}
                onChangeText={setDescription}
                value={description}
              />
              <Inline style={{ justifyContent: "space-between" }}>
                <AppText variant="headline">
                  Ảnh bằng chứng ({images.length}/{maxReportImages})
                </AppText>
                <Button
                  disabled={submitting || images.length >= maxReportImages}
                  icon="image-plus"
                  label="Thêm ảnh"
                  onPress={() => void pickImages()}
                  size="small"
                  variant="secondary"
                />
              </Inline>
              {images.length ? (
                <Inline style={{ flexWrap: "wrap", gap: spacing[2] }}>
                  {images.map((image) => (
                    <View key={image.id} style={{ height: 72, width: 72 }}>
                      <Image
                        contentFit="cover"
                        source={{ uri: image.uri }}
                        style={{
                          borderRadius: radius.medium,
                          height: 72,
                          width: 72,
                        }}
                      />
                      <Pressable
                        accessibilityLabel="Xóa ảnh bằng chứng"
                        disabled={submitting}
                        onPress={() =>
                          setImages((current) =>
                            current.filter((item) => item.id !== image.id),
                          )
                        }
                        style={{ position: "absolute", right: -6, top: -6 }}
                      >
                        <IconButton icon="close" label="Xóa ảnh bằng chứng" />
                      </Pressable>
                    </View>
                  ))}
                </Inline>
              ) : null}
            </Stack>
          </ScrollView>
          <Inline style={{ justifyContent: "flex-end" }}>
            <Button
              disabled={submitting}
              label="Hủy"
              onPress={dismiss}
              variant="tertiary"
            />
            <Button
              disabled={submitting}
              icon="send"
              label="Gửi báo cáo"
              loading={submitting}
              onPress={() => void submit()}
              variant="destructive"
            />
          </Inline>
        </BottomSheet>
        </KeyboardAvoidingView>
      </Modal>
      <NoticeSnackbar message={notice} onDismiss={() => setNotice("")} />
    </Portal>
  );
}
