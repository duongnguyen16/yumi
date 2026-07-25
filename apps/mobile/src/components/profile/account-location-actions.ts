export type AccountLocationAction = "manage" | "register" | "contribute";

const SHARED_LOCATION_ACTIONS: AccountLocationAction[] = [
  "register",
  "contribute",
];

export function getAccountLocationActions(
  role?: string | null,
): AccountLocationAction[] {
  return role === "VENDOR"
    ? ["manage", ...SHARED_LOCATION_ACTIONS]
    : [...SHARED_LOCATION_ACTIONS];
}
