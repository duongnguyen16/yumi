import { getAccountLocationActions } from "./account-location-actions";

describe("getAccountLocationActions", () => {
  it("gives a Customer the shared ownership workflows without Vendor management", () => {
    expect(getAccountLocationActions("CUSTOMER")).toEqual([
      "register",
      "contribute",
      "requestAccess",
      "disputes",
    ]);
  });

  it("keeps Vendor management and the shared ownership workflows", () => {
    expect(getAccountLocationActions("VENDOR")).toEqual([
      "manage",
      "register",
      "contribute",
      "requestAccess",
      "disputes",
    ]);
  });

  it.each([undefined, null, "CUSTOMER"])(
    "does not hide registration while the role is %s",
    (role) => {
      expect(getAccountLocationActions(role)).toContain("register");
    },
  );
});
