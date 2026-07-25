import { ErrorBoundaryProps, Stack } from "expo-router";
import { DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { GoogleSansFlex_400Regular, GoogleSansFlex_500Medium, GoogleSansFlex_600SemiBold, GoogleSansFlex_700Bold, GoogleSansFlex_800ExtraBold, useFonts } from "@expo-google-fonts/google-sans-flex";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import "../../global.css";
import UserContextProvider from "@/contexts/userContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Button, configureFonts, MD3LightTheme, PaperProvider, Text } from "react-native-paper";
import { LogBox, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Location from "expo-location";
import { useEffect } from "react";
import LocationContextProvider from "@/contexts/locationContext";
import { colors, fontFamily } from "@/ui/tokens";

void SplashScreen.preventAutoHideAsync();

if (process.env.EXPO_PUBLIC_VERBOSE === "0") {
  LogBox.ignoreAllLogs(true);
}

const appColors = {
  background: colors.surfaceApp,
  surface: colors.surfaceBase,
  surfaceVariant: colors.surfaceElevated,
  primary: colors.accentPrimary,
  text: colors.textPrimary,
  muted: colors.textSecondary,
  outline: colors.borderSubtle,
  success: colors.accentGreen,
  successContainer: colors.surfaceControl,
};

const paperTheme = {
  ...MD3LightTheme,
  dark: false,
  roundness: 28,
  fonts: configureFonts({ config: { fontFamily: fontFamily.regular } }),
  colors: {
    ...MD3LightTheme.colors,
    primary: appColors.primary,
    onPrimary: colors.textInverse,
    primaryContainer: colors.surfaceControl,
    onPrimaryContainer: colors.accentPrimary,
    secondary: colors.textSecondary,
    onSecondary: colors.textInverse,
    secondaryContainer: appColors.surfaceVariant,
    onSecondaryContainer: appColors.text,
    tertiary: appColors.success,
    onTertiary: colors.textInverse,
    tertiaryContainer: appColors.successContainer,
    onTertiaryContainer: colors.textPrimary,
    background: appColors.background,
    onBackground: appColors.text,
    surface: appColors.surface,
    onSurface: appColors.text,
    surfaceVariant: appColors.surfaceVariant,
    onSurfaceVariant: appColors.muted,
    outline: appColors.outline,
    outlineVariant: colors.separator,
    error: colors.accentRed,
    onError: colors.textInverse,
    errorContainer: colors.surfaceControl,
    onErrorContainer: colors.accentRed,
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level0: appColors.background,
      level1: appColors.surface,
      level2: colors.surfaceElevated,
      level3: colors.surfaceElevated,
      level4: colors.surfaceElevated,
      level5: colors.surfaceElevated,
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
  const [fontsLoaded] = useFonts({
    GoogleSansFlex_400Regular,
    GoogleSansFlex_500Medium,
    GoogleSansFlex_600SemiBold,
    GoogleSansFlex_700Bold,
    GoogleSansFlex_800ExtraBold,
  });

  const requestLocationPermission = async () => {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status === "undetermined") {
      await Location.requestForegroundPermissionsAsync();
    }
  };

  useEffect(() => {
    if (fontsLoaded) {
      requestLocationPermission();
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
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
    </GestureHandlerRootView>
  );
}
