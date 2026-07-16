export const SEARCH_DEBOUNCE_MS = 1000;

export function canSearchLocations(keyword: string, categoryId: string | null) {
  return Boolean(keyword.trim() || categoryId);
}
