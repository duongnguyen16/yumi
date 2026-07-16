import { clearExploreLocationAction, invokeExploreLocationAction, setExploreLocationAction } from "./exploreTabAction";

describe("explore tab location action", () => {
  afterEach(() => clearExploreLocationAction());

  it("invokes the registered map location action", () => {
    const onLocate = jest.fn();

    setExploreLocationAction(onLocate);
    invokeExploreLocationAction();

    expect(onLocate).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the Explore map is not registered", () => {
    expect(() => invokeExploreLocationAction()).not.toThrow();
  });
});
