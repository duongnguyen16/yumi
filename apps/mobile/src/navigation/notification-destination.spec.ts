import { getNotificationDestination } from "./notification-destination";

describe("notification destination", () => {
  it.each([
    ["request_accesses", "ra-1", "/request-access/ra-1"],
    ["appeals", "ap-1", "/appeals/ap-1"],
    ["disputes", "dp-1", "/disputes/dp-1"],
    ["locations", "lo-1", "/location/lo-1"],
  ])("maps %s references", (refCollection, refId, expected) => {
    expect(getNotificationDestination({ refCollection, refId })).toBe(expected);
  });

  it("does not invent destinations for unsupported or incomplete references", () => {
    expect(getNotificationDestination({ refCollection: "reviews", refId: "review-1" })).toBeNull();
    expect(getNotificationDestination({ refCollection: "disputes" })).toBeNull();
  });
});
