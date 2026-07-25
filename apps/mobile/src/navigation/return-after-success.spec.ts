import {
  returnAfterSuccess,
  returnContributionToHome,
} from "./return-after-success";

describe("returnAfterSuccess", () => {
  it("returns to the previous screen after a successful submission", () => {
    const router = { back: jest.fn() };

    returnAfterSuccess(router);

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it("returns a completed contribution to the Home tab", () => {
    const router = { replace: jest.fn() };

    returnContributionToHome(router);

    expect(router.replace).toHaveBeenCalledWith("/(tabs)/home");
  });
});
