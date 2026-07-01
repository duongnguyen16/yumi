import { ErrorBoundaryProps, Stack } from "expo-router";
import "../../global.css";
import UserContextProvider from "@/contexts/userContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Button, PaperProvider, Text } from "react-native-paper";
import { View } from "react-native";
import * as Location from "expo-location";
import { useEffect } from "react";
import LocationContextProvider from "@/contexts/locationContext";

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 12 }}>
      <Text>Co loi xay ra</Text>
      <Text>{error.message}</Text>
      <Button mode="contained" onPress={retry}>
        Thu lai
      </Button>
    </View>
  );
}

export default function RootLayout() {
  const requestLocationPermission = async () => {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status === "undetermined") {
      await Location.requestForegroundPermissionsAsync();
    }
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={{ dark: false }}>
        <UserContextProvider>
          <LocationContextProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </LocationContextProvider>
        </UserContextProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
