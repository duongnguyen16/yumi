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
      notificationType: "CLAIM_REJECTED",
      refCollection: "claim_requests",
      refId: "claim-1",
      appealType: "CLAIM_REJECTED",
    },
    {
      notificationType: "LOCATION_DUPLICATE_HIDDEN",
      refCollection: "locations",
      refId: "location-1",
      appealType: "DUPLICATE_HIDDEN",
    },
    {
      notificationType: "REVIEW_REMOVED",
      refCollection: "reviews",
      refId: "review-1",
      appealType: "REVIEW_REMOVED",
    },
    {
      notificationType: "ACCOUNT_WARNED",
      refCollection: "users",
      refId: "user-1",
      appealType: "USER_WARNED",
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
