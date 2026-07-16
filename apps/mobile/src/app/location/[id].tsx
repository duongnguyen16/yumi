import LocationDetailScreen from "@/components/location/LocationDetailScreen";
import { getLocationById } from "@/service/locationService";
import {
  LocationReportReason,
  reportLocation,
} from "@/service/locationReportService";
import {
  PendingContributionImage,
  uploadContributionImage,
} from "@/service/contributePlaceService";
import { getAllProductsByLocation } from "@/service/product";
import { Stack, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useContext, useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Dialog,
  RadioButton,
  Snackbar,
  Text,
  TextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { userContext } from "@/contexts/userContext";

const REPORT_REASONS: Array<{
  label: string;
  value: LocationReportReason;
}> = [
  { label: "Sai thông tin", value: "INCORRECT_INFORMATION" },
  { label: "Spam", value: "SPAM" },
  { label: "Đã đóng cửa", value: "PERMANENTLY_CLOSED" },
  { label: "Chủ sở hữu sai", value: "WRONG_OWNER" },
  { label: "Khác", value: "OTHER" },
];

type SelectedReportImage = PendingContributionImage & {
  id: string;
};

const MAX_REPORT_IMAGES = 5;

async function uploadReportImages(images: SelectedReportImage[]) {
  const evidence = [];

  for (const image of images.slice(0, MAX_REPORT_IMAGES)) {
    const url = await uploadContributionImage(image);
    evidence.push({
      url,
      fileType: "IMAGE" as const,
      capturedAt: image.capturedAt,
    });
  }

  return evidence;
}

export default function LocationDetail() {
  const { id } = useLocalSearchParams();
  const [locationData, setLocationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [productData, setProductData] = useState(null);
  const [reportDialogVisible, setReportDialogVisible] = useState(false);
  const [reportReason, setReportReason] = useState<LocationReportReason>(
    "INCORRECT_INFORMATION",
  );
  const [reportDescription, setReportDescription] = useState("");
  const [reportImages, setReportImages] = useState<SelectedReportImage[]>([]);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const { user } = useContext(userContext);
  const location = locationData?.data;
  const fetchLocationData = async () => {
    if (!id) return;

    try {
      const response = await getLocationById(id as string);
      if (response.success) {
        setLocationData(response);
      } else {
        console.log("Error fetching location data:", response.message);
        setDialogVisible(true);
      }
    } catch (error) {
      console.log("Error fetching location data:", error);
      setDialogVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const refreshLocationData = async () => {
    try {
      const response = await getLocationById(id as string);
      if (response.success) {
        setLocationData(response);
      } else {
        console.log("Error refreshing location data:", response.message);
        setDialogVisible(true);
      }
    } catch (error) {
      console.log("Error refreshing location data:", error);
      setDialogVisible(true);
    }
  };

  const fetchProductData = async () => {
    try {
      const response = await getAllProductsByLocation(id as string);
      if (response.success) {
        setProductData(response.data);
      }
    } catch (error) {
      console.log("Error fetching product data:", error);
    }
  };

  useEffect(() => {
    fetchLocationData();
    fetchProductData();
  }, [id]);

  const handleSubmitReport = async () => {
    const locationId = id as string;
    const description = reportDescription.trim();

    if (description.length < 10 || description.length > 1000) {
      setNotice("MĂ´ táº£ bĂ¡o cĂ¡o cáº§n tá»« 10 Ä‘áº¿n 1000 kĂ½ tá»±.");
      return;
    }
    if (reportReason === "WRONG_OWNER" && reportImages.length === 0) {
      setNotice("Báo cáo chủ sở hữu sai cần ít nhất 1 ảnh bằng chứng.");
      return;
    }

    setReportSubmitting(true);
    try {
      const evidence = await uploadReportImages(reportImages);
      const response = await reportLocation(locationId, {
        reason: reportReason,
        description,
        evidence,
      });

      if (!response.success) {
        setNotice(response.message);
        return;
      }

      setReportDialogVisible(false);
      setReportReason("INCORRECT_INFORMATION");
      setReportDescription("");
      setReportImages([]);
      setNotice("ÄĂ£ gá»­i bĂ¡o cĂ¡o Ä‘á»‹a Ä‘iá»ƒm.");
    } catch (error) {
      console.log("Error submitting report:", error);
      setNotice("Không thể gửi báo cáo địa điểm lúc này.");
    } finally {
      setReportSubmitting(false);
    }
  };

  const handlePickReportImages = async () => {
    if (reportImages.length >= MAX_REPORT_IMAGES) {
      setNotice(`Tối đa ${MAX_REPORT_IMAGES} ảnh bằng chứng.`);
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      setNotice("Bạn cần cấp quyền thư viện ảnh để thêm bằng chứng.");
      return;
    }

    const remainingSlots = MAX_REPORT_IMAGES - reportImages.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.85,
    });

    if (result.canceled) {
      return;
    }

    const pickedImages = result.assets
      .slice(0, remainingSlots)
      .map((asset, index) => ({
        id: `${asset.uri}-${Date.now()}-${index}`,
        uri: asset.uri,
        fileName: asset.fileName ?? `report-${Date.now()}-${index}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
        fileSize: asset.fileSize ?? 1,
        capturedAt: new Date().toISOString(),
      }));

    setReportImages((current) =>
      [...current, ...pickedImages].slice(0, MAX_REPORT_IMAGES),
    );
  };

  const handleRemoveReportImage = (imageId: string) => {
    setReportImages((current) =>
      current.filter((image) => image.id !== imageId),
    );
  };

  const handleDismissReportDialog = () => {
    if (reportSubmitting) {
      return;
    }
    setReportDialogVisible(false);
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerTitle: location?.name || "Chi tiết vị trí",
          headerShown: true,
          headerRight: () => {
            if (location?.ownerId === user?._id) {
              return null;
            }
            return (
              <Button
                compact
                mode="outlined"
                icon="flag-outline"
                onPress={() => setReportDialogVisible(true)}
              >
                Report
              </Button>
            );
          },
        }}
      />
      <LocationDetailScreen
        data={locationData}
        productData={productData}
        onRefresh={refreshLocationData}
      />
      <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
        <Dialog.Title>Lá»—i</Dialog.Title>
        <Dialog.Content>
          <Text>
            {locationData?.message || "ÄĂ£ xáº£y ra lá»—i khi láº¥y dá»¯ liá»‡u vá»‹ trĂ­."}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setDialogVisible(false)}>ÄĂ³ng</Button>
        </Dialog.Actions>
      </Dialog>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 72 : 0}
        pointerEvents={reportDialogVisible ? "auto" : "none"}
        style={styles.keyboardAvoider}
      >
        <Dialog
          visible={reportDialogVisible}
          onDismiss={handleDismissReportDialog}
          style={styles.reportDialog}
        >
          <Dialog.Title>Report địa điểm</Dialog.Title>
          <Dialog.ScrollArea style={styles.reportScrollArea}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.reportContent}
            >
              <RadioButton.Group
                onValueChange={(value) =>
                  setReportReason(value as LocationReportReason)
                }
                value={reportReason}
              >
                {REPORT_REASONS.map((reason) => (
                  <RadioButton.Item
                    key={reason.value}
                    label={reason.label}
                    value={reason.value}
                    style={{ paddingHorizontal: 0 }}
                  />
                ))}
              </RadioButton.Group>
              <TextInput
                mode="outlined"
                label="Mô tả"
                value={reportDescription}
                onChangeText={setReportDescription}
                multiline
                numberOfLines={4}
                disabled={reportSubmitting}
              />
              <View style={styles.evidenceHeader}>
                <Text variant="labelLarge" style={styles.evidenceLabel}>
                  Ảnh bằng chứng ({reportImages.length}/{MAX_REPORT_IMAGES})
                </Text>
                <Button
                  mode="outlined"
                  compact
                  icon="image-plus"
                  onPress={handlePickReportImages}
                  disabled={
                    reportSubmitting || reportImages.length >= MAX_REPORT_IMAGES
                  }
                  style={styles.addEvidenceButton}
                >
                  Thêm ảnh
                </Button>
              </View>
              {reportImages.length ? (
                <View style={styles.evidenceGrid}>
                  {reportImages.map((image) => (
                    <View key={image.id} style={styles.evidenceTile}>
                      <Image
                        source={{ uri: image.uri }}
                        style={styles.evidenceImage}
                      />
                      <Pressable
                        onPress={() => handleRemoveReportImage(image.id)}
                        hitSlop={8}
                        style={styles.removeEvidenceButton}
                      >
                        <Text style={styles.removeEvidenceText}>×</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              onPress={handleDismissReportDialog}
              disabled={reportSubmitting}
            >
              Hủy
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmitReport}
              loading={reportSubmitting}
              disabled={reportSubmitting}
            >
              Gửi report
            </Button>
          </Dialog.Actions>
        </Dialog>
      </KeyboardAvoidingView>
      <Snackbar
        visible={Boolean(notice)}
        onDismiss={() => setNotice("")}
        duration={3000}
      >
        {notice}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoider: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
  },
  reportDialog: {
    maxHeight: "88%",
  },
  reportScrollArea: {
    maxHeight: 460,
    paddingHorizontal: 0,
  },
  reportContent: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  evidenceHeader: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  evidenceLabel: {
    flex: 1,
    color: "#403A34",
    fontWeight: "700",
  },
  addEvidenceButton: {
    borderRadius: 8,
  },
  evidenceGrid: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  evidenceTile: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#EFEAE3",
  },
  evidenceImage: {
    width: "100%",
    height: "100%",
  },
  removeEvidenceButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(29, 26, 22, 0.78)",
  },
  removeEvidenceText: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "700",
  },
});
