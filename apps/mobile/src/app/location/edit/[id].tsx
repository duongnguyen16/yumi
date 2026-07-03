import EditLocationScreen from "@/components/location/EditLocationScreen";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditLocation() {
  const { id, type } = useLocalSearchParams();
  console.log(id, type);
  const [selectedChip, setSelectedChip] = useState<string[]>([type as string]);
  const handleChipChange = (types: string) => {
    console.log("Selected Chip:", types);
    if (selectedChip.includes(types)) {
      setSelectedChip((prev) => prev.filter((item) => item !== types));
    } else {
      setSelectedChip((prev) => [...prev, types]);
    }
  };
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
      />
    </SafeAreaView>
  );
}
