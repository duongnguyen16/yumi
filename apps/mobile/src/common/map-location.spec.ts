import { buildDirectionsUrl, formatRecentReviewsTitle, getDrawerDetentHeight, getLocationPublicDetails, getMapLocationPreview, locationProductsExpandedByDefault, locationReviewCardHeight, locationReviewCommentLines, locationSheetActionHeight, locationSheetSections, mapSelectionZoom, resolveDrawerDetent } from "./map-location";

describe("map location helpers", () => {
  it("normalizes a MapLibre feature into a location preview", () => {
    expect(getMapLocationPreview({ geometry: { coordinates: [106.7009, 10.7769] }, properties: { address: "Quận 1", id: "location-1", name: "Yumi Café", rating: 4.7 } })).toEqual({
      address: "Quận 1",
      coordinates: [106.7009, 10.7769],
      id: "location-1",
      name: "Yumi Café",
      rating: 4.7,
    });
  });

  it("normalizes a search result with GeoJSON coordinates", () => {
    expect(getMapLocationPreview({ _id: "location-2", address: "Tây Hồ", geo: { coordinates: [105.82, 21.06] }, name: "Yumi Hồ Tây" })).toMatchObject({
      coordinates: [105.82, 21.06],
      id: "location-2",
      name: "Yumi Hồ Tây",
    });
  });

  it("builds native directions destinations", () => {
    const target = { coordinates: [106.7009, 10.7769] as [number, number], name: "Yumi Café" };

    expect(buildDirectionsUrl(target, "ios")).toBe("https://maps.apple.com/?daddr=10.7769%2C106.7009&dirflg=d&q=Yumi%20Caf%C3%A9");
    expect(buildDirectionsUrl(target, "android")).toBe("geo:10.7769,106.7009?q=10.7769,106.7009(Yumi%20Caf%C3%A9)");
  });

  it("uses half and full attached sheet heights", () => {
    expect(getDrawerDetentHeight("half", 800, 44)).toBe(400);
    expect(getDrawerDetentHeight("full", 800, 44)).toBe(756);
  });

  it("keeps enough map context around a selected place", () => {
    expect(mapSelectionZoom).toBe(13);
  });

  it("uses one continuous detail flow with a stable action strip", () => {
    expect(locationSheetSections).toEqual(["details", "products", "reviews"]);
    expect(locationSheetActionHeight).toBe(60);
  });

  it("snaps drawer drags to half or full height", () => {
    expect(resolveDrawerDetent("half", -72, 0)).toBe("full");
    expect(resolveDrawerDetent("full", 72, 0)).toBe("half");
    expect(resolveDrawerDetent("half", -8, -700)).toBe("full");
    expect(resolveDrawerDetent("full", 8, 700)).toBe("half");
    expect(resolveDrawerDetent("half", -20, 0)).toBe("half");
  });

  it("projects only public location details supported by the API", () => {
    expect(getLocationPublicDetails({ address: "Thạch Hòa", categoryId: { name: "Thư viện" }, description: "Không gian đọc sách", openingHours: "08:00-17:30", phone: "0901234567", status: "PUBLISHED", subCategoryIds: [{ name: "Học tập" }, { name: "Làm việc" }], viewCount: 42 })).toEqual({
      address: "Thạch Hòa",
      category: "Thư viện",
      description: "Không gian đọc sách",
      openingHours: "08:00-17:30",
      phone: "0901234567",
      tags: ["Học tập", "Làm việc"],
    });
  });

  it("keeps products open and review previews compact by default", () => {
    expect(locationProductsExpandedByDefault).toBe(true);
    expect(locationReviewCardHeight).toBe(168);
    expect(locationReviewCommentLines).toBe(3);
  });

  it("formats the recent review section header", () => {
    expect(formatRecentReviewsTitle(0)).toBe("0 đánh giá gần đây");
    expect(formatRecentReviewsTitle(12)).toBe("12 đánh giá gần đây");
  });
});
