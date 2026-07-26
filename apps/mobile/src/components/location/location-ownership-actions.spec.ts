import { canClaimLocation } from "./location-ownership-actions";

describe("location ownership actions", () => {
  it.each([
    ["CUSTOMER", "", true],
    ["VENDOR", "", true],
    [undefined, "", false],
    ["ADMIN", "", false],
    ["CUSTOMER", "owner-1", false],
    ["VENDOR", "owner-1", false],
  ])("allows role %s with owner %s: %s", (role, ownerId, expected) => {
    expect(canClaimLocation(role, ownerId)).toBe(expected);
  });
});
