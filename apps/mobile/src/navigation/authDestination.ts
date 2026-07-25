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

const ownershipRegistrationDestination = {
  pathname: "/contribute" as const,
  params: { type: "register" as const },
};

export type OwnershipRegistrationAction =
  | {
      type: "NAVIGATE";
      destination: typeof ownershipRegistrationDestination;
    }
  | {
      type: "VERIFY_PHONE";
    };

export function getOwnershipRegistrationAction(
  phoneVerified: boolean,
): OwnershipRegistrationAction {
  return phoneVerified
    ? {
        type: "NAVIGATE",
        destination: ownershipRegistrationDestination,
      }
    : { type: "VERIFY_PHONE" };
}

export function getOwnershipVerificationDestination() {
  return {
    pathname: "/profile/edit" as const,
    params: { redirect: "/contribute?type=register" as const },
  };
}

export function getCustomerContributionDestination() {
  return { pathname: "/contribute" as const, params: { type: "add" } };
}
