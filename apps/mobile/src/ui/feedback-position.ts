import { spacing } from "./tokens";

export function getNoticeSnackbarTopOffset(safeAreaTop: number) {
  return safeAreaTop + spacing[3];
}
