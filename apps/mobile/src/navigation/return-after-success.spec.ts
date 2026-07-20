import { returnAfterSuccess } from "./return-after-success";

describe("returnAfterSuccess", () => {
  it("returns to the previous screen after a successful submission", () => {
    const router = { back: jest.fn() };

    returnAfterSuccess(router);

    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
