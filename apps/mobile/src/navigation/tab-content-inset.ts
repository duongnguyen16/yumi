import { navigationMetrics, spacing } from "@/ui/tokens";

export function getTabBarBottomInset(safeAreaBottom: number) {
  return navigationMetrics.barHeight + Math.max(safeAreaBottom, spacing[2]);
}

export function getTabContentBottomPadding(safeAreaBottom: number) {
  return getTabBarBottomInset(safeAreaBottom) + spacing[4];
}

export function getTabSnackbarBottomOffset(safeAreaBottom: number) {
  return getTabBarBottomInset(safeAreaBottom) - safeAreaBottom;
}
