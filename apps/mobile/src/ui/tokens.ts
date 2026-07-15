import type { TextStyle, ViewStyle } from "react-native";

export const colors = {
  canvasMap: "#DDE8F6",
  canvasMapRoad: "#FFFFFF",
  canvasMapRoadSecondary: "#C6D5E7",
  canvasMapWater: "#86B7F3",
  surfaceApp: "#F2F2F7",
  surfaceBase: "#FFFFFF",
  surfaceRaised: "#FFFFFF",
  surfaceElevated: "#F2F2F7",
  surfaceControl: "#FFF0E6",
  surfaceControlPressed: "#FFE0CC",
  surfaceField: "#E9E9EE",
  surfaceMedia: "#E5E5EA",
  borderSubtle: "#E1E1E6",
  borderStrong: "#C7C7CC",
  separator: "#E5E5EA",
  textPrimary: "#1C1C1E",
  textSecondary: "#636366",
  textTertiary: "#8E8E93",
  textInverse: "#FFFFFF",
  accentPrimary: "#FF6B00",
  accentPrimaryPressed: "#E65F00",
  accentGreen: "#34C759",
  accentOrange: "#FF9500",
  accentRed: "#FF3B30",
} as const;

export const spacing = [4, 8, 12, 16, 20, 24, 32, 40, 48] as const;

export const radius = {
  small: 12,
  medium: 20,
  large: 28,
  xlarge: 34,
  sheet: 38,
  pill: 999,
} as const;

export const typography = {
  largeTitle: { fontFamily: "Inter_700Bold", fontSize: 32, lineHeight: 38 },
  title1: { fontFamily: "Inter_700Bold", fontSize: 28, lineHeight: 34 },
  title2: { fontFamily: "Inter_700Bold", fontSize: 22, lineHeight: 28 },
  headline: { fontFamily: "Inter_600SemiBold", fontSize: 17, lineHeight: 22 },
  body: { fontFamily: "Inter_400Regular", fontSize: 17, lineHeight: 23 },
  subhead: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  footnote: { fontFamily: "Inter_500Medium", fontSize: 12, lineHeight: 16 },
} as const satisfies Record<string, TextStyle>;

export const elevation = {
  floating: "0 8px 24px rgba(0, 0, 0, 0.10), 0 2px 6px rgba(0, 0, 0, 0.06)",
  sheet: "0 -10px 30px rgba(0, 0, 0, 0.08)",
  marker: "0 5px 10px rgba(0, 0, 0, 0.16)",
} as const;

export const motion = {
  fast: 160,
  standard: 240,
  gentle: 360,
} as const;

export const continuous: Pick<ViewStyle, "borderCurve"> = {
  borderCurve: "continuous",
};
