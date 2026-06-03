import { Stack } from "expo-router";
import "../../global.css";
import UserContextProvider from "@/contexts/userContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text } from "react-native-paper";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <UserContextProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </UserContextProvider>
    </SafeAreaProvider>
  );
}
