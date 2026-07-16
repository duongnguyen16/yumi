import { navigationMetrics, spacing } from "@/ui/tokens";

export function getTabContentBottomPadding(safeAreaBottom: number) {
  return navigationMetrics.barHeight + Math.max(safeAreaBottom, spacing[2]) + spacing[4];
}
