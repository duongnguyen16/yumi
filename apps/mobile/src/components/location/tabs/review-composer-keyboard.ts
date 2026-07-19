export function getReviewComposerKeyboardBehavior(
  platform = "android",
): "padding" | "height" {
  return platform === "ios" ? "padding" : "height";
}
