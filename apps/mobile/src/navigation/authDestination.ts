type UserWithStatus =
  | {
      status?: unknown;
    }
  | null
  | undefined;

export function getAuthenticatedDestination(user: UserWithStatus) {
  return user?.status === "BANNED" ? "/appeals" : "/home";
}
