import { getAuthenticatedDestination, getVendorRegistrationDestination } from "./authDestination";

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
    expect(getVendorRegistrationDestination(true)).toEqual({ pathname: "/contribute", params: { type: "register" } });
  });

  it("opens phone verification and preserves the registration destination", () => {
    expect(getVendorRegistrationDestination(false)).toEqual({ pathname: "/profile/verify-phone", params: { redirect: "/contribute?type=register" } });
  });
});
