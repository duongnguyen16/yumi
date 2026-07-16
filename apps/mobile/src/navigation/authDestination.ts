type UserWithStatus =
  | {
      status?: unknown;
    }
  | null
  | undefined;

export function getAuthenticatedDestination(user: UserWithStatus) {
  return user?.status === "BANNED" ? "/appeals" : "/home";
}

export function getVendorRegistrationDestination(phoneVerified: boolean) {
  return phoneVerified
    ? { pathname: "/contribute" as const, params: { type: "register" } }
    : { pathname: "/profile/edit" as const, params: { redirect: "/contribute?type=register" } };
}
