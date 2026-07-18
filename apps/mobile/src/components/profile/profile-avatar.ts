export function resolveProfileAvatar(
  profileAvatarUrl: string | null | undefined,
  sessionAvatarUrl: string | null | undefined,
  displayName: string,
) {
  return {
    avatarUrl: profileAvatarUrl || sessionAvatarUrl || null,
    avatarInitial: displayName.trim().charAt(0).toUpperCase() || "U",
  };
}
