import { SEARCH_DEBOUNCE_MS, canSearchLocations } from "./search-model";

describe("location search model", () => {
  it("waits one second before searching text", () => {
    expect(SEARCH_DEBOUNCE_MS).toBe(1000);
  });

  it("searches with either text or a category", () => {
    expect(canSearchLocations("cafe", null)).toBe(true);
    expect(canSearchLocations("", "category-1")).toBe(true);
    expect(canSearchLocations("   ", null)).toBe(false);
  });
});
