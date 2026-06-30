import LocationDetailScreen from "@/components/location/LocationDetailScreen";
import Badge from "@/components/ui/Badge";
import { getLocationById } from "@/service/locationService";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Button, Dialog, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LocationDetail() {
  const { id } = useLocalSearchParams();
  const [locationData, setLocationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  console.log("locationDetail", id);
  useEffect(() => {
    const fetchLocationData = async () => {
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
    fetchLocationData();
  }, [id]);
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
          headerRight: () => (
            <Badge status={locationData?.location?.status || "CLOSED"} />
          ),
        }}
      />
      <LocationDetailScreen data={locationData} />
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
    </SafeAreaView>
  );
}
