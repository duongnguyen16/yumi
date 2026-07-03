import EditLocationScreen from "@/components/location/EditLocationScreen";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditLocation() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <Stack.Screen
        options={{ title: "Chỉnh sửa thông tin", headerShown: true }}
      />
      <EditLocationScreen />
    </SafeAreaView>
  );
}
