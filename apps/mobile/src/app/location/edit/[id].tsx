import EditLocationScreen from "@/components/location/EditLocationScreen";
import { getLocationById } from "@/service/locationService";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditLocation() {
  const { id, type } = useLocalSearchParams();
  const [selectedChip, setSelectedChip] = useState<string[]>([type as string]);
  const [locationData, setLocationData] = useState(null);
  const handleChipChange = (types: string) => {
    if (selectedChip.includes(types)) {
      setSelectedChip((prev) => prev.filter((item) => item !== types));
    } else {
      setSelectedChip((prev) => [...prev, types]);
    }
  };
  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        const response = await getLocationById(id as string);
        if (response?.success) {
          setLocationData(response?.data);
        }
      } catch (error) {
        console.error("Error fetching location data:", error);
      }
    };
    fetchLocationData();
  }, [id]);
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Chỉnh sửa thông tin",
          headerShown: true,
          headerShadowVisible: false,
        }}
      />
      <EditLocationScreen
        selectedChip={selectedChip}
        setSelectedChip={handleChipChange}
        data={locationData}
      />
    </SafeAreaView>
  );
}
