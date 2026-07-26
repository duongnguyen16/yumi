export function getRequestAccessKeyboardBehavior(
  platform = "android",
): "padding" | "height" {
  return platform === "ios" ? "padding" : "height";
}
