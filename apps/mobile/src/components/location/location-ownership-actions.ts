export function canClaimLocation(role: unknown, ownerId: string) {
  return (role === "CUSTOMER" || role === "VENDOR") && !ownerId;
}
