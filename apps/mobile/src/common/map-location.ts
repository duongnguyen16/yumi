export type MapCoordinates = [number, number];

export type MapLocationPreview = {
  id: string;
  name: string;
  address?: string;
  coordinates: MapCoordinates;
  rating?: number;
};

export type DrawerDetent = "half" | "full";
export type LocationPublicDetails = {
  address?: string;
  category?: string;
  description?: string;
  openingHours?: string;
  phone?: string;
  tags: string[];
};

export const mapSelectionZoom = 13;
export const locationSheetActionHeight = 60;
export const locationSheetSections = [
  "details",
  "products",
  "reviews",
] as const;
export const locationProductsExpandedByDefault = true;
export const locationReviewCardHeight = 216;
export const locationReviewCommentLines = 3;

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue | null {
  return typeof value === "object" && value !== null
    ? (value as RecordValue)
    : null;
}

function coordinates(value: unknown): MapCoordinates | null {
  if (
    !Array.isArray(value) ||
    value.length < 2 ||
    typeof value[0] !== "number" ||
    typeof value[1] !== "number"
  )
    return null;
  return Number.isFinite(value[0]) && Number.isFinite(value[1])
    ? [value[0], value[1]]
    : null;
}

export function getMapLocationPreview(
  value: unknown,
): MapLocationPreview | null {
  const source = record(value);
  if (!source) return null;
  const properties = record(source.properties) ?? source;
  const geometry = record(source.geometry);
  const geo = record(properties.geo);
  const coordinateValue =
    coordinates(geometry?.coordinates) ??
    coordinates(geo?.coordinates) ??
    coordinates(properties.coordinates);
  const rawId = properties.id ?? properties._id ?? source.id;
  const name = properties.name;

  if (
    !coordinateValue ||
    (typeof rawId !== "string" && typeof rawId !== "number") ||
    typeof name !== "string"
  )
    return null;

  const ratingValue = properties.rating;
  const rating =
    typeof ratingValue === "number"
      ? ratingValue
      : record(ratingValue)?.avgRating;

  return {
    ...(typeof properties.address === "string"
      ? { address: properties.address }
      : {}),
    coordinates: coordinateValue,
    id: String(rawId),
    name,
    ...(typeof rating === "number" ? { rating } : {}),
  };
}

export function getLocationPublicDetails(
  value: unknown,
): LocationPublicDetails {
  const source = record(value) ?? {};
  const category = record(source.categoryId)?.name;
  const tags = Array.isArray(source.subCategoryIds)
    ? source.subCategoryIds
        .map((item) => record(item)?.name)
        .filter(
          (name): name is string =>
            typeof name === "string" && Boolean(name.trim()),
        )
    : [];
  return {
    ...(typeof source.address === "string" && source.address.trim()
      ? { address: source.address }
      : {}),
    ...(typeof category === "string" && category.trim() ? { category } : {}),
    ...(typeof source.description === "string" && source.description.trim()
      ? { description: source.description }
      : {}),
    ...(typeof source.openingHours === "string" && source.openingHours.trim()
      ? { openingHours: source.openingHours }
      : {}),
    ...(typeof source.phone === "string" && source.phone.trim()
      ? { phone: source.phone }
      : {}),
    tags,
  };
}

export function buildDirectionsUrl(
  {
    coordinates: [longitude, latitude],
    name,
  }: Pick<MapLocationPreview, "coordinates" | "name">,
  platform = process.env.EXPO_OS ?? "web",
) {
  const destination = `${latitude},${longitude}`;
  const label = encodeURIComponent(name);

  if (platform === "ios")
    return `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d&q=${label}`;
  if (platform === "android")
    return `geo:${destination}?q=${destination}(${label})`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

export function getDrawerDetentHeight(
  detent: DrawerDetent,
  windowHeight: number,
  topInset: number,
) {
  if (detent === "half") return Math.round(windowHeight * 0.5);
  return Math.max(216, windowHeight - topInset);
}

export function formatRecentReviewsTitle(count: number) {
  return `${Math.max(0, count)} đánh giá gần đây`;
}

export function resolveDrawerDetent(
  current: DrawerDetent,
  translationY: number,
  velocityY: number,
): DrawerDetent {
  "worklet";
  if (velocityY <= -600 || translationY <= -56) return "full";
  if (velocityY >= 600 || translationY >= 56) return "half";
  return current;
}
