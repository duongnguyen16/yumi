import {
  getLocationReportAction,
  getLocationReportReasons,
  validateLocationReport,
} from "./location-report";

describe("getLocationReportAction", () => {
  it("hides reporting for the location owner", () => {
    expect(
      getLocationReportAction({
        locationId: "location-1",
        ownerId: "owner-1",
        userId: "owner-1",
      }),
    ).toBe("hidden");
  });

  it("requires sign-in for a guest and opens the composer for another user", () => {
    expect(
      getLocationReportAction({
        locationId: "location-1",
        ownerId: "owner-1",
        userId: "",
      }),
    ).toBe("authenticate");
    expect(
      getLocationReportAction({
        locationId: "location-1",
        ownerId: "owner-1",
        userId: "user-2",
      }),
    ).toBe("compose");
  });

  it("does not expose a report action without a location id", () => {
    expect(
      getLocationReportAction({
        locationId: "",
        ownerId: "owner-1",
        userId: "user-2",
      }),
    ).toBe("hidden");
  });
});

describe("location report validation", () => {
  it("omits wrong-owner when the location has no owner", () => {
    expect(
      getLocationReportReasons(false).map((reason) => reason.value),
    ).not.toContain("WRONG_OWNER");
  });

  it("requires a valid description and wrong-owner evidence", () => {
    expect(
      validateLocationReport({
        reason: "SPAM",
        description: "ngắn",
        evidenceCount: 0,
      }),
    ).toBe("Mô tả báo cáo cần từ 10 đến 1000 ký tự.");
    expect(
      validateLocationReport({
        reason: "WRONG_OWNER",
        description: "Chủ sở hữu hiện tại không đúng.",
        evidenceCount: 0,
      }),
    ).toBe("Báo cáo chủ sở hữu sai cần ít nhất 1 ảnh bằng chứng.");
    expect(
      validateLocationReport({
        reason: "WRONG_OWNER",
        description: "Chủ sở hữu hiện tại không đúng.",
        evidenceCount: 1,
      }),
    ).toBeNull();
  });
});
