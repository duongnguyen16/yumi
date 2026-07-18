import { colors } from "@/ui/tokens";

export const EXPLORE_NEARBY_ZOOM = 16;
export const EXPLORE_CATEGORY_BAR_HEIGHT = 40;

export type SearchRating = {
  avgRating: number;
  reviewCount: number;
};

export function getDistanceTone(distanceMeters: number) {
  return distanceMeters <= 2000 ? colors.accentGreen : colors.accentYellow;
}

export function getSearchRating(
  rating?: Partial<SearchRating> | number | null,
): SearchRating {
  const avgRating =
    typeof rating === "number" ? rating : Number(rating?.avgRating ?? 0);
  const reviewCount =
    typeof rating === "number" ? 0 : Number(rating?.reviewCount ?? 0);

  return {
    avgRating: Number.isFinite(avgRating) ? Math.round(avgRating * 10) / 10 : 0,
    reviewCount: Number.isFinite(reviewCount) ? reviewCount : 0,
  };
}
