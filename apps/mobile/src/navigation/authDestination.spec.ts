import {
  getAppealsNavigationMode,
  getAuthenticatedDestination,
  getCustomerContributionDestination,
  getVendorRegistrationDestination,
} from "./authDestination";

describe("getAuthenticatedDestination", () => {
  it("sends banned users to their appeals", () => {
    expect(getAuthenticatedDestination({ status: "BANNED" })).toBe("/appeals");
  });

  it.each([{ status: "ACTIVE" }, { status: "WARNED" }, {}, null, undefined])(
    "sends other authenticated users to home",
    (user) => {
      expect(getAuthenticatedDestination(user)).toBe("/home");
    },
  );
});

describe("getVendorRegistrationDestination", () => {
  it("opens contribution registration for a verified phone", () => {
    expect(getVendorRegistrationDestination(true)).toEqual({
      pathname: "/contribute",
      params: { type: "register" },
    });
  });

  it("opens Edit Profile and preserves the registration destination for an unverified phone", () => {
    expect(getVendorRegistrationDestination(false)).toEqual({
      pathname: "/profile/edit",
      params: { redirect: "/contribute?type=register" },
    });
  });
});

describe("getCustomerContributionDestination", () => {
  it("opens the regular contribution flow", () => {
    expect(getCustomerContributionDestination()).toEqual({
      pathname: "/contribute",
      params: { type: "add" },
    });
  });
});

describe("getAppealsNavigationMode", () => {
  it("shows logout instead of back for banned users", () => {
    expect(getAppealsNavigationMode("BANNED", false)).toBe("LOGOUT");
    expect(getAppealsNavigationMode("BANNED", true)).toBe("LOGOUT");
  });

  it("goes back when a regular user has navigation history", () => {
    expect(getAppealsNavigationMode("ACTIVE", true)).toBe("BACK");
  });

  it("returns home when a regular user has no navigation history", () => {
    expect(getAppealsNavigationMode("WARNED", false)).toBe("HOME");
  });
});
