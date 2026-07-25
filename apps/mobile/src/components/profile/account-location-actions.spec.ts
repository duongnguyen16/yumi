import { getAccountLocationActions } from "./account-location-actions";

describe("getAccountLocationActions", () => {
  it("lets a customer register an owned location and contribute a community location", () => {
    expect(getAccountLocationActions("CUSTOMER")).toEqual([
      "register",
      "contribute",
    ]);
  });

  it("keeps management and both creation choices for a vendor", () => {
    expect(getAccountLocationActions("VENDOR")).toEqual([
      "manage",
      "register",
      "contribute",
    ]);
  });

  it.each([undefined, null, "CUSTOMER"])(
    "does not hide registration while the role is %s",
    (role) => {
      expect(getAccountLocationActions(role)).toContain("register");
    },
  );
});
