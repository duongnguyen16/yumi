import type { TextStyle, ViewStyle } from "react-native";

export const colors = {
  canvasMap: "#EDE9DE",
  canvasMapRoad: "#FAF9F5",
  canvasMapRoadSecondary: "#DAD9D4",
  canvasMapWater: "#DBD3F0",
  surfaceApp: "#FAF9F5",
  surfaceBase: "#F5F4EF",
  surfaceRaised: "#FFFFFF",
  surfaceElevated: "#E9E6DC",
  surfaceControl: "#EDE9DE",
  surfaceControlPressed: "#E9E6DC",
  surfaceField: "#E9E6DC",
  surfaceMedia: "#EDE9DE",
  borderSubtle: "#DAD9D4",
  borderStrong: "#B4B2A7",
  separator: "#DAD9D4",
  textPrimary: "#3D3929",
  textSecondary: "#6E6D68",
  textTertiary: "#B4B2A7",
  textInverse: "#FFFFFF",
  accentPrimary: "#C96442",
  accentPrimaryPressed: "#B05730",
  navigationSelected: "rgba(201, 100, 66, 0.07)",
  navigationRipple: "rgba(201, 100, 66, 0.06)",
  accentGreen: "#9C87F5",
  accentOrange: "#B4552D",
  accentRed: "#141413",
} as const;

export const spacing = [4, 8, 12, 16, 20, 24, 32, 40, 48] as const;

export const radius = {
  small: 12,
  medium: 18,
  large: 24,
  xlarge: 28,
  sheet: 32,
  pill: 999,
} as const;

export const fontFamily = {
  regular: "GoogleSansFlex_400Regular",
  medium: "GoogleSansFlex_500Medium",
  semibold: "GoogleSansFlex_600SemiBold",
  bold: "GoogleSansFlex_700Bold",
  extraBold: "GoogleSansFlex_800ExtraBold",
} as const;

export const typography = {
  largeTitle: { fontFamily: fontFamily.extraBold, fontSize: 30, lineHeight: 36 },
  title1: { fontFamily: fontFamily.bold, fontSize: 26, lineHeight: 32 },
  title2: { fontFamily: fontFamily.bold, fontSize: 21, lineHeight: 26 },
  headline: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 21 },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 21 },
  subhead: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17 },
  footnote: { fontFamily: fontFamily.medium, fontSize: 11, lineHeight: 15 },
} as const satisfies Record<string, TextStyle>;

export const navigationMetrics = {
  barHeight: 60,
  barPadding: 4,
  horizontalInset: 12,
  iconSize: 22,
  itemHeight: 54,
  itemHorizontalPadding: 12,
  itemVerticalPadding: 6,
  itemWidth: 84,
  labelSize: 11,
} as const;

export const emptyStateMetrics = {
  actionWidth: "centered",
  contentWidth: 320,
  horizontalPadding: 20,
  iconGlyphSize: 22,
  iconSize: 48,
  verticalPadding: 16,
} as const;

export const fieldMetrics = {
  cornerRadius: 20,
} as const;

export const elevation = {
  floating: "0 8px 24px rgba(61, 57, 41, 0.14), 0 2px 6px rgba(61, 57, 41, 0.08)",
  sheet: "0 -10px 30px rgba(61, 57, 41, 0.10)",
  marker: "0 5px 10px rgba(61, 57, 41, 0.18)",
} as const;

export const motion = {
  fast: 160,
  standard: 240,
  gentle: 360,
} as const;

export const continuous: Pick<ViewStyle, "borderCurve"> = {
  borderCurve: "continuous",
};
