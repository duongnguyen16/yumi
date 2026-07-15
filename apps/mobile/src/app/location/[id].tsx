import LocationDetailScreen from "@/components/location/LocationDetailScreen";
import { getLocationById } from "@/service/locationService";
import {
  LocationReportReason,
  reportLocation,
} from "@/service/locationReportService";
import { getAllProductsByLocation } from "@/service/product";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import { View } from "react-native";
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
  { label: "Khác", value: "OTHER" },
];

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
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const { user } = useContext(userContext);
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
      setNotice("Mô tả báo cáo cần từ 10 đến 1000 ký tự.");
      return;
    }

    setReportSubmitting(true);
    try {
      const response = await reportLocation(locationId, {
        reason: reportReason,
        description,
      });

      if (!response.success) {
        setNotice(response.message);
        return;
      }

      setReportDialogVisible(false);
      setReportReason("INCORRECT_INFORMATION");
      setReportDescription("");
      setNotice("Đã gửi báo cáo địa điểm.");
    } finally {
      setReportSubmitting(false);
    }
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
          headerTitle: locationData?.location?.name || "Chi tiết vị trí",
          headerShown: true,
          headerRight: () => {
            if (locationData?.ownerId === user?._id) {
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
        <Dialog.Title>Lỗi</Dialog.Title>
        <Dialog.Content>
          <Text>
            {locationData?.message || "Đã xảy ra lỗi khi lấy dữ liệu vị trí."}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setDialogVisible(false)}>Đóng</Button>
        </Dialog.Actions>
      </Dialog>
      <Dialog
        visible={reportDialogVisible}
        onDismiss={() => setReportDialogVisible(false)}
      >
        <Dialog.Title>Report địa điểm</Dialog.Title>
        <Dialog.Content>
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
          <View style={{ marginTop: 8 }}>
            <TextInput
              mode="outlined"
              label="Mô tả"
              value={reportDescription}
              onChangeText={setReportDescription}
              multiline
              numberOfLines={4}
              disabled={reportSubmitting}
            />
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            onPress={() => setReportDialogVisible(false)}
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
