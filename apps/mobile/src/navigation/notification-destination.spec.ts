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

  it.each([
    {
      notificationType: "LOCATION_REJECTED",
      refCollection: "location_requests",
      refId: "location-request-1",
      appealType: "LOCATION_REJECTED",
    },
    {
      notificationType: "ACCOUNT_BANNED",
      refCollection: "users",
      refId: "user-1",
      appealType: "USER_BANNED",
    },
  ])(
    "opens $notificationType in the matching appeal form",
    ({ notificationType, refCollection, refId, appealType }) => {
      const destination = getNotificationDestination({
        type: notificationType,
        refCollection,
        refId,
      });

      expect(destination).toBe(
        `/appeals/new?type=${appealType}&targetId=${refId}`,
      );
    },
  );

  it.each([
    ["CLAIM_REJECTED", "claim_requests", "claim-1", null],
    ["LOCATION_DUPLICATE_HIDDEN", "locations", "location-1", "/location/location-1"],
    ["REVIEW_REMOVED", "reviews", "review-1", null],
    ["ACCOUNT_WARNED", "users", "user-1", null],
  ])("does not open an appeal for obsolete type %s", (type, refCollection, refId, expected) => {
    const destination = getNotificationDestination({
      type,
      refCollection,
      refId,
    });

    expect(destination).toBe(expected);
  });

  it("does not invent destinations for unsupported or incomplete references", () => {
    expect(
      getNotificationDestination({
        refCollection: "edit_suggestions",
        refId: "edit-1",
      }),
    ).toBeNull();
    expect(
      getNotificationDestination({ refCollection: "disputes" }),
    ).toBeNull();
  });

  it("does not open an appeal when the reference collection is incorrect", () => {
    const destination = getNotificationDestination({
      type: "REVIEW_REMOVED",
      refCollection: "locations",
      refId: "review-1",
    });

    expect(destination).toBe("/location/review-1");
  });
});
