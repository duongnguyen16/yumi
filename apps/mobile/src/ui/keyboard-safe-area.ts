export function getKeyboardSafeAreaBehavior(
  platform = "android",
): "padding" | "height" {
  return platform === "ios" ? "padding" : "height";
}
