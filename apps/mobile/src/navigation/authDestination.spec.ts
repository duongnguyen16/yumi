import { getAuthenticatedDestination } from "./authDestination";

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
