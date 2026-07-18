import { colors } from "@/ui/tokens";
import {
  EXPLORE_CATEGORY_BAR_HEIGHT,
  EXPLORE_NEARBY_ZOOM,
  getDistanceTone,
  getSearchRating,
} from "./explore-presentation";

describe("Explore presentation", () => {
  it("uses a neighborhood-scale map zoom", () => {
    expect(EXPLORE_NEARBY_ZOOM).toBe(16);
  });

  it("reserves an explicit height for the absolute category bar", () => {
    expect(EXPLORE_CATEGORY_BAR_HEIGHT).toBe(40);
  });

  it("keeps distances through two kilometers green", () => {
    expect(getDistanceTone(0)).toBe(colors.accentGreen);
    expect(getDistanceTone(2000)).toBe(colors.accentGreen);
  });

  it("colors distances above two kilometers yellow", () => {
    expect(getDistanceTone(2000.01)).toBe(colors.accentYellow);
  });

  it("normalizes search ratings and falls back to an unrated result", () => {
    expect(getSearchRating({ avgRating: 4.26, reviewCount: 12 })).toEqual({
      avgRating: 4.3,
      reviewCount: 12,
    });
    expect(getSearchRating(undefined)).toEqual({
      avgRating: 0,
      reviewCount: 0,
    });
  });
});
