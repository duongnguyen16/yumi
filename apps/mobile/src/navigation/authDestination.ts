type UserWithStatus =
  | {
      status?: unknown;
    }
  | null
  | undefined;

export function getAuthenticatedDestination(user: UserWithStatus) {
  return user?.status === "BANNED" ? "/appeals" : "/home";
}

export type AppealsNavigationMode = "BACK" | "HOME" | "LOGOUT";

export function getAppealsNavigationMode(
  status: unknown,
  canGoBack: boolean,
): AppealsNavigationMode {
  if (status === "BANNED") return "LOGOUT";
  if (canGoBack) return "BACK";
  return "HOME";
}

export function getVendorRegistrationDestination(phoneVerified: boolean) {
  return phoneVerified
    ? { pathname: "/contribute" as const, params: { type: "register" } }
    : {
        pathname: "/profile/edit" as const,
        params: { redirect: "/contribute?type=register" },
      };
}

export function getCustomerContributionDestination() {
  return { pathname: "/contribute" as const, params: { type: "add" } };
}
