import { ErrorBoundaryProps, Stack } from "expo-router";
import { DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import "../../global.css";
import UserContextProvider from "@/contexts/userContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Button, MD3LightTheme, PaperProvider, Text } from "react-native-paper";
import { View } from "react-native";
import * as Location from "expo-location";
import { useEffect } from "react";
import LocationContextProvider from "@/contexts/locationContext";

const appColors = {
  background: "#f7f5ef",
  surface: "#fffdf9",
  surfaceVariant: "#f1eee7",
  primary: "#ff4b22",
  text: "#25221e",
  muted: "#7a736b",
  outline: "#e5ddd4",
  success: "#16833a",
  successContainer: "#d8f2df",
};

const paperTheme = {
  ...MD3LightTheme,
  dark: false,
  roundness: 4,
  colors: {
    ...MD3LightTheme.colors,
    primary: appColors.primary,
    onPrimary: "#ffffff",
    primaryContainer: "#fee4d9",
    onPrimaryContainer: "#8f1e0b",
    secondary: "#5f513f",
    onSecondary: "#ffffff",
    secondaryContainer: appColors.surfaceVariant,
    onSecondaryContainer: appColors.text,
    tertiary: appColors.success,
    onTertiary: "#ffffff",
    tertiaryContainer: appColors.successContainer,
    onTertiaryContainer: "#0b4f25",
    background: appColors.background,
    onBackground: appColors.text,
    surface: appColors.surface,
    onSurface: appColors.text,
    surfaceVariant: appColors.surfaceVariant,
    onSurfaceVariant: appColors.muted,
    outline: appColors.outline,
    outlineVariant: "#eee8df",
    error: "#dc2626",
    onError: "#ffffff",
    errorContainer: "#fee2e2",
    onErrorContainer: "#7f1d1d",
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level0: appColors.background,
      level1: appColors.surface,
      level2: "#fff9f4",
      level3: "#fff6ef",
      level4: "#fff3eb",
      level5: "#ffeee4",
    },
  },
};

const navigationTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: appColors.primary,
    background: appColors.background,
    card: appColors.surface,
    text: appColors.text,
    border: appColors.outline,
    notification: appColors.primary,
  },
};

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: appColors.background,
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
      }}
    >
      <Text>Có lỗi xảy ra</Text>
      <Text>{error.message}</Text>
      <Button mode="contained" onPress={retry}>
        Thử lại
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
      <ThemeProvider value={navigationTheme}>
        <PaperProvider theme={paperTheme}>
          <UserContextProvider>
            <LocationContextProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: appColors.background },
                }}
              />
            </LocationContextProvider>
          </UserContextProvider>
        </PaperProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
