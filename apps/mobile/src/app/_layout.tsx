import { ErrorBoundaryProps, Stack } from "expo-router";
import "../../global.css";
import UserContextProvider from "@/contexts/userContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text } from "react-native-paper";
import { View } from "react-native";
import { Button } from "@expo/ui";

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Có lỗi xảy ra</Text>
      <Text>{error.message}</Text>
      <Button label="Thử lại" onPress={retry} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <UserContextProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </UserContextProvider>
    </SafeAreaProvider>
  );
}
